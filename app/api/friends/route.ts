import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { listFriends, listIncoming, listOutgoing } from "@/lib/server/friends-db";

export const runtime = "nodejs";

export async function GET() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(me.id),
    listIncoming(me.id),
    listOutgoing(me.id),
  ]);
  return NextResponse.json({ friends, incoming, outgoing });
}
