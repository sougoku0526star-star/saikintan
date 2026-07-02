import { NextResponse } from "next/server";
import { getRatesToJpy } from "@/lib/server/fx-db";

export const runtime = "nodejs";

// 各対応通貨→JPY の最新レート（サーバーで1日1回キャッシュ）
export async function GET() {
  const fx = await getRatesToJpy();
  return NextResponse.json(fx);
}
