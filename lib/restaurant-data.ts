// 外食チェーンの栄養マスター（日本公式値・region="JP"）。
// restaurant-master.json（公式サイト由来）を読み込み、FoodNutrition 形式へ変換する。
// 地域が日本以外のユーザーには、この値を土台にAIが地域補正して提示する。
import rawJson from "./restaurant-master.json";
import type { FoodNutrition, FoodCategory } from "./nutrition-data";

interface RawItem {
  chain: string;
  item: string;
  category: string;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  sugar_g: number | null;
  salt_g: number | null;
  sodium_mg: number | null;
  source: string;
  source_url: string;
  retrieved: string;
}

const raw = rawJson as RawItem[];

const CHAIN_CODE: Record<string, string> = {
  マクドナルド: "mcd",
  バーガーキング: "bk",
  サブウェイ: "sub",
  サイゼリヤ: "saize",
};

const CHAIN_EN: Record<string, string> = {
  マクドナルド: "McDonald's",
  バーガーキング: "Burger King",
  サブウェイ: "Subway",
  サイゼリヤ: "Saizeriya",
};

const CATEGORY_MAP: Record<string, FoodCategory> = {
  バーガー: "Burger",
  サンドイッチ: "Sandwich",
  サイド: "SideDish",
  朝食: "Breakfast",
  スイーツ: "Sweets",
  デザート: "Dessert",
  ドリンク: "Drink",
  サラダ: "Salad",
  パン: "SideDish",
  主菜: "MainDish",
  主食: "Rice",
  スープ: "Soup",
};

// 塩分(g)→ナトリウム(mg)換算（1g塩 ≈ 393mgナトリウム）
const saltToSodium = (salt: number) => Math.round(salt * 393);

const perChainCount: Record<string, number> = {};

export const restaurantFoods: FoodNutrition[] = raw.map((r, i) => {
  const code = CHAIN_CODE[r.chain] ?? "etc";
  perChainCount[code] = (perChainCount[code] ?? 0) + 1;
  const slug = `jp-${code}-${String(perChainCount[code]).padStart(2, "0")}`;
  const sodium =
    typeof r.sodium_mg === "number"
      ? r.sodium_mg
      : typeof r.salt_g === "number"
        ? saltToSodium(r.salt_g)
        : 0;
  return {
    id: 1001 + i,
    slug,
    name: `${CHAIN_EN[r.chain] ?? r.chain} ${r.item}`,
    nameJa: `${r.item}（${r.chain}）`,
    category: CATEGORY_MAP[r.category] ?? "MainDish",
    calories: Math.round(r.energy_kcal),
    protein: r.protein_g,
    fat: r.fat_g,
    carb: r.carb_g,
    sodium,
    region: "JP",
    chain: r.chain,
    source: r.source,
  };
});

/** チェーン栄養の参照リスト（AIプロンプト用・地域補正の土台）。 */
export function restaurantReference(): string {
  return restaurantFoods
    .map(
      (f) =>
        `${f.slug}\t${f.chain} ${f.nameJa.replace(/（.*）$/, "")}\t${f.calories}kcal P${f.protein} F${f.fat} C${f.carb}`
    )
    .join("\n");
}
