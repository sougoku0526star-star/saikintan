import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  findFood,
  buildMeal,
  buildMealFromEstimate,
  buildMealFromUserFood,
  foodTaxonomy,
  type UserFoodLite,
} from "@/lib/nutrition";
import { foods } from "@/lib/nutrition-data";
import { getUserId, getAuthUser } from "@/lib/server/user";
import { listFoods } from "@/lib/server/db";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { gohankunSystemPrompt, gohankunYou } from "@/lib/server/gohankun-persona";

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
}

// 既定は最も高性能な Opus 4.8（高解像度ビジョン対応）。
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";

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
    const meal = buildMeal(food, {
      photo: body.photo || "",
      portions: body.portions ?? 1,
    });
    return NextResponse.json({ meal, source: "lookup" });
  }

  // --- 2) 実写真：Claude Visionで「100品のどれか」に分類 + 分量推定 ----
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (body.imageBase64 && apiKey) {
    try {
      // ユーザー辞書はサーバー（DB）から取得（クライアント送信値は使わない）
      const userFoods: UserFoodLite[] = listFoods(getUserId());
      const me = getAuthUser();
      const userName = me?.nickname ?? me?.username ?? null;
      const analysis = await analyzeWithClaude(
        body.imageBase64,
        toMedia(body.mimeType),
        userFoods,
        userName
      );

      // 位置：写真EXIFのGPSがあれば優先、無ければ場所名をジオコーディング
      const coords =
        (typeof body.exifCoords?.lat === "number" ? body.exifCoords : undefined) ??
        (await geocode(analysis.location));

      // 1) 公式辞書（100品＋）にヒット
      const food = analysis.slug !== "none" ? findFood(analysis.slug) : undefined;
      if (food) {
        const meal = buildMeal(food, {
          photo: body.photo || "",
          portions: analysis.portions || 1,
          caption: analysis.caption,
          location: analysis.location,
          coords,
        });
        return NextResponse.json({
          meal,
          source: "vision",
          confidence: analysis.confidence,
        });
      }

      // 2) ユーザー辞書（昇格済み）にヒット → データ参照として扱う
      const uf = userFoods.find((f) => f.slug === analysis.slug);
      if (uf) {
        const meal = buildMealFromUserFood(uf, {
          photo: body.photo || "",
          portions: analysis.portions || 1,
          caption: analysis.caption,
          location: analysis.location,
          coords,
        });
        return NextResponse.json({
          meal,
          source: "vision",
          confidence: analysis.confidence,
        });
      }

      // 辞書に該当なし：写真からAIが直接推定した栄養を採用（概算）
      const meal = buildMealFromEstimate({
        name: analysis.dishNameEn || "Unknown dish",
        nameJa: analysis.dishNameJa || analysis.dishNameEn || "不明な料理",
        calories: analysis.calories,
        protein: analysis.protein,
        fat: analysis.fat,
        carb: analysis.carb,
        sodium: analysis.sodium,
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
    } catch (e) {
      console.error("vision analyze failed:", e);
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
  slug: string;
  portions: number;
  caption: string;
  location: string;
  confidence: number;
  // 辞書に無い場合に使う、AIによる料理名＋栄養の直接推定
  dishNameEn: string;
  dishNameJa: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
}

// 構造化出力で、必ずこの形のJSONが返る。
// slug が "none" のときは dish_name_* と栄養推定値（写真の実際の盛り付け量に対する概算）を使う。
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string", description: "料理リストのslug。該当が無ければ 'none'" },
    dish_name_en: { type: "string", description: "料理名（英語）。slugが'none'でも必ず記入" },
    dish_name_ja: { type: "string", description: "料理名（日本語）。slugが'none'でも必ず記入" },
    portions: { type: "number", description: "標準1人前を1.0とした分量倍率（辞書ヒット時のスケール用）" },
    caption: {
      type: "string",
      description:
        "キャラクター「ごはんくん」がユーザーに語りかける日記風コメント（日本語・2〜3文・60〜120字）。料理名や場所に触れ、やさしくゆるい口調で、海外でがんばるユーザーを応援する一言。",
    },
    location: { type: "string", description: "推測できる場所。不明なら 'Singapore'" },
    confidence: { type: "number", description: "料理判定の自信度 0.0〜1.0" },
    calories: { type: "number", description: "写真に写っている量に対する推定カロリー(kcal)" },
    protein: { type: "number", description: "推定タンパク質(g)" },
    fat: { type: "number", description: "推定脂質(g)" },
    carb: { type: "number", description: "推定炭水化物(g)" },
    sodium: { type: "number", description: "推定塩分(mg)" },
  },
  required: [
    "slug",
    "dish_name_en",
    "dish_name_ja",
    "portions",
    "caption",
    "location",
    "confidence",
    "calories",
    "protein",
    "fat",
    "carb",
    "sodium",
  ],
  additionalProperties: false,
} as const;

async function analyzeWithClaude(
  imageBase64: string,
  mediaType: SupportedMedia,
  userFoods: UserFoodLite[] = [],
  userName: string | null = null
): Promise<VisionResult> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から自動取得
  const you = gohankunYou(userName);

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

  const prompt = `次の食事写真を分析してください。料理の判定と栄養の数値は、空想ではなく
現実的で正確に見積もること（ここはプロの栄養士として厳密に）。

下の2つのリストから最も一致するものを slug で1つだけ選んでください。
まず「あなたの辞書」を優先的に照合し、無ければ「標準の料理リスト」を見ます。
どちらにも該当が無ければ slug を "none" にしてください。

slug が "none" の場合でも、写真から料理名（英語・日本語）を推定し、
写真に写っている量に対する栄養（カロリー・タンパク質・脂質・炭水化物・塩分）を
できる限り正確に見積もってください。料理が辞書にあってもなくても、
これらの推定値は必ず記入してください。

ただし caption フィールドだけは、キャラクター「ごはんくん」として
${you}に語りかける日記風コメントを書いてください（system の人格・口調に従う）。
${userSection}

# 標準の料理リスト（slug<TAB>料理名）
${standardList}`;

  // 構造化出力（output_config.format）で必ずスキーマ通りのJSONを得る
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: gohankunSystemPrompt(userName),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = msg.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const json = JSON.parse(raw);
  return {
    slug: String(json.slug ?? "none"),
    portions: Number(json.portions) || 1,
    caption: String(json.caption ?? ""),
    location: json.location ? String(json.location) : "Singapore",
    confidence: Number(json.confidence) || 0,
    dishNameEn: String(json.dish_name_en ?? ""),
    dishNameJa: String(json.dish_name_ja ?? ""),
    calories: Number(json.calories) || 0,
    protein: Number(json.protein) || 0,
    fat: Number(json.fat) || 0,
    carb: Number(json.carb) || 0,
    sodium: Number(json.sodium) || 0,
  };
}
