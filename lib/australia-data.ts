// オーストラリア料理の栄養マスター（Australian Food Composition Database (AFCD) R3 由来／1食あたり）。
// 一般的な料理・レシピのため地域非依存（region なし＝どの地域でも同じ値）。
// au-dishes.json を読み込み、FoodNutrition 形式へ変換する。
import rawJson from "./au-dishes.json";
import type { FoodNutrition, FoodCategory } from "./nutrition-data";

interface RawDish {
  dish: string;
  dish_en: string;
  category: string;
  serving_g: number;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  salt_g: number | null;
  sodium_mg: number | null;
  source: string;
}

const raw = rawJson as RawDish[];

const CATEGORY_MAP: Record<string, FoodCategory> = {
  "カフェ・朝食": "Breakfast",
  "アイコン料理": "MainDish",
  デザート: "Dessert",
  "多文化・日常食": "MainDish",
};

const SOURCE = "Australian Food Composition Database (AFCD) R3";

const saltToSodium = (salt: number) => Math.round(salt * 393);

export const australiaFoods: FoodNutrition[] = raw.map((r, i) => {
  const sodium =
    typeof r.sodium_mg === "number"
      ? Math.round(r.sodium_mg)
      : typeof r.salt_g === "number"
        ? saltToSodium(r.salt_g)
        : 0;
  return {
    id: 3001 + i,
    slug: `au-dish-${String(i + 1).padStart(3, "0")}`,
    name: r.dish_en, // 英語名（AI照合に有利）
    nameJa: r.dish,
    category: CATEGORY_MAP[r.category] ?? "MainDish",
    calories: Math.round(r.energy_kcal),
    protein: Math.round(r.protein_g * 10) / 10,
    fat: Math.round(r.fat_g * 10) / 10,
    carb: Math.round(r.carb_g * 10) / 10,
    sodium,
    source: SOURCE,
  };
});
