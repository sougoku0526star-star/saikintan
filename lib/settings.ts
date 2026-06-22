// ユーザー設定のクライアントAPI（月予算）。

export const SETTINGS_UPDATED = "saikintan:settings-updated";
export const DEFAULT_MONTHLY_BUDGET_SGD = 320;
export const WEEKS_PER_MONTH = 4; // 月予算 ÷ 4 ＝ 週予算（簡易・直感的）

/** 月予算から週予算を算出。 */
export function weeklyFromMonthly(monthly: number): number {
  return Math.round(monthly / WEEKS_PER_MONTH);
}

export async function fetchMonthlyBudget(): Promise<number> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) return DEFAULT_MONTHLY_BUDGET_SGD;
    const d = await res.json();
    return Number(d.monthlyBudgetSgd) || DEFAULT_MONTHLY_BUDGET_SGD;
  } catch {
    return DEFAULT_MONTHLY_BUDGET_SGD;
  }
}

export async function saveMonthlyBudget(value: number): Promise<number> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ monthlyBudgetSgd: value }),
  });
  const d = await res.json();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_UPDATED));
  }
  return Number(d.monthlyBudgetSgd) || value;
}
