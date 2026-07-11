import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { setUsername } from "@/lib/server/auth-db";

export const runtime = "nodejs";

const MESSAGES: Record<string, string> = {
  invalid: "半角英数字とアンダースコア、3〜20文字で設定してください",
  taken: "このユーザーIDは既に使われています",
};

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const result = await setUsername(user.id, body.username || "");
  if (result !== "ok") {
    return NextResponse.json({ error: MESSAGES[result] }, { status: 400 });
  }
  return NextResponse.json({ ok: true, username: (body.username || "").trim().toLowerCase() });
}
