import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import {
  evaluateGohankunMessages,
  markMessagesRead,
} from "@/lib/server/gohankun-messages";

export const runtime = "nodejs";

// アクセス時に遅延評価（cron不要）してご飯君メッセージ全件を返す。
export async function GET() {
  const uid = getUserId();
  const messages = await evaluateGohankunMessages(uid);
  return NextResponse.json({ messages });
}

// 既読化。{ id } 指定で1件、省略で全件。
export async function POST(req: Request) {
  const uid = getUserId();
  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* 空ボディ = 全件既読 */
  }
  markMessagesRead(uid, body.id);
  return NextResponse.json({ ok: true });
}
