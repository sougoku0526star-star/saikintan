import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";
import { searchUsers } from "@/lib/server/auth-db";

export const runtime = "nodejs";

// ユーザーID検索（将来のフレンド機能の土台）。ログイン必須。
export async function GET(req: Request) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ users: await searchUsers(q, me.id) });
}
