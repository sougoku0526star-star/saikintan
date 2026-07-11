// 認証リポジトリ（メール＋パスワード）。サーバー専用。
import { getDb } from "./pg";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  nickname: string | null;
  emailVerified: boolean;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const NICKNAME_MAX = 20;

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(pw, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return calc.length === orig.length && timingSafeEqual(calc, orig);
}

/** 新規ユーザー作成。メール重複なら null。 */
export async function createUser(email: string, password: string): Promise<AuthUser | null> {
  const norm = email.trim().toLowerCase();
  const exists = await getDb()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(norm);
  if (exists) return null;
  const id = "usr-" + randomUUID();
  await getDb()
    .prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)"
    )
    .run(id, norm, hashPassword(password), Date.now());
  return { id, email: norm, username: null, nickname: null, emailVerified: false };
}

/** メール＋パスワード検証。 */
export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const norm = email.trim().toLowerCase();
  const row = await getDb()
    .prepare(
      "SELECT id, email, username, nickname, email_verified, password_hash FROM users WHERE email = ?"
    )
    .get<{ id: string; email: string; username: string | null; nickname: string | null; email_verified: number; password_hash: string }>(norm);
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await getDb()
    .prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)")
    .run(token, userId, Date.now());
  return token;
}

export async function getSessionUserId(token: string): Promise<string | undefined> {
  const row = await getDb()
    .prepare("SELECT user_id FROM sessions WHERE token = ?")
    .get<{ user_id: string }>(token);
  return row?.user_id;
}

export async function getUserById(id: string): Promise<AuthUser | undefined> {
  const row = await getDb()
    .prepare("SELECT id, email, username, nickname, email_verified FROM users WHERE id = ?")
    .get<{ id: string; email: string; username: string | null; nickname: string | null; email_verified: number }>(id);
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ---- ユーザーID（ハンドル） ----------------------------------------------

export type UsernameResult = "ok" | "invalid" | "taken";

export async function setUsername(userId: string, username: string): Promise<UsernameResult> {
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return "invalid";
  const taken = await getDb()
    .prepare("SELECT id FROM users WHERE username = ? AND id <> ?")
    .get<{ id: string }>(u, userId);
  if (taken) return "taken";
  await getDb().prepare("UPDATE users SET username = ? WHERE id = ?").run(u, userId);
  return "ok";
}

// ---- ニックネーム（自由入力の表示名。ごはんくんの呼びかけに使う） ---------

export type NicknameResult = "ok" | "invalid";

/** ニックネームを設定。空文字なら解除（NULL）。20文字以内・改行不可。 */
export async function setNickname(userId: string, nickname: string): Promise<NicknameResult> {
  const n = nickname.replace(/[\r\n\t]/g, " ").trim();
  if (n.length > NICKNAME_MAX) return "invalid";
  await getDb()
    .prepare("UPDATE users SET nickname = ? WHERE id = ?")
    .run(n || null, userId);
  return "ok";
}

export interface PublicUser {
  id: string;
  username: string;
}

/** ユーザーID検索（将来のフレンド機能の土台）。前方一致で最大20件。 */
export async function searchUsers(q: string, excludeId?: string): Promise<PublicUser[]> {
  const term = q.trim().toLowerCase().replace(/[%_]/g, "");
  if (!term) return [];
  const rows = await getDb()
    .prepare(
      `SELECT id, username FROM users
       WHERE username IS NOT NULL AND username LIKE ? AND id <> ?
       ORDER BY username LIMIT 20`
    )
    .all<PublicUser>(`${term}%`, excludeId ?? "");
  return rows;
}

// ---- メール確認 / パスワードリセット用トークン ---------------------------

export type TokenKind = "verify" | "reset";

export async function createToken(userId: string, kind: TokenKind, ttlMs: number): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await getDb()
    .prepare("INSERT INTO auth_tokens (token, user_id, kind, expires_at) VALUES (?,?,?,?)")
    .run(token, userId, kind, Date.now() + ttlMs);
  return token;
}

/** トークンを検証して消費（成功時は userId、無効/期限切れは null）。 */
export async function consumeToken(token: string, kind: TokenKind): Promise<string | null> {
  const db = getDb();
  const row = await db
    .prepare("SELECT user_id, kind, expires_at FROM auth_tokens WHERE token = ?")
    .get<{ user_id: string; kind: string; expires_at: number }>(token);
  if (!row || row.kind !== kind || row.expires_at < Date.now()) {
    if (row) await db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
    return null;
  }
  await db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
  return row.user_id;
}

export async function setEmailVerified(userId: string): Promise<void> {
  await getDb().prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(userId);
}

export async function setPassword(userId: string, password: string): Promise<void> {
  await getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), userId);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export async function getUserByUsername(username: string): Promise<{ id: string; username: string } | undefined> {
  const u = username.trim().toLowerCase();
  const row = await getDb()
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .get<{ id: string; username: string }>(u);
  return row;
}

export async function findUserByEmail(email: string): Promise<AuthUser | undefined> {
  const norm = email.trim().toLowerCase();
  const row = await getDb()
    .prepare("SELECT id, email, username, nickname, email_verified FROM users WHERE email = ?")
    .get<{ id: string; email: string; username: string | null; nickname: string | null; email_verified: number }>(norm);
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

/**
 * 匿名ユーザーのデータをアカウントへ移管（サインアップ時の引き継ぎ）。
 * SQLite版は `UPDATE OR IGNORE` / `UPDATE OR REPLACE` でPK衝突を握りつぶしていたが、
 * Postgresには同等のUPDATE修飾子が無いため、NOT EXISTSガード / DELETE→UPDATE で明示的に再現する。
 * 全体をトランザクションにまとめ、途中失敗時は全て巻き戻す。
 */
export async function migrateData(fromUid: string, toUserId: string): Promise<void> {
  if (fromUid === toUserId) return;
  await getDb().transaction(async (client) => {
    // meal_records: 複合PK(user_id,id)が衝突する行はスキップ（=OR IGNORE相当）
    await client.query(
      `UPDATE meal_records SET user_id = $1
       WHERE user_id = $2
         AND id NOT IN (SELECT id FROM meal_records WHERE user_id = $1)`,
      [toUserId, fromUid]
    );
    // user_foods: 複合PK(user_id,slug)が衝突する行はスキップ（=OR IGNORE相当）
    await client.query(
      `UPDATE user_foods SET user_id = $1
       WHERE user_id = $2
         AND slug NOT IN (SELECT slug FROM user_foods WHERE user_id = $1)`,
      [toUserId, fromUid]
    );
    // user_settings: PK(user_id)。移管先に既存行があれば削除してから付け替え（=OR REPLACE相当）
    await client.query(`DELETE FROM user_settings WHERE user_id = $1`, [toUserId]);
    await client.query(
      `UPDATE user_settings SET user_id = $1 WHERE user_id = $2`,
      [toUserId, fromUid]
    );
    // images: PKはidのみで衝突しないので単純UPDATE
    await client.query(`UPDATE images SET user_id = $1 WHERE user_id = $2`, [toUserId, fromUid]);
    // user_state: PK(user_id)。同様にOR REPLACE相当
    await client.query(`DELETE FROM user_state WHERE user_id = $1`, [toUserId]);
    await client.query(
      `UPDATE user_state SET user_id = $1 WHERE user_id = $2`,
      [toUserId, fromUid]
    );
  });
}
