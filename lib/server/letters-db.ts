// 週次レターの提案(action)を週ごとに永続化。約束ループ（P1）で翌週に達成度を照合する。
import { getDb } from "./sqlite";
import { ACTION_KINDS, type ActionKind, type WeeklyAction } from "../weekly";

function normalizeKind(k: string | null): ActionKind {
  return ACTION_KINDS.includes(k as ActionKind) ? (k as ActionKind) : "other";
}

/** その週の提案を保存（同週は上書き）。week は週開始日ISO。 */
export function saveWeeklyAction(
  userId: string,
  weekStart: string,
  action: WeeklyAction
): void {
  getDb()
    .prepare(
      `INSERT INTO weekly_letters (user_id, week_start, action_text, action_kind, created_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id, week_start) DO UPDATE SET
         action_text = excluded.action_text,
         action_kind = excluded.action_kind,
         created_at  = excluded.created_at`
    )
    .run(userId, weekStart, action.text, action.kind, Date.now());
}

/** 指定週の保存済み提案（無ければ undefined）。 */
export function getWeeklyAction(
  userId: string,
  weekStart: string
): WeeklyAction | undefined {
  const row = getDb()
    .prepare(
      "SELECT action_text, action_kind FROM weekly_letters WHERE user_id = ? AND week_start = ?"
    )
    .get(userId, weekStart) as
    | { action_text: string | null; action_kind: string | null }
    | undefined;
  if (!row || !row.action_text) return undefined;
  return { text: row.action_text, kind: normalizeKind(row.action_kind) };
}
