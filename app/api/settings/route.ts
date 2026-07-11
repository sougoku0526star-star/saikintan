import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import {
  getSettings,
  setMonthlyBudget,
  setMainCurrency,
} from "@/lib/server/settings-db";
import { isCurrency } from "@/lib/currency";

export const runtime = "nodejs";

export async function GET() {
  const uid = await getUserId();
  const s = await getSettings(uid);
  return NextResponse.json({ monthlyBudget: s.monthlyBudget, mainCurrency: s.mainCurrency });
}

export async function POST(req: Request) {
  const uid = await getUserId();
  let body: { monthlyBudget?: number; mainCurrency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.monthlyBudget === "number") {
    await setMonthlyBudget(uid, body.monthlyBudget);
  }
  if (isCurrency(body.mainCurrency)) {
    await setMainCurrency(uid, body.mainCurrency);
  }
  const s = await getSettings(uid);
  return NextResponse.json({ monthlyBudget: s.monthlyBudget, mainCurrency: s.mainCurrency });
}
