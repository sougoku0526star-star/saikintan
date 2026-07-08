import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  findFood,
  buildMeal,
  buildMealFromEstimate,
  buildMealFromItems,
  resolveMealItem,
  foodTaxonomy,
  type RawVisionItem,
  type UserFoodLite,
} from "@/lib/nutrition";
import { foods } from "@/lib/nutrition-data";
import { restaurantReference } from "@/lib/restaurant-data";
import { getUserId, getAuthUser } from "@/lib/server/user";
import { listFoods } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings-db";
import { currencyToRegion, regionLabel, type RegionCode } from "@/lib/region";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import {
  gohankunSystemPrompt,
  gohankunYou,
  violatesGohankunRules,
} from "@/lib/server/gohankun-persona";

// コメントが禁止事項に触れたときの安全な差し替え文（数値・体重言及なし）。
const SAFE_CAPTION = "今日のごはん、ちゃんと記録できたね。ゆっくり味わえたかな？";

// 場所名 → 座標（Mapbox Geocoding、シンガポール近傍を優先）
async function geocode(
  location: string
): Promise<{ lat: number; lng: number } | undefined> {
  const q = (location || "").trim();
  if (!q || q.toLowerCase() === "singapore") return undefined;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      q.replace(/·/g, " ")
    )}.json?access_token=${MAPBOX_TOKEN}&limit=1&proximity=103.8198,1.3521&country=SG`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const c = data?.features?.[0]?.center;
    if (Array.isArray(c) && c.length === 2) return { lng: c[0], lat: c[1] };
  } catch {
    /* 失敗時は座標なし */
  }
  return undefined;
}

// 写真1枚 → AIが料理を判定 → 栄養素マスターを参照 → カロリー/栄養を計算。
// POST body:
//   { imageBase64, mimeType, photo }  … 実写真の解析（Claude Vision）
//   { slug | foodId, photo, portions } … サンプル/デモ用（解析をスキップして計算のみ）
export const runtime = "nodejs";

interface AnalyzeBody {
  imageBase64?: string;
  mimeType?: string;
  photo?: string; // 表示用URL（クライアントのobjectURL or サンプルURL）
  slug?: string;
  foodId?: number;
  portions?: number;
  exifCoords?: { lat: number; lng: number }; // 写真EXIFのGPS（あれば優先）
  dish_name_hints?: string[]; // ユーザーの料理名申告（任意・最大8品）。あれば同定はこれが正
  dish_name_hint?: string; // 旧: 単一申告（後方互換。dish_name_hints があればそちらを優先）
}

// 写真解析（ビジョン）用モデル。既定はコスト最適化のためSonnet。
// 料理判定の精度がSonnetで落ちる場合は ANALYZE_MODEL=claude-opus-4-8 で上書きできる。
const MODEL = process.env.ANALYZE_MODEL || "claude-sonnet-5";

type SupportedMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
function toMedia(mime?: string): SupportedMedia {
  switch (mime) {
    case "image/png":
    case "image/gif":
    case "image/webp":
      return mime;
    default:
      return "image/jpeg";
  }
}

export async function POST(req: Request) {
  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // --- 1) サンプル/デモ：解析をスキップして計算だけ行う ----------------
  if (body.slug || body.foodId) {
    const food = findFood(body.foodId ?? body.slug!);
    if (!food) return NextResponse.json({ error: "food not found" }, { status: 404 });
    const region = currencyToRegion(getSettings(getUserId()).mainCurrency);
    const meal = buildMeal(food, {
      photo: body.photo || "",
      portions: body.portions ?? 1,
      region,
    });
    return NextResponse.json({ meal, source: "lookup" });
  }

  // --- 2) 解析：写真＋料理名(hint)のハイブリッド。呼び出しは常に1回だけ。 ----
  // 写真あり／hintのみ（写真なし）／写真のみ、いずれも同じAPIで処理する。
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // 申告名（複数可・最大8）。旧 dish_name_hint（単一）も受け付ける。
  const hints = (
    Array.isArray(body.dish_name_hints)
      ? body.dish_name_hints
      : body.dish_name_hint
        ? [body.dish_name_hint]
        : []
  )
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if ((body.imageBase64 || hints.length) && apiKey) {
    try {
      // ユーザー辞書はサーバー（DB）から取得（クライアント送信値は使わない）
      const uid = getUserId();
      const userFoods: UserFoodLite[] = listFoods(uid);
      const me = getAuthUser();
      const userName = me?.nickname ?? me?.username ?? null;
      // ユーザーの地域（メイン通貨から推定）。チェーン料理の地域補正に使う。
      const userRegion = currencyToRegion(getSettings(uid).mainCurrency);
      const analysis = await analyzeWithClaude(
        body.imageBase64 ?? null,
        toMedia(body.mimeType),
        userFoods,
        userName,
        userRegion,
        hints
      );

      // 出力側の機械チェック：コメントに禁止ワード/栄養の生数値があれば安全な定型に差し替え
      if (violatesGohankunRules(analysis.caption)) {
        analysis.caption = SAFE_CAPTION;
      }

      // 位置：写真EXIFのGPSがあれば優先、無ければ場所名をジオコーディング
      const coords =
        (typeof body.exifCoords?.lat === "number" ? body.exifCoords : undefined) ??
        (await geocode(analysis.location));

      // 各品目を解決（辞書ヒット→DB値×分量 / none→AI推定）して合算する。
      const lowConf = analysis.confidence < 0.5;
      const usableItems = analysis.items.filter(
        (it) => it.dishNameJa || it.dishNameEn || it.slug !== "none"
      );

      // 料理が1つも取れない＝写真に食べ物が無い等。従来どおり「不明な料理」1品として扱う。
      if (usableItems.length === 0) {
        const meal = buildMealFromEstimate({
          name: "Unknown dish",
          nameJa: "不明な料理",
          calories: 0,
          protein: 0,
          fat: 0,
          carb: 0,
          sodium: 0,
          photo: body.photo || "",
          caption: analysis.caption,
          location: analysis.location,
          coords,
        });
        return NextResponse.json({
          meal,
          source: "vision_estimate",
          confidence: analysis.confidence,
        });
      }

      const items = usableItems.map((it) =>
        resolveMealItem(it, userFoods, userRegion, analysis.chain, lowConf)
      );
      const meal = buildMealFromItems(items, {
        photo: body.photo || "",
        caption: analysis.caption,
        location: analysis.location,
        coords,
        region: userRegion,
      });
      // 単品なら従来UI互換のためトップレベル source にも品目の出典を反映
      if (items.length === 1 && items[0].source) meal.source = items[0].source;

      const anyEstimated = items.some((it) => it.nutrition.estimated);
      const source = analysis.chain
        ? "vision_regional"
        : anyEstimated
          ? "vision_estimate"
          : "vision";
      return NextResponse.json({ meal, source, confidence: analysis.confidence });
    } catch (e) {
      // Sonnet 5移行の切り分け用：エラーの status / message を必ず出す
      const err = e as { name?: string; status?: number; message?: string };
      console.error("vision analyze failed:", {
        name: err?.name,
        status: err?.status,
        message: err?.message,
      });
      // 失敗時はモックにフォールバック（下へ）
    }
  }

  // --- 3) フォールバック（APIキー未設定 or 解析失敗）：擬似結果を返す ---
  const food = foods[Math.floor(Math.random() * foods.length)];
  const meal = buildMeal(food, {
    photo: body.photo || "",
    portions: 1,
    caption: `（デモ）${food.nameJa} と判定しました。ANTHROPIC_API_KEY を設定すると実際の画像解析が有効になります。`,
  });
  return NextResponse.json({ meal, source: "mock" });
}

// --- Claude Vision 呼び出し（公式SDK + 構造化出力） -----------------------

interface VisionResult {
  items: RawVisionItem[]; // 写っている品目（定食なら主菜・ご飯・味噌汁・小鉢…）最大8
  caption: string;
  location: string;
  confidence: number;
  chain: string; // 地域補正したチェーン名（例: マクドナルド）。無ければ ""
}

// 1品目のスキーマ。slug が "none" のときは dish_name_* と栄養推定値を使う。
const ITEM_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string", description: "料理リストのslug。該当が無ければ 'none'" },
    dish_name_en: { type: "string", description: "品目名（英語）。空文字禁止" },
    dish_name_ja: { type: "string", description: "品目名（日本語）。空文字禁止" },
    portions: { type: "number", description: "標準1人前を1.0とした分量倍率（辞書ヒット時のスケール用）" },
    calories: { type: "number", description: "この品目の推定カロリー(kcal)" },
    protein: { type: "number", description: "この品目の推定タンパク質(g)" },
    fat: { type: "number", description: "この品目の推定脂質(g)" },
    carb: { type: "number", description: "この品目の推定炭水化物(g)" },
    sodium: { type: "number", description: "この品目の推定塩分(mg)" },
  },
  required: [
    "slug",
    "dish_name_en",
    "dish_name_ja",
    "portions",
    "calories",
    "protein",
    "fat",
    "carb",
    "sodium",
  ],
  additionalProperties: false,
} as const;

// 構造化出力で、必ずこの形のJSONが返る。caption/location/confidence/chain は食事全体で1つ。
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      // ※ json_schema構造化出力は array の minItems/maxItems 非対応。上限8はコード側で slice。
      items: ITEM_SCHEMA,
      description: "写真に写っている料理・小鉢・汁物・主食を全て個別に列挙（最大8品）",
    },
    caption: {
      type: "string",
      description:
        "キャラクター「ごはんくん」がユーザーに語りかける日記風コメント（日本語・2〜3文・60〜120字）。料理名や場所に触れ、やさしくゆるい口調で、海外でがんばるユーザーを応援する一言。食事全体で1つ。",
    },
    location: { type: "string", description: "推測できる場所。不明なら 'Singapore'" },
    confidence: { type: "number", description: "料理判定の自信度 0.0〜1.0（食事全体で1つ）" },
    chain: {
      type: "string",
      description:
        "チェーン参照リストの料理を地域補正して栄養を出した場合のチェーン名（例: マクドナルド）。それ以外は空文字 ''。",
    },
  },
  required: ["items", "caption", "location", "confidence", "chain"],
  additionalProperties: false,
} as const;

async function analyzeWithClaude(
  imageBase64: string | null,
  mediaType: SupportedMedia,
  userFoods: UserFoodLite[] = [],
  userName: string | null = null,
  userRegion: RegionCode = "SG",
  hints: string[] = []
): Promise<VisionResult> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から自動取得
  const you = gohankunYou(userName);
  const hasImage = !!imageBase64;

  const standardList = foodTaxonomy()
    .map((t) => `${t.slug}\t${t.name}`)
    .join("\n");
  // ユーザーが昇格させた辞書は別枠で最優先に照合させる（埋もれ防止）
  const userList = userFoods
    .map((f) => `${f.slug}\t${f.name}（${f.nameJa}）`)
    .join("\n");
  const userSection = userList
    ? `\n\n# あなたの辞書（最優先で照合。一致すればこのslugを返す）\n${userList}`
    : "";

  const regionJa = regionLabel(userRegion);
  const isJapan = userRegion === "JP";
  const chainRule = isJapan
    ? `ユーザーの地域は日本です。写真がチェーン参照リストの料理なら、その slug を返してください（日本公式値をそのまま使います）。`
    : `ユーザーの地域は「${regionJa}」です。写真がチェーン参照リストの料理（＝日本の公式値）なら、
その日本公式値を土台に「${regionJa}」で実際に提供されている同一メニューの栄養へ調整して、
slug は "none"、dish_name_* に料理名、calories/protein/fat/carb/sodium に${regionJa}向けの推定値、
chain にチェーン名（例: マクドナルド）を入れて返してください。地域差が不明なら日本公式値に近い値で構いません。`;

  // ユーザーの申告（hints）があれば、料理の同定は申告を正とする（写真は量・シーン担当）。
  const hintList = hints.map((h) => `「${h}」`).join("、");
  const hintSection = hints.length
    ? `

# ユーザーの申告（最優先）
ユーザーはこの食事の品目として次を申告しています: ${hintList}
以下のルールに従うこと:
- 各申告品目を items に1つずつ対応させ、料理の同定は申告を正とする（写真と矛盾しても申告を優先）
- 各品目は辞書にあればそのslug、なければ slug: "none" で栄養推定値を返す。写真は量(portions)・盛り付けの把握に使う
- 申告が1つだけで定食・セット名（例: 焼き魚定食）の場合は、写真を参照して構成品目（主菜・ご飯・汁物・小鉢等）に分解してよい
- 申告に無い品目が写真に明確に写っていれば足してよいが、申告された品目は必ず全て含める
- 申告と写真が明らかに別物の品目（例: 申告「ラーメン」で写真がケーキ）でも申告を優先しつつ、confidenceを0.3以下にする`
    : "";

  const opener = hasImage
    ? "次の食事写真を分析してください。"
    : "写真はありません。ユーザーの料理名の申告だけから推定してください。";
  const enumRule = hasImage
    ? `写真に写っている料理・小鉢・汁物・主食を「全て個別に」 items 配列に列挙してください。
定食は主菜・ご飯・味噌汁・小鉢…のように1品ずつ分解します（主菜を先頭に）。
調味料（わさび・大根おろし・醤油・レモン等）は栄養が僅少なので除外して構いません。`
    : `料理名から標準的な一食分の構成と栄養を推定してください。
定食・セット名なら構成品目（主菜・ご飯・汁物・小鉢等）に分解して items に個別列挙、単品ならその1品だけを items に入れます（主菜を先頭に）。`;
  const captionRule = hasImage
    ? `キャラクター「ごはんくん」として${you}に語りかける日記風コメント（system の人格・口調に従う）。`
    : `キャラクター「ごはんくん」として${you}に語りかける日記風コメント。写真が無くても「写真がなくても、◯◯食べたんだね！」のような温かいトーンでよい。`;
  const noFoodRule = hasImage
    ? `\n写真に食べ物がまったく写っていない場合に限り、items を1要素にして dish_name を空文字・栄養0・confidence 0 にしてください。`
    : "";

  const prompt = `${opener}料理の判定と栄養の数値は、空想ではなく
現実的で正確に見積もること（ここはプロの栄養士として厳密に）。

# 品目の列挙（重要）
${enumRule}
各品目について、下の2つのリストに該当があれば slug を、無ければ slug を "none" にして
その品目の栄養推定値（カロリー・タンパク質・脂質・炭水化物・塩分）を記入します。
まず「あなたの辞書」を優先的に照合し、無ければ「標準の料理リスト」を見ます。

各品目の dish_name_ja / dish_name_en は、自信がなくても「最も可能性の高い料理名」を必ず記入。
空文字は禁止。よだれ鶏・口水鶏のような中華料理も、日本語名（例: よだれ鶏）で必ず書くこと。${noFoodRule}${hintSection}

# 外食チェーンの地域補正
${chainRule}
チェーンでない場合は chain を空文字 '' にしてください。

caption フィールドは、${captionRule}
${userSection}

# 標準の料理リスト（slug<TAB>料理名）
${standardList}

# チェーン参照リスト（日本公式値。slug<TAB>チェーン 料理名<TAB>栄養）
${restaurantReference()}`;

  // 写真があれば画像ブロックを含め、hintのみ（写真なし）はテキストだけ送る（トークン節約）
  const content: Anthropic.ContentBlockParam[] = [];
  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: imageBase64 },
    });
  }
  content.push({ type: "text", text: prompt });

  // 構造化出力（output_config.format）で必ずスキーマ通りのJSONを得る
  const msg = await client.messages.create({
    model: MODEL,
    // 最大8品×栄養＋caption、日本語（Sonnet 5で約+30%）で出力が長い。
    // 申告と写真が食い違う難ケースでは品目が増えがちなので余裕を持たせる。
    max_tokens: 4000,
    system: gohankunSystemPrompt(userName),
    messages: [{ role: "user", content }],
    output_config: {
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = msg.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  // 判定の調査用ログ（AIの生レスポンスと主要フィールド）。
  console.log("[analyze] raw:", raw);
  const json = JSON.parse(raw);
  const rawItems = Array.isArray(json.items) ? json.items : [];
  const items: RawVisionItem[] = rawItems.slice(0, 8).map((it: Record<string, unknown>) => ({
    slug: String(it.slug ?? "none"),
    dishNameEn: String(it.dish_name_en ?? ""),
    dishNameJa: String(it.dish_name_ja ?? ""),
    portions: Number(it.portions) || 1,
    calories: Number(it.calories) || 0,
    protein: Number(it.protein) || 0,
    fat: Number(it.fat) || 0,
    carb: Number(it.carb) || 0,
    sodium: Number(it.sodium) || 0,
  }));
  console.log(
    "[analyze] items=%d [%s] confidence=%s chain=%s",
    items.length,
    items.map((i) => `${i.slug}:${i.dishNameJa}`).join(" | "),
    json.confidence,
    json.chain
  );
  return {
    items,
    caption: String(json.caption ?? ""),
    location: json.location ? String(json.location) : "Singapore",
    confidence: Number(json.confidence) || 0,
    chain: String(json.chain ?? ""),
  };
}
