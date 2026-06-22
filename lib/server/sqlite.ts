// 共有のSQLite接続＋スキーマ（node:sqlite）。サーバー専用。
// この層の裏側を差し替えれば Postgres 等へ移行できる。
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const g = globalThis as unknown as { __saikintanDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (g.__saikintanDb) return g.__saikintanDb;
  const dir = path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const conn = new DatabaseSync(path.join(dir, "saikintan.db"));
  conn.exec(`
    CREATE TABLE IF NOT EXISTS user_foods (
      user_id  TEXT    NOT NULL,
      slug     TEXT    NOT NULL,
      name     TEXT    NOT NULL,
      name_ja  TEXT    NOT NULL,
      category TEXT    NOT NULL,
      calories REAL    NOT NULL,
      protein  REAL    NOT NULL,
      fat      REAL    NOT NULL,
      carb     REAL    NOT NULL,
      sodium   REAL    NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, slug)
    );

    CREATE TABLE IF NOT EXISTS meal_records (
      user_id    TEXT    NOT NULL,
      id         TEXT    NOT NULL,
      date       TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      data       TEXT    NOT NULL,
      PRIMARY KEY (user_id, id)
    );

    CREATE TABLE IF NOT EXISTS user_state (
      user_id        TEXT PRIMARY KEY,
      records_seeded INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id            TEXT PRIMARY KEY,
      monthly_budget_sgd REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      mime       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fx_rates (
      pair       TEXT PRIMARY KEY,
      rate       REAL NOT NULL,
      fetched_on TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      kind       TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id           TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      addressee_id TEXT NOT NULL,
      status       TEXT NOT NULL,  -- 'pending' | 'accepted'
      created_at   INTEGER NOT NULL,
      UNIQUE(requester_id, addressee_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id           TEXT PRIMARY KEY,
      sender_id    TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      body         TEXT NOT NULL,
      created_at   INTEGER NOT NULL,
      record       TEXT          -- 共有された記録のスナップショット(JSON)。通常メッセージはNULL
    );

    -- 画像の閲覧許可（共有で所有者以外にアクセス権を付与する）
    CREATE TABLE IF NOT EXISTS image_grants (
      image_id   TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(image_id, user_id)
    );
  `);

  // 既存DBへの追加カラム（無ければ足す。あればエラーを握りつぶす）
  for (const sql of [
    "ALTER TABLE users ADD COLUMN username TEXT",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE messages ADD COLUMN record TEXT",
  ]) {
    try {
      conn.exec(sql);
    } catch {
      /* 既に存在 */
    }
  }
  g.__saikintanDb = conn;
  return conn;
}
