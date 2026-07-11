// 食事記録のサーバーリポジトリ（Postgres）。サーバー専用。
import { getDb } from "./pg";
import { meals, type MealEntry } from "../mock-data";

export interface RecordEntry {
  id: string; // レコード固有ID（料理slugとは別）
  meal: MealEntry;
  createdAt: number;
}

// 初回のみ、デモ記録をそのユーザーにシードする。
async function seedIfNeeded(userId: string): Promise<void> {
  const db = getDb();
  const row = await db
    .prepare("SELECT records_seeded FROM user_state WHERE user_id = ?")
    .get<{ records_seeded: number }>(userId);
  if (row?.records_seeded) return;

  for (let i = 0; i < meals.length; i++) {
    const m = meals[i];
    const rec: RecordEntry = {
      id: `seed-${m.id}`,
      meal: m,
      createdAt: Date.parse(m.date) + i,
    };
    // SQLite版の `INSERT OR IGNORE` 相当（複合PK衝突時は何もしない）
    await db
      .prepare(
        `INSERT INTO meal_records (user_id,id,date,created_at,data)
         VALUES (?,?,?,?,?)
         ON CONFLICT (user_id, id) DO NOTHING`
      )
      .run(userId, rec.id, m.date, rec.createdAt, JSON.stringify(rec));
  }
  await db
    .prepare(
      `INSERT INTO user_state (user_id, records_seeded) VALUES (?, 1)
       ON CONFLICT(user_id) DO UPDATE SET records_seeded = 1`
    )
    .run(userId);
}

export async function listRecords(userId: string): Promise<RecordEntry[]> {
  await seedIfNeeded(userId);
  const rows = await getDb()
    .prepare(
      `SELECT data FROM meal_records WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`
    )
    .all<{ data: string }>(userId);
  return rows.map((r) => JSON.parse(r.data) as RecordEntry);
}

export async function getRecord(userId: string, id: string): Promise<RecordEntry | undefined> {
  await seedIfNeeded(userId);
  const row = await getDb()
    .prepare("SELECT data FROM meal_records WHERE user_id = ? AND id = ?")
    .get<{ data: string }>(userId, id);
  return row ? (JSON.parse(row.data) as RecordEntry) : undefined;
}

export async function upsertRecord(userId: string, rec: RecordEntry): Promise<RecordEntry> {
  // シードは「触った」とみなして二度と再投入しない
  await seedIfNeeded(userId);
  await getDb()
    .prepare(
      `INSERT INTO meal_records (user_id,id,date,created_at,data)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id,id) DO UPDATE SET
         date=excluded.date, created_at=excluded.created_at, data=excluded.data`
    )
    .run(userId, rec.id, rec.meal.date, rec.createdAt, JSON.stringify(rec));
  return rec;
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  // 削除を確定させるため、シード済みフラグを立てる（削除分が復活しないように）
  await seedIfNeeded(userId);
  await getDb()
    .prepare("DELETE FROM meal_records WHERE user_id = ? AND id = ?")
    .run(userId, id);
}
