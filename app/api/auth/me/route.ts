import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  return NextResponse.json({
    user: user
      ? {
          email: user.email,
          username: user.username,
          nickname: user.nickname,
          emailVerified: user.emailVerified,
        }
      : null,
  });
}
