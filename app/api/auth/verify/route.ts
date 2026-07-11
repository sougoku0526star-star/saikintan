import { NextResponse } from "next/server";
import { consumeToken, setEmailVerified } from "@/lib/server/auth-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const userId = body.token ? await consumeToken(body.token, "verify") : null;
  if (!userId) {
    return NextResponse.json(
      { error: "リンクが無効または期限切れです" },
      { status: 400 }
    );
  }
  await setEmailVerified(userId);
  return NextResponse.json({ ok: true });
}
