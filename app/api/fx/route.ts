import { NextResponse } from "next/server";
import { getSgdJpyRate } from "@/lib/server/fx-db";

export const runtime = "nodejs";

// SGD→JPY の最新レート（サーバーで1日1回キャッシュ）
export async function GET() {
  const fx = await getSgdJpyRate();
  return NextResponse.json(fx);
}
