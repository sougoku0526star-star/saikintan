import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import {
  listMessages,
  sendMessage,
  shareRecord,
  areFriends,
  type SharedRecord,
} from "@/lib/server/friends-db";
import { getUserById } from "@/lib/server/auth-db";

export const runtime = "nodejs";

// スレッド取得：?with=<userId>
export async function GET(req: Request) {
  const me = getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  const withId = new URL(req.url).searchParams.get("with") || "";
  if (!withId || !areFriends(me.id, withId)) {
    return NextResponse.json({ error: "フレンドではありません" }, { status: 403 });
  }
  const friend = getUserById(withId);
  return NextResponse.json({
    friend: friend ? { id: friend.id, username: friend.username } : { id: withId, username: null },
    messages: listMessages(me.id, withId),
  });
}

// 送信：{ to, body } 通常メッセージ / { to, body, record } 記録の共有
export async function POST(req: Request) {
  const me = getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { to?: string; body?: string; record?: SharedRecord };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.record) {
    const result = shareRecord(me.id, body.to || "", body.record, body.body || "");
    if (result !== "ok") {
      return NextResponse.json(
        { error: result === "notfriends" ? "フレンドではありません" : "記録が不正です" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const result = sendMessage(me.id, body.to || "", body.body || "");
  if (result !== "ok") {
    return NextResponse.json(
      { error: result === "notfriends" ? "フレンドではありません" : "本文が空です" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
