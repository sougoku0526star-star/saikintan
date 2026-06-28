// 認証リポジトリ（メール＋パスワード）。サーバー専用。
import { getDb } from "./sqlite";
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
export function createUser(email: string, password: string): AuthUser | null {
  const norm = email.trim().toLowerCase();
  const exists = getDb()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(norm);
  if (exists) return null;
  const id = "usr-" + randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)"
    )
    .run(id, norm, hashPassword(password), Date.now());
  return { id, email: norm, username: null, nickname: null, emailVerified: false };
}

/** メール＋パスワード検証。 */
export function authenticate(email: string, password: string): AuthUser | null {
  const norm = email.trim().toLowerCase();
  const row = getDb()
    .prepare(
      "SELECT id, email, username, nickname, email_verified, password_hash FROM users WHERE email = ?"
    )
    .get(norm) as
    | { id: string; email: string; username: string | null; nickname: string | null; email_verified: number; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)")
    .run(token, userId, Date.now());
  return token;
}

export function getSessionUserId(token: string): string | undefined {
  const row = getDb()
    .prepare("SELECT user_id FROM sessions WHERE token = ?")
    .get(token) as { user_id: string } | undefined;
  return row?.user_id;
}

export function getUserById(id: string): AuthUser | undefined {
  const row = getDb()
    .prepare("SELECT id, email, username, nickname, email_verified FROM users WHERE id = ?")
    .get(id) as
    | { id: string; email: string; username: string | null; nickname: string | null; email_verified: number }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ---- ユーザーID（ハンドル） ----------------------------------------------

export type UsernameResult = "ok" | "invalid" | "taken";

export function setUsername(userId: string, username: string): UsernameResult {
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return "invalid";
  const taken = getDb()
    .prepare("SELECT id FROM users WHERE username = ? AND id <> ?")
    .get(u, userId) as { id: string } | undefined;
  if (taken) return "taken";
  getDb().prepare("UPDATE users SET username = ? WHERE id = ?").run(u, userId);
  return "ok";
}

// ---- ニックネーム（自由入力の表示名。ごはんくんの呼びかけに使う） ---------

export type NicknameResult = "ok" | "invalid";

/** ニックネームを設定。空文字なら解除（NULL）。20文字以内・改行不可。 */
export function setNickname(userId: string, nickname: string): NicknameResult {
  const n = nickname.replace(/[\r\n\t]/g, " ").trim();
  if (n.length > NICKNAME_MAX) return "invalid";
  getDb()
    .prepare("UPDATE users SET nickname = ? WHERE id = ?")
    .run(n || null, userId);
  return "ok";
}

export interface PublicUser {
  id: string;
  username: string;
}

/** ユーザーID検索（将来のフレンド機能の土台）。前方一致で最大20件。 */
export function searchUsers(q: string, excludeId?: string): PublicUser[] {
  const term = q.trim().toLowerCase().replace(/[%_]/g, "");
  if (!term) return [];
  const rows = getDb()
    .prepare(
      `SELECT id, username FROM users
       WHERE username IS NOT NULL AND username LIKE ? AND id <> ?
       ORDER BY username LIMIT 20`
    )
    .all(`${term}%`, excludeId ?? "") as PublicUser[];
  return rows;
}

// ---- メール確認 / パスワードリセット用トークン ---------------------------

export type TokenKind = "verify" | "reset";

export function createToken(userId: string, kind: TokenKind, ttlMs: number): string {
  const token = randomBytes(24).toString("hex");
  getDb()
    .prepare("INSERT INTO auth_tokens (token, user_id, kind, expires_at) VALUES (?,?,?,?)")
    .run(token, userId, kind, Date.now() + ttlMs);
  return token;
}

/** トークンを検証して消費（成功時は userId、無効/期限切れは null）。 */
export function consumeToken(token: string, kind: TokenKind): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT user_id, kind, expires_at FROM auth_tokens WHERE token = ?")
    .get(token) as { user_id: string; kind: string; expires_at: number } | undefined;
  if (!row || row.kind !== kind || row.expires_at < Date.now()) {
    if (row) db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
    return null;
  }
  db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
  return row.user_id;
}

export function setEmailVerified(userId: string): void {
  getDb().prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(userId);
}

export function setPassword(userId: string, password: string): void {
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), userId);
}

export function deleteUserSessions(userId: string): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function getUserByUsername(username: string): { id: string; username: string } | undefined {
  const u = username.trim().toLowerCase();
  const row = getDb()
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .get(u) as { id: string; username: string } | undefined;
  return row;
}

export function findUserByEmail(email: string): AuthUser | undefined {
  const norm = email.trim().toLowerCase();
  const row = getDb()
    .prepare("SELECT id, email, username, nickname, email_verified FROM users WHERE email = ?")
    .get(norm) as
    | { id: string; email: string; username: string | null; nickname: string | null; email_verified: number }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? null,
    nickname: row.nickname ?? null,
    emailVerified: !!row.email_verified,
  };
}

/** 匿名ユーザーのデータをアカウントへ移管（サインアップ時の引き継ぎ）。 */
export function migrateData(fromUid: string, toUserId: string): void {
  if (fromUid === toUserId) return;
  const db = getDb();
  const stmts = [
    "UPDATE OR IGNORE meal_records SET user_id = ? WHERE user_id = ?",
    "UPDATE OR IGNORE user_foods SET user_id = ? WHERE user_id = ?",
    "UPDATE OR REPLACE user_settings SET user_id = ? WHERE user_id = ?",
    "UPDATE images SET user_id = ? WHERE user_id = ?",
    "UPDATE OR REPLACE user_state SET user_id = ? WHERE user_id = ?",
  ];
  for (const sql of stmts) db.prepare(sql).run(toUserId, fromUid);
}
