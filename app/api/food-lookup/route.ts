import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { listFoods } from "@/lib/server/db";
import { lookupOfficialByName } from "@/lib/nutrition";

export const runtime = "nodejs";

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

// 品目名の訂正時に、辞書を「引き直す」（AI再解析はしない）。
// 完全一致でユーザー辞書→公式辞書の順に引き、ヒットすれば栄養値を返す。無ければ null。
export async function GET(req: Request) {
  const uid = await getUserId();
  const name = (new URL(req.url).searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ food: null });
  const nq = name.toLowerCase();

  const uf = (await listFoods(uid)).find(
    (f) => f.nameJa.toLowerCase() === nq || f.name.toLowerCase() === nq
  );
  if (uf) {
    const food: LookupFood = {
      slug: uf.slug,
      name: uf.name,
      nameJa: uf.nameJa,
      calories: uf.calories,
      protein: uf.protein,
      fat: uf.fat,
      carb: uf.carb,
      sodium: uf.sodium,
      source: "マイ辞書",
    };
    return NextResponse.json({ food });
  }

  const of = lookupOfficialByName(name);
  if (of) {
    const food: LookupFood = {
      slug: of.slug,
      name: of.name,
      nameJa: of.nameJa,
      calories: of.calories,
      protein: of.protein,
      fat: of.fat,
      carb: of.carb,
      sodium: of.sodium,
      source: of.source,
    };
    return NextResponse.json({ food });
  }

  return NextResponse.json({ food: null });
}
