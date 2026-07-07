// 栄養計算エンジン。
// 「画像解析が特定した料理 + 分量」を栄養素マスターに突き合わせ、
// カロリー・PFC・塩分を計算し、アプリのUI(MealEntry)が使える形に変換する。
// ※ 算術はすべてここ（コード側）で行う。LLMには「どの料理か」「何人前か」だけ任せる。

import { foods, type FoodNutrition } from "./nutrition-data";
import { restaurantFoods } from "./restaurant-data";
import { japaneseFoods } from "./japanese-data";
import { australiaFoods } from "./australia-data";
import { regionLabel, type RegionCode } from "./region";
import type { MealEntry, MealItem, NutritionDetail } from "./mock-data";
import {
  round1,
  macrosFromDetail,
  tagsFromDetail,
  tagsForMeal,
  applyItemsToMeal,
  JPY_PER_SGD,
} from "./nutrition-scale";
import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES_TO_JPY,
  type CurrencyCode,
} from "./currency";

export { JPY_PER_SGD };

// 記録確定前の暫定スペンド。実際の金額・通貨・円換算は確認画面(MealEditForm)で確定する。
function draftSpend(amount: number, currency: CurrencyCode) {
  return {
    amount,
    currency,
    jpy: Math.round(amount * FALLBACK_RATES_TO_JPY[currency]),
  };
}

// ---- 照合（マッチング） ---------------------------------------------------

// ローカル料理＋日本料理＋豪料理（地域非依存）＋ 外食チェーン（region付き）を合わせた全マスター。
const allFoods: FoodNutrition[] = [
  ...foods,
  ...japaneseFoods,
  ...australiaFoods,
  ...restaurantFoods,
];
const allBySlug: Record<string, FoodNutrition> = Object.fromEntries(
  allFoods.map((f) => [f.slug, f])
);
const allById: Record<number, FoodNutrition> = Object.fromEntries(
  allFoods.map((f) => [f.id, f])
);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// 正規化した name -> food の索引（表記ゆれ対策の簡易フォールバック）
const byNormalizedName: Record<string, FoodNutrition> = Object.fromEntries(
  allFoods.map((f) => [normalize(f.name), f])
);

/**
 * 画像解析の出力（slug / id / 料理名のいずれか）から食品を引く。
 * 1) slug 完全一致 → 2) id → 3) 正規化名の完全一致 → 4) 部分一致
 */
export function findFood(query: string | number): FoodNutrition | undefined {
  if (typeof query === "number") return allById[query];
  const q = query.trim();
  if (allBySlug[q]) return allBySlug[q];
  if (/^\d+$/.test(q) && allById[Number(q)]) return allById[Number(q)];
  const n = normalize(q);
  if (byNormalizedName[n]) return byNormalizedName[n];
  // 部分一致（例: "chicken rice" → "Hainanese Chicken Rice (Steamed)"）
  return allFoods.find((f) => {
    const fn = normalize(f.name);
    return fn.includes(n) || n.includes(fn);
  });
}

/** 画像解析モデルに渡す「分類先の選択肢」一覧（slug + name）。
 *  ローカル料理＋日本料理を含む（外食チェーンは別枠の参照リストで扱う）。 */
export function foodTaxonomy(): { slug: string; name: string; category: string }[] {
  return [...foods, ...japaneseFoods, ...australiaFoods].map((f) => ({
    slug: f.slug,
    name: f.name,
    category: f.category,
  }));
}

/** 料理名の完全一致で公式辞書を引く（品目名の訂正時の辞書引き直し用）。
 *  誤置換を避けるため部分一致はしない（名前が正確に一致したときだけ差し替える）。 */
export function lookupOfficialByName(name: string): FoodNutrition | undefined {
  const nq = name.trim().toLowerCase();
  if (!nq) return undefined;
  const pool = [...foods, ...japaneseFoods, ...australiaFoods, ...restaurantFoods];
  return pool.find(
    (f) => f.nameJa.toLowerCase() === nq || f.name.toLowerCase() === nq
  );
}

/** 料理名オートコンプリート用：公式辞書（地域非依存＋チェーン）を日本語/英語名で検索。 */
export function searchOfficialFoods(
  q: string,
  limit = 8
): { slug: string; name: string; nameJa: string }[] {
  const nq = q.trim().toLowerCase();
  if (!nq) return [];
  const pool = [...foods, ...japaneseFoods, ...australiaFoods, ...restaurantFoods];
  const hits = pool.filter(
    (f) => f.nameJa.toLowerCase().includes(nq) || f.name.toLowerCase().includes(nq)
  );
  // 前方一致を優先して並べる
  hits.sort((a, b) => {
    const as = a.nameJa.toLowerCase().startsWith(nq) ? 0 : 1;
    const bs = b.nameJa.toLowerCase().startsWith(nq) ? 0 : 1;
    return as - bs;
  });
  return hits.slice(0, limit).map((f) => ({ slug: f.slug, name: f.name, nameJa: f.nameJa }));
}

// ---- 計算 -----------------------------------------------------------------

export interface ComputedNutrition {
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  portions: number;
}

/** 1食あたりの値 × 分量倍率。 */
export function computeNutrition(
  food: FoodNutrition,
  portions = 1
): ComputedNutrition {
  const p = portions > 0 ? portions : 1;
  return {
    portions: p,
    calories: Math.round(food.calories * p),
    protein: round1(food.protein * p),
    fat: round1(food.fat * p),
    carb: round1(food.carb * p),
    sodium: Math.round(food.sodium * p),
  };
}

// ---- UI向けの「ざっくり評価」（純粋関数は nutrition-scale に集約） --------

export const toMacros = macrosFromDetail;
export const toNutritionTags = tagsFromDetail;

// ---- MealEntry への組み立て ----------------------------------------------

// 価格はAI推定だと誤差が大きいため推定しない（既定0）。
// ユーザーが記録確定前に手入力する（spendSgd で受け取る）。

export interface BuildMealOptions {
  photo: string;
  portions?: number;
  caption?: string; // AI生成キャプション（無ければテンプレ）
  location?: string;
  coords?: { lat: number; lng: number };
  date?: string; // ISO
  timeLabel?: string;
  spendAmount?: number; // 実支払い額が分かる場合
  spendCurrency?: CurrencyCode;
  region?: RegionCode; // ユーザーの地域（チェーン料理の地域補正判定に使う）
}

function templateCaption(food: FoodNutrition): string {
  return `${food.nameJa} を記録しました。写真からAIが料理を判定し、栄養素データを参照してカロリーを自動計算しています。`;
}

/** 食品 + 分量 + 写真 から、既存UIで使える MealEntry を生成する。 */
export function buildMeal(food: FoodNutrition, opts: BuildMealOptions): MealEntry {
  const portions = opts.portions ?? 1;
  const n = computeNutrition(food, portions);
  const spendAmount = opts.spendAmount ?? 0;
  const spendCurrency = opts.spendCurrency ?? DEFAULT_CURRENCY;
  const now = opts.date ? new Date(opts.date) : new Date();

  // 外食チェーンの栄養は地域依存。ユーザーの地域とデータの地域が違えば
  // 「その地域では差がある目安」として概算扱いにし、出典を明記する。
  const crossRegion =
    !!food.region && !!opts.region && food.region !== opts.region;
  let nutrition: ComputedNutrition & { estimated?: boolean } = n;
  let tags = toNutritionTags(n);
  let source: string | undefined;
  if (food.chain) {
    const official = food.source ?? `${food.chain}公式`;
    if (crossRegion) {
      nutrition = { ...n, estimated: true };
      tags = [{ label: "地域の目安", tone: "neutral" as const }, ...tags.slice(0, 2)];
      source = `${official}（${regionLabel(food.region!)}）を参照。${regionLabel(
        opts.region!
      )}では実際の値と差がある場合があります`;
    } else {
      source = `${official}（${regionLabel(food.region ?? "JP")}）`;
    }
  } else if (food.source) {
    // 出典のある一般料理（日本料理など）は出典だけ表示（地域補正なし）
    source = food.source;
  }

  return {
    id: food.slug,
    dishName: food.name,
    dishNameJa: food.nameJa,
    caption: opts.caption ?? templateCaption(food),
    photo: opts.photo,
    location: opts.location ?? "Singapore",
    coords: opts.coords,
    date: now.toISOString().slice(0, 10),
    timeLabel: opts.timeLabel ?? "Today",
    spend: draftSpend(spendAmount, spendCurrency),
    macros: toMacros(nutrition),
    nutritionTags: tags,
    nutrition,
    ...(source ? { source } : {}),
  };
}

// ---- 辞書に無い料理：写真からのAI直接推定 -------------------------------

export interface EstimateInput {
  name: string; // AIが付けた料理名（英語）
  nameJa: string; // 料理名（日本語）
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  photo: string;
  caption?: string;
  location?: string;
  coords?: { lat: number; lng: number };
  spendAmount?: number;
  spendCurrency?: CurrencyCode;
  source?: string; // 出典・地域メモ（チェーン料理の地域補正など）
}

function slugifyName(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `est-${s || "dish"}`;
}

/**
 * 辞書に該当が無い料理を、AIが写真から直接見積もった栄養で MealEntry 化する。
 * nutrition.estimated = true を立て、UIで「AI推定（概算）」として明示する。
 */
export function buildMealFromEstimate(opts: EstimateInput): MealEntry {
  const n: ComputedNutrition = {
    calories: Math.round(opts.calories),
    protein: round1(opts.protein),
    fat: round1(opts.fat),
    carb: round1(opts.carb),
    sodium: Math.round(opts.sodium),
    portions: 1,
  };
  const spendAmount = opts.spendAmount ?? 0;
  const spendCurrency = opts.spendCurrency ?? DEFAULT_CURRENCY;
  const now = new Date();

  return {
    id: slugifyName(opts.name),
    dishName: opts.name,
    dishNameJa: opts.nameJa || opts.name,
    caption:
      opts.caption ??
      `${opts.nameJa || opts.name} を記録しました。辞書に未登録のため、写真からAIが栄養を推定しています（概算）。`,
    photo: opts.photo,
    location: opts.location ?? "Singapore",
    coords: opts.coords,
    date: now.toISOString().slice(0, 10),
    timeLabel: "Today",
    spend: draftSpend(spendAmount, spendCurrency),
    macros: toMacros(n),
    // 先頭に「AI推定」タグを付けて概算であることを明示
    nutritionTags: [
      { label: "AI推定", tone: "neutral" },
      ...toNutritionTags(n).slice(0, 2),
    ],
    nutrition: { ...n, estimated: true },
    ...(opts.source ? { source: opts.source } : {}),
  };
}

// ---- ユーザー辞書に昇格済みの料理（データ参照として扱う） ----------------

export interface UserFoodLite {
  slug: string;
  name: string;
  nameJa: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
}

/**
 * ユーザーが辞書へ昇格させた料理を、データ参照（estimatedではない）として MealEntry 化する。
 * 1食あたりの登録値 × 分量。
 */
export function buildMealFromUserFood(
  uf: UserFoodLite,
  opts: BuildMealOptions
): MealEntry {
  const portions = opts.portions ?? 1;
  const n: ComputedNutrition = {
    calories: Math.round(uf.calories * portions),
    protein: round1(uf.protein * portions),
    fat: round1(uf.fat * portions),
    carb: round1(uf.carb * portions),
    sodium: Math.round(uf.sodium * portions),
    portions,
  };
  const spendAmount = opts.spendAmount ?? 0;
  const spendCurrency = opts.spendCurrency ?? DEFAULT_CURRENCY;
  const now = opts.date ? new Date(opts.date) : new Date();

  return {
    id: uf.slug,
    dishName: uf.name,
    dishNameJa: uf.nameJa || uf.name,
    caption:
      opts.caption ??
      `${uf.nameJa || uf.name} を記録しました。あなたの辞書に登録済みの料理として栄養を計算しています。`,
    photo: opts.photo,
    location: opts.location ?? "Singapore",
    coords: opts.coords,
    date: now.toISOString().slice(0, 10),
    timeLabel: opts.timeLabel ?? "Today",
    spend: draftSpend(spendAmount, spendCurrency),
    macros: toMacros(n),
    nutritionTags: toNutritionTags(n),
    nutrition: n,
  };
}

// ---- 複数品目（定食・複数皿）対応 ---------------------------------------

/** 画像解析が返す1品目分の生データ。 */
export interface RawVisionItem {
  slug: string; // 辞書slug。該当なしは "none"
  dishNameEn: string;
  dishNameJa: string;
  portions: number;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
}

/**
 * 1品目を解決する：slug が辞書ヒットなら DB値×分量、user辞書ヒットならその値×分量、
 * どちらも無ければ（none）AIの推定値を採用する。算術は全てここで行う。
 */
export function resolveMealItem(
  raw: RawVisionItem,
  userFoods: UserFoodLite[],
  userRegion: RegionCode,
  mealChain: string,
  lowConfidence: boolean
): MealItem {
  const portions = raw.portions > 0 ? raw.portions : 1;
  const slug = (raw.slug || "none").trim();

  if (slug !== "none") {
    // 公式辞書ヒット：DB値 × 分量。チェーンは地域補正の出典メモを付ける。
    const food = findFood(slug);
    if (food) {
      const base = computeNutrition(food, portions);
      const crossRegion = !!food.region && food.region !== userRegion;
      let nutrition: NutritionDetail = base;
      let source: string | undefined;
      let tags = tagsForMeal(base);
      if (food.chain) {
        const official = food.source ?? `${food.chain}公式`;
        if (crossRegion) {
          nutrition = { ...base, estimated: true };
          tags = [
            { label: "地域の目安", tone: "neutral" as const },
            ...tagsFromDetail(base).slice(0, 2),
          ];
          source = `${official}（${regionLabel(food.region!)}）を参照。${regionLabel(
            userRegion
          )}では実際の値と差がある場合があります`;
        } else {
          source = `${official}（${regionLabel(food.region ?? "JP")}）`;
        }
      } else if (food.source) {
        source = food.source;
      }
      return {
        slug: food.slug,
        dishName: food.name,
        dishNameJa: food.nameJa,
        nutrition,
        tags,
        ...(source ? { source } : {}),
      };
    }
    // ユーザー辞書ヒット
    const uf = userFoods.find((f) => f.slug === slug);
    if (uf) {
      const n: NutritionDetail = {
        calories: Math.round(uf.calories * portions),
        protein: round1(uf.protein * portions),
        fat: round1(uf.fat * portions),
        carb: round1(uf.carb * portions),
        sodium: Math.round(uf.sodium * portions),
        portions,
      };
      return {
        slug: uf.slug,
        dishName: uf.name,
        dishNameJa: uf.nameJa || uf.name,
        nutrition: n,
        tags: tagsForMeal(n),
      };
    }
  }

  // 辞書に無い → AIの推定値をそのまま採用（写真の量に対する概算）
  const n: NutritionDetail = {
    calories: Math.round(raw.calories || 0),
    protein: round1(raw.protein || 0),
    fat: round1(raw.fat || 0),
    carb: round1(raw.carb || 0),
    sodium: Math.round(raw.sodium || 0),
    portions: 1,
    estimated: true,
  };
  const baseJa = raw.dishNameJa || raw.dishNameEn;
  const dishNameJa = baseJa ? (lowConfidence ? `${baseJa}（たぶん）` : baseJa) : "不明な品";
  const dishName = raw.dishNameEn || raw.dishNameJa || "Unknown item";
  const source = mealChain
    ? `${mealChain}公式（日本）を参照した${regionLabel(userRegion)}の推定値`
    : undefined;
  return {
    dishName,
    dishNameJa,
    nutrition: n,
    tags: tagsForMeal(n),
    ...(source ? { source } : {}),
  };
}

/** 解決済みの品目内訳から、合算した MealEntry を組み立てる。 */
export function buildMealFromItems(
  items: MealItem[],
  opts: BuildMealOptions
): MealEntry {
  const now = opts.date ? new Date(opts.date) : new Date();
  const base: MealEntry = {
    id: items[0]?.slug || (items[0] ? slugifyName(items[0].dishName) : "meal"),
    dishName: "",
    dishNameJa: "",
    caption: opts.caption ?? "写真から複数の品目を記録しました。",
    photo: opts.photo,
    location: opts.location ?? "Singapore",
    coords: opts.coords,
    date: now.toISOString().slice(0, 10),
    timeLabel: opts.timeLabel ?? "Today",
    spend: draftSpend(opts.spendAmount ?? 0, opts.spendCurrency ?? DEFAULT_CURRENCY),
    macros: { protein: "low", fat: "low", carb: "low" },
    nutritionTags: [],
  };
  // 合計栄養・macros・タグ・表示名・items を applyItemsToMeal で確定
  return applyItemsToMeal(base, items);
}
