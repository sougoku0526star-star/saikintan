import { NextResponse } from "next/server";
import { findUserByEmail, createToken } from "@/lib/server/auth-db";
import { sendAuthLink, baseUrl } from "@/lib/server/mailer";

export const runtime = "nodejs";
const HOUR = 60 * 60 * 1000;

// パスワード再設定リンクの送信。存在有無は漏らさず常に ok を返す。
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const user = body.email ? findUserByEmail(body.email) : undefined;
  let devUrl: string | undefined;
  if (user) {
    const token = createToken(user.id, "reset", HOUR);
    const url = `${baseUrl(req)}/reset?token=${token}`;
    const mail = await sendAuthLink(
      user.email,
      "パスワードの再設定",
      url,
      "下のリンクから新しいパスワードを設定してください（1時間有効）。"
    );
    devUrl = mail.devLink;
  }
  return NextResponse.json({ ok: true, devUrl });
}
