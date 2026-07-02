// ユーザー設定のクライアントAPI（月予算・メイン通貨）。
import { DEFAULT_CURRENCY, toCurrency, type CurrencyCode } from "./currency";

export const SETTINGS_UPDATED = "saikintan:settings-updated";
export const DEFAULT_MONTHLY_BUDGET_SGD = 320; // 既定（メイン通貨建て）
export const WEEKS_PER_MONTH = 4; // 月予算 ÷ 4 ＝ 週予算（簡易・直感的）

export interface AppSettings {
  monthlyBudget: number; // メイン通貨建て
  mainCurrency: CurrencyCode;
}

/** 月予算から週予算を算出。 */
export function weeklyFromMonthly(monthly: number): number {
  return Math.round(monthly / WEEKS_PER_MONTH);
}

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) throw new Error("settings fetch failed");
    const d = await res.json();
    return {
      monthlyBudget: Number(d.monthlyBudget) || DEFAULT_MONTHLY_BUDGET_SGD,
      mainCurrency: toCurrency(d.mainCurrency),
    };
  } catch {
    return { monthlyBudget: DEFAULT_MONTHLY_BUDGET_SGD, mainCurrency: DEFAULT_CURRENCY };
  }
}

export async function fetchMonthlyBudget(): Promise<number> {
  return (await fetchSettings()).monthlyBudget;
}

async function post(body: object) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_UPDATED));
  }
  return d;
}

export async function saveMonthlyBudget(value: number): Promise<number> {
  const d = await post({ monthlyBudget: value });
  return Number(d.monthlyBudget) || value;
}

export async function saveMainCurrency(code: CurrencyCode): Promise<CurrencyCode> {
  const d = await post({ mainCurrency: code });
  return toCurrency(d.mainCurrency);
}
