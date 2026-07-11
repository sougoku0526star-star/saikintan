import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { acceptFriendRequest, declineFriendRequest } from "@/lib/server/friends-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { requesterId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.requesterId) {
    return NextResponse.json({ error: "requesterId required" }, { status: 400 });
  }
  if (body.action === "accept") await acceptFriendRequest(me.id, body.requesterId);
  else await declineFriendRequest(me.id, body.requesterId);
  return NextResponse.json({ ok: true });
}
