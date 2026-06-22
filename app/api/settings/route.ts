import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { getMonthlyBudget, setMonthlyBudget } from "@/lib/server/settings-db";

export const runtime = "nodejs";

export async function GET() {
  const uid = getUserId();
  return NextResponse.json({ monthlyBudgetSgd: getMonthlyBudget(uid) });
}

export async function POST(req: Request) {
  const uid = getUserId();
  let body: { monthlyBudgetSgd?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const v = setMonthlyBudget(uid, Number(body.monthlyBudgetSgd) || 0);
  return NextResponse.json({ monthlyBudgetSgd: v });
}
