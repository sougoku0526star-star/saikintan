// 食事記録のサーバーリポジトリ（SQLite）。サーバー専用。
import { getDb } from "./sqlite";
import { meals, type MealEntry } from "../mock-data";

export interface RecordEntry {
  id: string; // レコード固有ID（料理slugとは別）
  meal: MealEntry;
  createdAt: number;
}

// 初回のみ、デモ記録をそのユーザーにシードする。
function seedIfNeeded(userId: string): void {
  const db = getDb();
  const row = db
    .prepare("SELECT records_seeded FROM user_state WHERE user_id = ?")
    .get(userId) as { records_seeded: number } | undefined;
  if (row?.records_seeded) return;

  const ins = db.prepare(
    `INSERT OR IGNORE INTO meal_records (user_id,id,date,created_at,data)
     VALUES (?,?,?,?,?)`
  );
  meals.forEach((m, i) => {
    const rec: RecordEntry = {
      id: `seed-${m.id}`,
      meal: m,
      createdAt: Date.parse(m.date) + i,
    };
    ins.run(userId, rec.id, m.date, rec.createdAt, JSON.stringify(rec));
  });
  db.prepare(
    `INSERT INTO user_state (user_id, records_seeded) VALUES (?, 1)
     ON CONFLICT(user_id) DO UPDATE SET records_seeded = 1`
  ).run(userId);
}

export function listRecords(userId: string): RecordEntry[] {
  seedIfNeeded(userId);
  const rows = getDb()
    .prepare(
      `SELECT data FROM meal_records WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`
    )
    .all(userId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as RecordEntry);
}

export function upsertRecord(userId: string, rec: RecordEntry): RecordEntry {
  // シードは「触った」とみなして二度と再投入しない
  seedIfNeeded(userId);
  getDb()
    .prepare(
      `INSERT INTO meal_records (user_id,id,date,created_at,data)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id,id) DO UPDATE SET
         date=excluded.date, created_at=excluded.created_at, data=excluded.data`
    )
    .run(userId, rec.id, rec.meal.date, rec.createdAt, JSON.stringify(rec));
  return rec;
}

export function deleteRecord(userId: string, id: string): void {
  // 削除を確定させるため、シード済みフラグを立てる（削除分が復活しないように）
  seedIfNeeded(userId);
  getDb()
    .prepare("DELETE FROM meal_records WHERE user_id = ? AND id = ?")
    .run(userId, id);
}
