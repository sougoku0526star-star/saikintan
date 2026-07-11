// AI呼び出しの1日あたり回数制限（P3「ご飯君に聞く」など）。広告+Exit原価設計のガード。
import { getDb } from "./pg";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function todayCount(uid: string, action: string): Promise<number> {
  const row = await getDb()
    .prepare(
      "SELECT count FROM ai_rate_limit WHERE user_id = ? AND action = ? AND ymd = ?"
    )
    .get<{ count: number }>(uid, action, todayYMD());
  return row?.count ?? 0;
}

/** 消費せずに残り回数だけ見る（UI表示用）。 */
export async function remainingToday(uid: string, action: string, limit: number): Promise<number> {
  return Math.max(0, limit - (await todayCount(uid, action)));
}

/** 上限未満なら1回消費して allowed=true。上限到達なら消費せず allowed=false。 */
export async function consumeToday(
  uid: string,
  action: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await todayCount(uid, action);
  if (count >= limit) return { allowed: false, remaining: 0 };
  await getDb()
    .prepare(
      `INSERT INTO ai_rate_limit (user_id, action, ymd, count) VALUES (?,?,?,1)
       ON CONFLICT(user_id, action, ymd) DO UPDATE SET count = count + 1`
    )
    .run(uid, action, todayYMD());
  return { allowed: true, remaining: limit - (count + 1) };
}
