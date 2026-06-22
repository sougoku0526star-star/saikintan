import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/server/auth-db";
import { SESSION_COOKIE } from "@/lib/server/user";

export const runtime = "nodejs";

export async function POST() {
  const jar = cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) deleteSession(sid);
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
