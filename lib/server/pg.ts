// 共有のDB接続＋スキーマ（libSQL / Turso）。サーバー専用。
// 旧 sqlite.ts (node:sqlite, ローカルファイル固定) の後継。Vercelのサーバーレス関数は
// デプロイ済みコード一式(/var/task)が読み取り専用のため、ローカルファイルDBに書けない。
//
// 接続先は環境変数で自動切り替え:
//   - TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が両方あれば → Turso（本番/Vercel）
//   - 無ければ → ローカルファイル file:.data/saikintan.db（開発体験は従来どおり）
// libSQL は SQLite 互換なので、ローカルファイルでも Turso でも同じSQL・同じスキーマが動く。
//
// ※ ファイル名は歴史的経緯で pg.ts のまま（10箇所の import 安定のため）。中身は libSQL。
import { createClient, type Client, type InArgs, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";

const g = globalThis as unknown as {
  __saikintanDb?: Client;
  __saikintanSchemaReady?: Promise<void>;
};

function client(): Client {
  if (!g.__saikintanDb) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (url && authToken) {
      // 本番: Turso（libSQL）
      g.__saikintanDb = createClient({ url, authToken });
    } else {
      // 開発: ローカルファイルSQLite（従来どおり .data/saikintan.db）
      const dir = path.join(process.cwd(), ".data");
      mkdirSync(dir, { recursive: true });
      g.__saikintanDb = createClient({
        url: `file:${path.join(dir, "saikintan.db")}`,
      });
    }
  }
  return g.__saikintanDb;
}

// ---- スキーマ（SQLite方言。libSQL/Tursoでそのまま動く）-------------------
// epochミリ秒は INTEGER（libSQLは既定intMode="number"でJSのnumberとして返る）。
// 画像バイト列は BLOB としてDBに直接保存する（サーバーレスFSに書けないため）。
const SCHEMA_SQL = `
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
    uses     INTEGER NOT NULL DEFAULT 1,
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
    monthly_budget_sgd REAL NOT NULL,
    main_currency      TEXT
  );

  CREATE TABLE IF NOT EXISTS images (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    mime       TEXT NOT NULL,
    data       BLOB NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     INTEGER NOT NULL,
    username       TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    nickname       TEXT
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
    status       TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    UNIQUE(requester_id, addressee_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    sender_id    TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body         TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    record       TEXT
  );

  CREATE TABLE IF NOT EXISTS image_grants (
    image_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(image_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gohankun_messages (
    user_id    TEXT    NOT NULL,
    id         TEXT    NOT NULL,
    kind       TEXT    NOT NULL,
    text       TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    cta_label  TEXT,
    cta_href   TEXT,
    ref        TEXT,
    PRIMARY KEY (user_id, id)
  );

  CREATE TABLE IF NOT EXISTS ai_rate_limit (
    user_id TEXT    NOT NULL,
    action  TEXT    NOT NULL,
    ymd     TEXT    NOT NULL,
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, action, ymd)
  );

  CREATE TABLE IF NOT EXISTS weekly_letters (
    user_id     TEXT   NOT NULL,
    week_start  TEXT   NOT NULL,
    action_text TEXT,
    action_kind TEXT,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (user_id, week_start)
  );
`;

// 既存のローカルDB（旧node:sqliteスキーマ）に不足カラムを足す安全網。
// 新規（Turso）ではCREATEに全カラムが含まれ、これらは「重複カラム」エラーになるので握りつぶす。
const ALTER_SQL: string[] = [
  "ALTER TABLE images ADD COLUMN data BLOB",
  "ALTER TABLE user_foods ADD COLUMN uses INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE user_settings ADD COLUMN main_currency TEXT",
  "ALTER TABLE users ADD COLUMN username TEXT",
  "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN nickname TEXT",
  "ALTER TABLE messages ADD COLUMN record TEXT",
];

async function ensureSchema(): Promise<void> {
  if (!g.__saikintanSchemaReady) {
    g.__saikintanSchemaReady = (async () => {
      const c = client();
      await c.executeMultiple(SCHEMA_SQL);
      for (const sql of ALTER_SQL) {
        try {
          await c.execute(sql);
        } catch {
          /* 既にカラムが存在（新規DB等）→ 無視 */
        }
      }
    })();
  }
  await g.__saikintanSchemaReady;
}

// ---- SQLite風の呼び出しインターフェース ---------------------------------
// 既存コードは `getDb().prepare(sql).all(...)/.get(...)/.run(...)` という
// node:sqlite(同期)風の書き方をしていたため、同じ形のAPIを非同期版として提供する
// （呼び出し側は先頭に `await` を足すだけ）。libSQLは "?" プレースホルダをそのまま使える。
function toArgs(params: unknown[]): InArgs {
  // libSQL は undefined を受け付けないので null に寄せる。
  return params.map((p) => (p === undefined ? null : p)) as InValue[];
}

interface Stmt {
  all<T = unknown>(...params: unknown[]): Promise<T[]>;
  get<T = unknown>(...params: unknown[]): Promise<T | undefined>;
  run(...params: unknown[]): Promise<{ changes: number }>;
}

function prepare(sql: string): Stmt {
  return {
    async all<T>(...params: unknown[]) {
      await ensureSchema();
      const res = await client().execute({ sql, args: toArgs(params) });
      return res.rows as unknown as T[];
    },
    async get<T>(...params: unknown[]) {
      await ensureSchema();
      const res = await client().execute({ sql, args: toArgs(params) });
      return (res.rows[0] as unknown as T) ?? undefined;
    },
    async run(...params: unknown[]) {
      await ensureSchema();
      const res = await client().execute({ sql, args: toArgs(params) });
      return { changes: res.rowsAffected };
    },
  };
}

/** 生のSQLを直接実行（複数文をセミコロン区切りでまとめて渡せる。プレースホルダ無し）。 */
async function exec(sql: string): Promise<void> {
  await ensureSchema();
  await client().executeMultiple(sql);
}

// トランザクション。auth-db 互換のため、コールバックには Postgres風の
// `query(text, params[])`（$1,$2…プレースホルダ）を渡す。内部で libSQL の
// 名前付きパラメータ（:vN）へ変換するので、$1 の再利用も正しく動く。
interface TxClient {
  query(text: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
}

async function transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const tx = await client().transaction("write");
  try {
    const wrapped: TxClient = {
      async query(text: string, params: unknown[] = []) {
        const argsObj: Record<string, InValue> = {};
        const sql = text.replace(/\$(\d+)/g, (_m, n: string) => {
          const key = `v${n}`;
          const v = params[Number(n) - 1];
          argsObj[key] = (v === undefined ? null : v) as InValue;
          return `:${key}`;
        });
        const res = await tx.execute({ sql, args: argsObj });
        return { rowsAffected: res.rowsAffected };
      },
    };
    const result = await fn(wrapped);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export function getDb() {
  return { prepare, exec, transaction };
}
