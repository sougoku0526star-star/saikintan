// 料理名オートコンプリートのクライアント側フェッチ。/api/food-search 経由。
export interface FoodSuggestion {
  label: string;
  slug?: string;
  source: "history" | "userdict" | "official";
}

export async function searchFoods(q: string): Promise<FoodSuggestion[]> {
  if (!q.trim()) return [];
  try {
    const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.suggestions) ? (data.suggestions as FoodSuggestion[]) : [];
  } catch {
    return [];
  }
}

export interface LookupFood {
  slug: string;
  name: string;
  nameJa: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  source?: string;
}

/** 品目名を辞書で完全一致引き直し（訂正時。AI再解析はしない）。無ければ null。 */
export async function lookupFood(name: string): Promise<LookupFood | null> {
  if (!name.trim()) return null;
  try {
    const res = await fetch(`/api/food-lookup?name=${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.food ?? null) as LookupFood | null;
  } catch {
    return null;
  }
}
