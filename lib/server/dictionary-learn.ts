// ユーザー辞書への学習ループ。ユーザーが申告/訂正した料理名は「正しい教師データ」なので、
// 公式辞書に無ければユーザー辞書へ自動登録し、次回以降のオートコンプリート・解析に効かせる。
import type { MealEntry } from "../mock-data";
import { upsertFood } from "./db";
import { lookupOfficialByName } from "../nutrition";

const INVALID = new Set(["不明な料理", "不明な品", ""]);
function validName(n?: string): n is string {
  const t = (n ?? "").trim();
  return !!t && !INVALID.has(t) && !t.includes("（たぶん）");
}

function nutritionOf(x: {
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
}) {
  return {
    category: "Other",
    calories: x.calories,
    protein: x.protein,
    fat: x.fat,
    carb: x.carb,
    sodium: x.sodium,
  };
}

/** 記録保存時に呼ぶ。学習した品目は userNamed フラグをクリアして再学習を防ぐ。 */
export async function learnFromMeal(userId: string, meal: MealEntry, isNew: boolean): Promise<void> {
  // A: 申告名(hints)が公式辞書に無ければ学習（新規記録時のみ）。
  //    申告名に一致する品目があればその栄養、無ければ（セット名など）合計栄養を使う。
  if (isNew) {
    for (const raw of meal.hintNames ?? []) {
      const h = (raw ?? "").trim();
      if (!validName(h) || lookupOfficialByName(h)) continue;
      const item = (meal.items ?? []).find(
        (it) => it.dishNameJa.trim() === h
      );
      const src = item?.nutrition ?? meal.nutrition;
      if (!src) continue;
      await upsertFood(userId, { name: h, nameJa: h, ...nutritionOf(src) }, true);
    }
  }

  // B: ユーザーが手動で名付けた品目（辞書ヒットせず）を学習し、フラグをクリア
  for (const it of meal.items ?? []) {
    if (
      it.userNamed &&
      !it.slug &&
      validName(it.dishNameJa) &&
      !lookupOfficialByName(it.dishNameJa)
    ) {
      await upsertFood(
        userId,
        { name: it.dishNameJa, nameJa: it.dishNameJa, ...nutritionOf(it.nutrition) },
        true
      );
      it.userNamed = false; // 学習済み。再保存で重複学習しない
    }
  }
}
