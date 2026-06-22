// 栄養の純粋関数（栄養素マスターに依存しない）。
// サーバー(nutrition.ts)とクライアント(ジャーナルの分量調整UI)の両方から使う。
// ※ ここで foods 配列を import しないこと（クライアントバンドルを軽く保つため）。

import type { MacroLevel, NutritionDetail, NutritionTag } from "./mock-data";

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
