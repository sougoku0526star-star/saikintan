import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { removeFriend } from "@/lib/server/friends-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body.userId) await removeFriend(me.id, body.userId);
  return NextResponse.json({ ok: true });
}
