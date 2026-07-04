// 日本料理の栄養マスター（日本食品標準成分表 八訂・増補2023 由来／1食あたり）。
// 一般的な家庭料理・レシピのため地域非依存（region なし＝どの地域でも同じ値）。
// japanese-dishes.json を読み込み、FoodNutrition 形式へ変換する。
import rawJson from "./japanese-dishes.json";
import type { FoodNutrition, FoodCategory } from "./nutrition-data";

interface RawDish {
  dish: string;
  category: string;
  serving: string;
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
  主菜: "MainDish",
  "主菜・中華": "MainDish",
  "主菜・卵": "MainDish",
  "主菜・洋": "MainDish",
  "主菜・肉": "MainDish",
  "主菜・豆腐": "MainDish",
  "主菜・魚": "MainDish",
  "おかず・自炊": "MainDish",
  おつまみ: "MainDish",
  副菜: "SideDish",
  汁物: "Soup",
  主食: "Rice",
  丼: "Rice",
  "主食・パン": "SideDish",
  お菓子: "Sweets",
  "飲み物・酒": "Drink",
};

const SOURCE = "日本食品標準成分表（八訂）2023";

const saltToSodium = (salt: number) => Math.round(salt * 393);

export const japaneseFoods: FoodNutrition[] = raw.map((r, i) => {
  const sodium =
    typeof r.sodium_mg === "number"
      ? Math.round(r.sodium_mg)
      : typeof r.salt_g === "number"
        ? saltToSodium(r.salt_g)
        : 0;
  return {
    id: 2001 + i,
    slug: `jp-dish-${String(i + 1).padStart(3, "0")}`,
    name: r.dish, // 日本語名（Visionは日本語も読める）
    nameJa: r.dish,
    category: CATEGORY_MAP[r.category] ?? "MainDish",
    calories: Math.round(r.energy_kcal),
    protein: r.protein_g,
    fat: r.fat_g,
    carb: r.carb_g,
    sodium,
    source: SOURCE,
  };
});
