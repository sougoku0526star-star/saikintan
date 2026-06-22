// ユーザー辞書のクライアント側API。
// 以前は localStorage だったが、サーバー(DB)へ永続化（端末横断・本番化）。
// 通信は /api/dictionary 経由。Cookieの uid でユーザーが区別される。

export interface UserFood {
  slug: string;
  name: string; // 英語名
  nameJa: string; // 日本語名
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  addedAt: number;
}

export const USER_DICT_UPDATED = "saikintan:userdict-updated";

export const FOOD_CATEGORIES = [
  "Rice",
  "Noodles",
  "Soup",
  "Snack",
  "Salad",
  "Vegetable",
  "Seafood",
  "Dessert",
  "Drink",
  "Other",
];

export function slugifyUser(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `user-${s || "dish"}`;
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_DICT_UPDATED));
  }
}

/** サーバーからユーザー辞書を取得。 */
export async function fetchUserFoods(): Promise<UserFood[]> {
  const res = await fetch("/api/dictionary", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.foods ?? []) as UserFood[];
}

/** 辞書へ追加/更新（昇格）。 */
export async function addUserFood(
  food: Omit<UserFood, "addedAt"> & { addedAt?: number }
): Promise<UserFood | null> {
  const res = await fetch("/api/dictionary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food),
  });
  if (!res.ok) return null;
  const data = await res.json();
  notify();
  return data.food as UserFood;
}

/** 辞書から削除。 */
export async function removeUserFood(slug: string): Promise<void> {
  await fetch(`/api/dictionary/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  notify();
}

// 元データCSVと同じ列でエクスポート（正規データへの統合用）。
export function toCsv(foods: UserFood[]): string {
  const header =
    "id,food_name,category,calories_kcal,protein_g,fat_g,carbohydrate_g,sodium_mg";
  const rows = foods.map((f, i) => {
    const name = /[",]/.test(f.name) ? `"${f.name.replace(/"/g, '""')}"` : f.name;
    return [
      101 + i, // 既存100品の続き番号（マージ時に調整可）
      name,
      f.category,
      f.calories,
      f.protein,
      f.fat,
      f.carb,
      f.sodium,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
