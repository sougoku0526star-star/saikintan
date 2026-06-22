import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { deleteFood } from "@/lib/server/db";

export const runtime = "nodejs";

// ユーザー辞書から削除
export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const uid = getUserId();
  deleteFood(uid, params.slug);
  return NextResponse.json({ ok: true });
}
