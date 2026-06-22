import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/user";

export const runtime = "nodejs";

export async function GET() {
  const user = getAuthUser();
  return NextResponse.json({
    user: user
      ? { email: user.email, username: user.username, emailVerified: user.emailVerified }
      : null,
  });
}
