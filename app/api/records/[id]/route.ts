import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { deleteRecord } from "@/lib/server/records-db";

export const runtime = "nodejs";

// 記録の削除
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const uid = await getUserId();
  await deleteRecord(uid, params.id);
  return NextResponse.json({ ok: true });
}
