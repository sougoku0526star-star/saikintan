// ユーザー設定（月予算など）のサーバーリポジトリ。サーバー専用。
import { getDb } from "./sqlite";

export const DEFAULT_MONTHLY_BUDGET_SGD = 320; // 既定（週に直すと約S$80）

export function getMonthlyBudget(userId: string): number {
  const row = getDb()
    .prepare("SELECT monthly_budget_sgd FROM user_settings WHERE user_id = ?")
    .get(userId) as { monthly_budget_sgd: number } | undefined;
  return row?.monthly_budget_sgd ?? DEFAULT_MONTHLY_BUDGET_SGD;
}

export function setMonthlyBudget(userId: string, value: number): number {
  const v = value > 0 ? value : DEFAULT_MONTHLY_BUDGET_SGD;
  getDb()
    .prepare(
      `INSERT INTO user_settings (user_id, monthly_budget_sgd) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET monthly_budget_sgd = excluded.monthly_budget_sgd`
    )
    .run(userId, v);
  return v;
}
