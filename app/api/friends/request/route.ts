import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { getUserByUsername } from "@/lib/server/auth-db";
import { sendFriendRequest } from "@/lib/server/friends-db";

export const runtime = "nodejs";

const MSG: Record<string, string> = {
  self: "自分には申請できません",
  exists: "すでに申請済みです",
  already: "すでにフレンドです",
};

export async function POST(req: Request) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const target = await getUserByUsername(body.username || "");
  if (!target) {
    return NextResponse.json({ error: "そのユーザーIDは見つかりません" }, { status: 404 });
  }
  const result = await sendFriendRequest(me.id, target.id);
  if (result !== "ok") {
    return NextResponse.json({ error: MSG[result] }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
