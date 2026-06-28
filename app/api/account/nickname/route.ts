import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { setNickname } from "@/lib/server/auth-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  let body: { nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const result = setNickname(user.id, body.nickname || "");
  if (result !== "ok") {
    return NextResponse.json(
      { error: "ニックネームは20文字以内で設定してください" },
      { status: 400 }
    );
  }
  const nickname = (body.nickname || "").replace(/[\r\n\t]/g, " ").trim();
  return NextResponse.json({ ok: true, nickname: nickname || null });
}
