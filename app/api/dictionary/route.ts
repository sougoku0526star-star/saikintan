import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { listFoods, upsertFood } from "@/lib/server/db";

export const runtime = "nodejs";

// ユーザー辞書の一覧
export async function GET() {
  const uid = getUserId();
  return NextResponse.json({ foods: listFoods(uid) });
}

// ユーザー辞書へ追加/更新（昇格）
export async function POST(req: Request) {
  const uid = getUserId();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const nameJa = String(body.nameJa ?? "").trim();
  if (!name && !nameJa) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const food = upsertFood(uid, {
    slug: body.slug ? String(body.slug) : undefined,
    name: name || nameJa,
    nameJa: nameJa || name,
    category: String(body.category ?? "Other"),
    calories: Number(body.calories) || 0,
    protein: Number(body.protein) || 0,
    fat: Number(body.fat) || 0,
    carb: Number(body.carb) || 0,
    sodium: Number(body.sodium) || 0,
  });
  return NextResponse.json({ food });
}
