// AI呼び出しの1日あたり回数制限（P3「ご飯君に聞く」など）。広告+Exit原価設計のガード。
import { getDb } from "./sqlite";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function todayCount(uid: string, action: string): number {
  const row = getDb()
    .prepare(
      "SELECT count FROM ai_rate_limit WHERE user_id = ? AND action = ? AND ymd = ?"
    )
    .get(uid, action, todayYMD()) as { count: number } | undefined;
  return row?.count ?? 0;
}

/** 消費せずに残り回数だけ見る（UI表示用）。 */
export function remainingToday(uid: string, action: string, limit: number): number {
  return Math.max(0, limit - todayCount(uid, action));
}

/** 上限未満なら1回消費して allowed=true。上限到達なら消費せず allowed=false。 */
export function consumeToday(
  uid: string,
  action: string,
  limit: number
): { allowed: boolean; remaining: number } {
  const count = todayCount(uid, action);
  if (count >= limit) return { allowed: false, remaining: 0 };
  getDb()
    .prepare(
      `INSERT INTO ai_rate_limit (user_id, action, ymd, count) VALUES (?,?,?,1)
       ON CONFLICT(user_id, action, ymd) DO UPDATE SET count = count + 1`
    )
    .run(uid, action, todayYMD());
  return { allowed: true, remaining: limit - (count + 1) };
}
