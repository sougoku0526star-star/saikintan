import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getUserId } from "@/lib/server/user";
import { listRecords, upsertRecord } from "@/lib/server/records-db";
import { saveDataUrl } from "@/lib/server/images-db";
import type { MealEntry } from "@/lib/mock-data";

export const runtime = "nodejs";

// 記録一覧
export async function GET() {
  const uid = getUserId();
  return NextResponse.json({ records: listRecords(uid) });
}

// 記録の追加/更新（id があれば更新、無ければ新規発行）
export async function POST(req: Request) {
  const uid = getUserId();
  let body: { id?: string; meal?: MealEntry; createdAt?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.meal || !body.meal.id) {
    return NextResponse.json({ error: "meal required" }, { status: 400 });
  }
  // base64画像はオブジェクトストアへ退避し、記録にはURLだけを残す
  const meal = body.meal;
  if (meal.photo?.startsWith("data:")) {
    const url = saveDataUrl(uid, meal.photo);
    if (url) meal.photo = url;
  }
  // 思い出写真（任意・AI解析対象外）も同様にオブジェクトストアへ
  if (meal.memoryPhoto?.startsWith("data:")) {
    const url = saveDataUrl(uid, meal.memoryPhoto);
    if (url) meal.memoryPhoto = url;
  }
  const record = upsertRecord(uid, {
    id: body.id || randomUUID(),
    meal,
    createdAt: body.createdAt || Date.now(),
  });
  return NextResponse.json({ record });
}
