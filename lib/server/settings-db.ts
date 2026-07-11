// ユーザー設定（月予算・メイン通貨）のサーバーリポジトリ。サーバー専用。
import { getDb } from "./pg";
import { DEFAULT_CURRENCY, toCurrency, type CurrencyCode } from "../currency";

export const DEFAULT_MONTHLY_BUDGET = 320; // 既定（メイン通貨建て）

export interface UserSettings {
  monthlyBudget: number; // メイン通貨建て
  mainCurrency: CurrencyCode;
}

export async function getSettings(userId: string): Promise<UserSettings> {
  const row = await getDb()
    .prepare("SELECT monthly_budget_sgd, main_currency FROM user_settings WHERE user_id = ?")
    .get<{ monthly_budget_sgd: number; main_currency: string | null }>(userId);
  return {
    monthlyBudget: row?.monthly_budget_sgd ?? DEFAULT_MONTHLY_BUDGET,
    mainCurrency: toCurrency(row?.main_currency ?? DEFAULT_CURRENCY),
  };
}

export async function getMonthlyBudget(userId: string): Promise<number> {
  return (await getSettings(userId)).monthlyBudget;
}

export async function setMonthlyBudget(userId: string, value: number): Promise<number> {
  const v = value > 0 ? value : DEFAULT_MONTHLY_BUDGET;
  await getDb()
    .prepare(
      `INSERT INTO user_settings (user_id, monthly_budget_sgd) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET monthly_budget_sgd = excluded.monthly_budget_sgd`
    )
    .run(userId, v);
  return v;
}

export async function setMainCurrency(userId: string, code: CurrencyCode): Promise<CurrencyCode> {
  const cc = toCurrency(code);
  await getDb()
    .prepare(
      `INSERT INTO user_settings (user_id, monthly_budget_sgd, main_currency) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET main_currency = excluded.main_currency`
    )
    .run(userId, DEFAULT_MONTHLY_BUDGET, cc);
  return cc;
}
