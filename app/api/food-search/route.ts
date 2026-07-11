import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { listRecords } from "@/lib/server/records-db";
import { listFoods } from "@/lib/server/db";
import { searchOfficialFoods } from "@/lib/nutrition";

export const runtime = "nodejs";

export interface FoodSuggestion {
  label: string; // 表示・入力に使う料理名（日本語）
  slug?: string; // 辞書ヒットのslug（あれば）
  source: "history" | "userdict" | "official";
}

// 料理名オートコンプリート。候補ソースの優先順:
// (1) ユーザーの過去記録の料理名（頻度順） (2) ユーザー辞書 (3) 公式辞書
export async function GET(req: Request) {
  const uid = await getUserId();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ suggestions: [] });
  const nq = q.toLowerCase();

  // (1) 過去記録の料理名（食事名＋品目名）を頻度集計
  const histCount = new Map<string, number>();
  for (const r of await listRecords(uid)) {
    const names = [r.meal.dishNameJa, ...(r.meal.items?.map((i) => i.dishNameJa) ?? [])];
    for (const raw of names) {
      const name = (raw || "").trim();
      if (name && name.toLowerCase().includes(nq)) {
        histCount.set(name, (histCount.get(name) ?? 0) + 1);
      }
    }
  }
  const history: FoodSuggestion[] = Array.from(histCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => ({ label, source: "history" }));

  // (2) ユーザー辞書
  const userdict: FoodSuggestion[] = (await listFoods(uid))
    .filter(
      (f) => f.nameJa.toLowerCase().includes(nq) || f.name.toLowerCase().includes(nq)
    )
    .map((f) => ({ label: f.nameJa || f.name, slug: f.slug, source: "userdict" }));

  // (3) 公式辞書
  const official: FoodSuggestion[] = searchOfficialFoods(q, 8).map((f) => ({
    label: f.nameJa,
    slug: f.slug,
    source: "official",
  }));

  // 正規化名で重複排除（history > userdict > official の優先順）
  const seen = new Set<string>();
  const out: FoodSuggestion[] = [];
  for (const s of [...history, ...userdict, ...official]) {
    const key = s.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 8) break;
  }
  return NextResponse.json({ suggestions: out });
}
