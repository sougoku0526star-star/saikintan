// フレンド＋メッセージのサーバーリポジトリ。サーバー専用。
import { getDb } from "./sqlite";
import { randomUUID } from "node:crypto";
import { grantImageAccess } from "./images-db";

export interface Brief {
  id: string;
  username: string | null;
}

function brief(id: string): Brief {
  const row = getDb()
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .get(id) as Brief | undefined;
  return row ?? { id, username: null };
}

// ---- フレンド ----------------------------------------------------------

export type RequestResult = "ok" | "self" | "exists" | "already";

export function sendFriendRequest(fromId: string, toId: string): RequestResult {
  if (fromId === toId) return "self";
  const db = getDb();
  const accepted = db
    .prepare(
      `SELECT 1 FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get(fromId, toId, toId, fromId);
  if (accepted) return "already";

  const pending = db
    .prepare(
      `SELECT requester_id FROM friendships WHERE status='pending'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get(fromId, toId, toId, fromId) as { requester_id: string } | undefined;
  if (pending) {
    // 相手が既に自分へ申請済みなら、そのまま成立させる
    if (pending.requester_id === toId) {
      acceptFriendRequest(fromId, toId);
      return "ok";
    }
    return "exists";
  }

  db.prepare(
    "INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?,?,?,?,?)"
  ).run(randomUUID(), fromId, toId, "pending", Date.now());
  return "ok";
}

export function acceptFriendRequest(meId: string, requesterId: string): void {
  getDb()
    .prepare(
      "UPDATE friendships SET status='accepted' WHERE requester_id=? AND addressee_id=? AND status='pending'"
    )
    .run(requesterId, meId);
}

export function declineFriendRequest(meId: string, requesterId: string): void {
  getDb()
    .prepare(
      "DELETE FROM friendships WHERE requester_id=? AND addressee_id=? AND status='pending'"
    )
    .run(requesterId, meId);
}

export function removeFriend(meId: string, otherId: string): void {
  getDb()
    .prepare(
      `DELETE FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .run(meId, otherId, otherId, meId);
}

export function areFriends(a: string, b: string): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get(a, b, b, a);
}

export function listFriends(meId: string): Brief[] {
  const rows = getDb()
    .prepare(
      `SELECT CASE WHEN requester_id=? THEN addressee_id ELSE requester_id END AS other
       FROM friendships WHERE status='accepted' AND (requester_id=? OR addressee_id=?)`
    )
    .all(meId, meId, meId) as { other: string }[];
  return rows.map((r) => brief(r.other));
}

export function listIncoming(meId: string): Brief[] {
  const rows = getDb()
    .prepare("SELECT requester_id FROM friendships WHERE addressee_id=? AND status='pending'")
    .all(meId) as { requester_id: string }[];
  return rows.map((r) => brief(r.requester_id));
}

export function listOutgoing(meId: string): Brief[] {
  const rows = getDb()
    .prepare("SELECT addressee_id FROM friendships WHERE requester_id=? AND status='pending'")
    .all(meId) as { addressee_id: string }[];
  return rows.map((r) => brief(r.addressee_id));
}

// ---- メッセージ --------------------------------------------------------

/** チャットに添付された記録のスナップショット（共有時点の情報を保持）。 */
export interface SharedRecord {
  recordId: string; // 送信者側の記録ID（自分の投稿からの遷移用）
  dishName: string;
  dishNameJa: string;
  photo: string;
  location: string;
  date: string;
  timeLabel: string;
  calories?: number;
  spendSgd?: number;
  spendJpy?: number;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  body: string;
  createdAt: number;
  /** 記録の共有メッセージならスナップショットが入る */
  record?: SharedRecord;
}

export function sendMessage(
  fromId: string,
  toId: string,
  body: string
): "ok" | "notfriends" | "empty" {
  const text = body.trim();
  if (!text) return "empty";
  if (!areFriends(fromId, toId)) return "notfriends";
  getDb()
    .prepare(
      "INSERT INTO messages (id, sender_id, recipient_id, body, created_at) VALUES (?,?,?,?,?)"
    )
    .run(randomUUID(), fromId, toId, text.slice(0, 2000), Date.now());
  return "ok";
}

/** アルバムの記録を、任意のコメント付きでフレンドに共有する。 */
export function shareRecord(
  fromId: string,
  toId: string,
  record: SharedRecord,
  comment: string
): "ok" | "notfriends" | "invalid" {
  if (!record || !record.photo || !record.dishNameJa) return "invalid";
  if (!areFriends(fromId, toId)) return "notfriends";
  // 写真が自前ストアの画像なら、受信者に閲覧権を付与する
  const m = /^\/api\/images\/([\w-]+)$/.exec(record.photo);
  if (m) grantImageAccess(m[1], toId);
  getDb()
    .prepare(
      "INSERT INTO messages (id, sender_id, recipient_id, body, created_at, record) VALUES (?,?,?,?,?,?)"
    )
    .run(
      randomUUID(),
      fromId,
      toId,
      comment.trim().slice(0, 2000),
      Date.now(),
      JSON.stringify(record)
    );
  return "ok";
}

function parseRecord(raw: string | null): SharedRecord | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SharedRecord;
  } catch {
    return undefined;
  }
}

export function listMessages(meId: string, otherId: string): ChatMessage[] {
  if (!areFriends(meId, otherId)) return [];
  const rows = getDb()
    .prepare(
      `SELECT id, sender_id, body, created_at, record FROM messages
       WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
       ORDER BY created_at ASC LIMIT 500`
    )
    .all(meId, otherId, otherId, meId) as {
    id: string;
    sender_id: string;
    body: string;
    created_at: number;
    record: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    fromMe: r.sender_id === meId,
    body: r.body,
    createdAt: r.created_at,
    record: parseRecord(r.record),
  }));
}

export interface Conversation {
  user: Brief;
  lastBody: string | null;
  lastAt: number | null;
  fromMe: boolean;
}

export function listConversations(meId: string): Conversation[] {
  const friends = listFriends(meId);
  const db = getDb();
  return friends
    .map((f) => {
      const last = db
        .prepare(
          `SELECT sender_id, body, created_at, record FROM messages
           WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(meId, f.id, f.id, meId) as
        | { sender_id: string; body: string; created_at: number; record: string | null }
        | undefined;
      // 記録共有でコメントが無いときは、料理名をプレビューに使う
      let preview = last?.body ?? null;
      if (last?.record && !last.body) {
        const rec = parseRecord(last.record);
        preview = rec ? `🍽 ${rec.dishNameJa}` : "記録を共有しました";
      }
      return {
        user: f,
        lastBody: preview,
        lastAt: last?.created_at ?? null,
        fromMe: last ? last.sender_id === meId : false,
      };
    })
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
}
