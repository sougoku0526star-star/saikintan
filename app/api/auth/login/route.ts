import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticate, createSession } from "@/lib/server/auth-db";
import { SESSION_COOKIE } from "@/lib/server/user";

export const runtime = "nodejs";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const user = authenticate(body.email || "", body.password || "");
  if (!user) {
    return NextResponse.json(
      { error: "メールアドレスまたはパスワードが違います" },
      { status: 401 }
    );
  }
  const token = createSession(user.id);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return NextResponse.json({ user: { email: user.email } });
}
