import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { createToken } from "@/lib/server/auth-db";
import { sendAuthLink, baseUrl } from "@/lib/server/mailer";

export const runtime = "nodejs";
const DAY = 24 * 60 * 60 * 1000;

// ログイン中の未確認ユーザーに確認メールを再送
export async function POST(req: Request) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, already: true });

  const token = createToken(user.id, "verify", DAY);
  const url = `${baseUrl(req)}/verify?token=${token}`;
  const mail = await sendAuthLink(
    user.email,
    "メールアドレスの確認",
    url,
    "下のリンクでメールアドレスを確認してください。"
  );
  return NextResponse.json({ ok: true, devUrl: mail.devLink });
}
