import { NextResponse } from "next/server";
import { consumeToken, setPassword, deleteUserSessions } from "@/lib/server/auth-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if ((body.password || "").length < 6) {
    return NextResponse.json(
      { error: "パスワードは6文字以上にしてください" },
      { status: 400 }
    );
  }
  const userId = body.token ? consumeToken(body.token, "reset") : null;
  if (!userId) {
    return NextResponse.json(
      { error: "リンクが無効または期限切れです" },
      { status: 400 }
    );
  }
  setPassword(userId, body.password!);
  deleteUserSessions(userId); // 既存セッションを失効（安全のため）
  return NextResponse.json({ ok: true });
}
