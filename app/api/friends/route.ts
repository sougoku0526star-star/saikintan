import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { listFriends, listIncoming, listOutgoing } from "@/lib/server/friends-db";

export const runtime = "nodejs";

export async function GET() {
  const me = getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  return NextResponse.json({
    friends: listFriends(me.id),
    incoming: listIncoming(me.id),
    outgoing: listOutgoing(me.id),
  });
}
