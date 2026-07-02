// ユーザー設定（月予算・メイン通貨）のサーバーリポジトリ。サーバー専用。
import { getDb } from "./sqlite";
import { DEFAULT_CURRENCY, toCurrency, type CurrencyCode } from "../currency";

export const DEFAULT_MONTHLY_BUDGET = 320; // 既定（メイン通貨建て）

export interface UserSettings {
  monthlyBudget: number; // メイン通貨建て
  mainCurrency: CurrencyCode;
}

export function getSettings(userId: string): UserSettings {
  const row = getDb()
    .prepare("SELECT monthly_budget_sgd, main_currency FROM user_settings WHERE user_id = ?")
    .get(userId) as { monthly_budget_sgd: number; main_currency: string | null } | undefined;
  return {
    monthlyBudget: row?.monthly_budget_sgd ?? DEFAULT_MONTHLY_BUDGET,
    mainCurrency: toCurrency(row?.main_currency ?? DEFAULT_CURRENCY),
  };
}

export function getMonthlyBudget(userId: string): number {
  return getSettings(userId).monthlyBudget;
}

export function setMonthlyBudget(userId: string, value: number): number {
  const v = value > 0 ? value : DEFAULT_MONTHLY_BUDGET;
  getDb()
    .prepare(
      `INSERT INTO user_settings (user_id, monthly_budget_sgd) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET monthly_budget_sgd = excluded.monthly_budget_sgd`
    )
    .run(userId, v);
  return v;
}

export function setMainCurrency(userId: string, code: CurrencyCode): CurrencyCode {
  const cc = toCurrency(code);
  getDb()
    .prepare(
      `INSERT INTO user_settings (user_id, monthly_budget_sgd, main_currency) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET main_currency = excluded.main_currency`
    )
    .run(userId, DEFAULT_MONTHLY_BUDGET, cc);
  return cc;
}
