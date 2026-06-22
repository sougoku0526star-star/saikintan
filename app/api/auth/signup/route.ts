import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createUser,
  createSession,
  migrateData,
  createToken,
} from "@/lib/server/auth-db";
import { getAnonUid, SESSION_COOKIE } from "@/lib/server/user";
import { sendAuthLink, baseUrl } from "@/lib/server/mailer";

export const runtime = "nodejs";
const ONE_YEAR = 60 * 60 * 24 * 365;
const DAY = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!email.includes("@") || password.length < 6) {
    return NextResponse.json(
      { error: "メールアドレスと6文字以上のパスワードを入力してください" },
      { status: 400 }
    );
  }

  const anon = getAnonUid();
  const user = createUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "このメールアドレスは既に登録されています" },
      { status: 409 }
    );
  }

  const token = createSession(user.id);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });

  // ログイン前の匿名データをアカウントへ引き継ぐ
  if (anon) migrateData(anon, user.id);

  // メール確認リンクを送信（開発時はdevLinkを返す）
  const verifyToken = createToken(user.id, "verify", DAY);
  const url = `${baseUrl(req)}/verify?token=${verifyToken}`;
  const mail = await sendAuthLink(
    user.email,
    "メールアドレスの確認",
    url,
    "彩金譚へようこそ。下のリンクでメールアドレスを確認してください。"
  );

  return NextResponse.json({
    user: { email: user.email, username: user.username, emailVerified: false },
    devVerifyUrl: mail.devLink,
  });
}
