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
