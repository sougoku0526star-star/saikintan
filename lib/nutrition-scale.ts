// 栄養の純粋関数（栄養素マスターに依存しない）。
// サーバー(nutrition.ts)とクライアント(ジャーナルの分量調整UI)の両方から使う。
// ※ ここで foods 配列を import しないこと（クライアントバンドルを軽く保つため）。

import type {
  MacroLevel,
  MealEntry,
  MealItem,
  NutritionDetail,
  NutritionTag,
} from "./mock-data";

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const JPY_PER_SGD = 116;

// 1食あたりのグラム数 → low / mid / high
export function gramsToLevel(g: number, kind: "protein" | "fat" | "carb"): MacroLevel {
  const t = kind === "carb" ? { mid: 30, high: 60 } : { mid: 12, high: 25 };
  if (g >= t.high) return "high";
  if (g >= t.mid) return "mid";
  return "low";
}

export function macrosFromDetail(n: NutritionDetail): {
  protein: MacroLevel;
  fat: MacroLevel;
  carb: MacroLevel;
} {
  return {
    protein: gramsToLevel(n.protein, "protein"),
    fat: gramsToLevel(n.fat, "fat"),
    carb: gramsToLevel(n.carb, "carb"),
  };
}

// 計算結果から栄養タグ（バッジ）を優先度つきで生成。最大3つ。
export function tagsFromDetail(n: NutritionDetail): NutritionTag[] {
  const tags: NutritionTag[] = [];
  if (n.protein >= 25) tags.push({ label: "高タンパク", tone: "good" });
  if (n.calories <= 250) tags.push({ label: "低カロリー", tone: "good" });
  if (n.fat >= 25) tags.push({ label: "脂質 多め", tone: "watch" });
  if (n.carb >= 60) tags.push({ label: "炭水化物 多め", tone: "watch" });
  if (n.sodium >= 1500) tags.push({ label: "塩分 多め", tone: "watch" });
  if (tags.length === 0) tags.push({ label: "バランス◎", tone: "neutral" });
  return tags.slice(0, 3);
}

// 栄養を倍率でスケール（分量調整／手動上書き用）。
export function scaleNutrition(
  base: NutritionDetail,
  factor: number
): NutritionDetail {
  const f = factor > 0 ? factor : 1;
  return {
    calories: Math.round(base.calories * f),
    protein: round1(base.protein * f),
    fat: round1(base.fat * f),
    carb: round1(base.carb * f),
    sodium: Math.round(base.sodium * f),
    portions: Math.round(base.portions * f * 100) / 100,
    estimated: base.estimated,
  };
}

// 絶対的な分量（人前）にそろえる。現在値からの相対スケールに換算して適用。
export function withPortions(
  n: NutritionDetail,
  portions: number
): NutritionDetail {
  const cur = n.portions || 1;
  const target = portions > 0 ? portions : 1;
  return scaleNutrition(n, target / cur);
}

// 計算結果から栄養タグを生成（AI推定なら先頭に「AI推定」を付ける）。
export function tagsForMeal(n: NutritionDetail): NutritionTag[] {
  if (n.estimated) {
    return [{ label: "AI推定", tone: "neutral" }, ...tagsFromDetail(n).slice(0, 2)];
  }
  return tagsFromDetail(n);
}

// ---- 品目内訳（複数品目対応）--------------------------------------------

const ZERO_NUTRITION: NutritionDetail = {
  calories: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  sodium: 0,
  portions: 1,
};

/** 品目内訳の栄養を合算する。どれか1つでも推定なら合計も estimated 扱い。 */
export function sumItemsNutrition(items: MealItem[]): NutritionDetail {
  const total = items.reduce(
    (acc, it) => ({
      calories: acc.calories + (it.nutrition.calories || 0),
      protein: acc.protein + (it.nutrition.protein || 0),
      fat: acc.fat + (it.nutrition.fat || 0),
      carb: acc.carb + (it.nutrition.carb || 0),
      sodium: acc.sodium + (it.nutrition.sodium || 0),
      portions: 1,
      estimated: acc.estimated || it.nutrition.estimated,
    }),
    { ...ZERO_NUTRITION } as NutritionDetail
  );
  return {
    calories: Math.round(total.calories),
    protein: round1(total.protein),
    fat: round1(total.fat),
    carb: round1(total.carb),
    sodium: Math.round(total.sodium),
    portions: 1,
    estimated: total.estimated,
  };
}

/** 後方互換: items があればそれを、無ければトップレベルから1要素を合成して返す。 */
export function getMealItems(meal: MealEntry): MealItem[] {
  if (meal.items && meal.items.length) return meal.items;
  if (!meal.nutrition) return [];
  return [
    {
      slug: meal.id,
      dishName: meal.dishName,
      dishNameJa: meal.dishNameJa,
      nutrition: meal.nutrition,
      source: meal.source,
      tags: meal.nutritionTags,
    },
  ];
}

/** 品目名から食事全体の表示名を作る（主菜＋「他N品」）。 */
function comboName(items: MealItem[], lang: "ja" | "en"): string {
  if (items.length === 0) return lang === "ja" ? "料理" : "Meal";
  const head = lang === "ja" ? items[0].dishNameJa : items[0].dishName;
  return items.length > 1 ? `${head} 他${items.length - 1}品` : head;
}

/** 編集後の品目内訳から、食事全体（合計栄養・macros・タグ・名前）を再計算する。
 *  品目の追加・削除・訂正後の合計更新に使う（純粋関数・栄養マスター非依存）。 */
export function applyItemsToMeal(meal: MealEntry, items: MealItem[]): MealEntry {
  const total = sumItemsNutrition(items);
  return {
    ...meal,
    items,
    dishName: comboName(items, "en"),
    dishNameJa: comboName(items, "ja"),
    nutrition: total,
    macros: macrosFromDetail(total),
    nutritionTags: tagsForMeal(total),
  };
}
