import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { listConversations } from "@/lib/server/friends-db";

export const runtime = "nodejs";

export async function GET() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  return NextResponse.json({ conversations: await listConversations(me.id) });
}
