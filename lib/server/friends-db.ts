// フレンド＋メッセージのサーバーリポジトリ。サーバー専用。
import { getDb } from "./pg";
import { randomUUID } from "node:crypto";
import { grantImageAccess } from "./images-db";

export interface Brief {
  id: string;
  username: string | null;
}

async function brief(id: string): Promise<Brief> {
  const row = await getDb()
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .get<Brief>(id);
  return row ?? { id, username: null };
}

// ---- フレンド ----------------------------------------------------------

export type RequestResult = "ok" | "self" | "exists" | "already";

export async function sendFriendRequest(fromId: string, toId: string): Promise<RequestResult> {
  if (fromId === toId) return "self";
  const db = getDb();
  const accepted = await db
    .prepare(
      `SELECT 1 FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get(fromId, toId, toId, fromId);
  if (accepted) return "already";

  const pending = await db
    .prepare(
      `SELECT requester_id FROM friendships WHERE status='pending'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get<{ requester_id: string }>(fromId, toId, toId, fromId);
  if (pending) {
    // 相手が既に自分へ申請済みなら、そのまま成立させる
    if (pending.requester_id === toId) {
      await acceptFriendRequest(fromId, toId);
      return "ok";
    }
    return "exists";
  }

  await db.prepare(
    "INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?,?,?,?,?)"
  ).run(randomUUID(), fromId, toId, "pending", Date.now());
  return "ok";
}

export async function acceptFriendRequest(meId: string, requesterId: string): Promise<void> {
  await getDb()
    .prepare(
      "UPDATE friendships SET status='accepted' WHERE requester_id=? AND addressee_id=? AND status='pending'"
    )
    .run(requesterId, meId);
}

export async function declineFriendRequest(meId: string, requesterId: string): Promise<void> {
  await getDb()
    .prepare(
      "DELETE FROM friendships WHERE requester_id=? AND addressee_id=? AND status='pending'"
    )
    .run(requesterId, meId);
}

export async function removeFriend(meId: string, otherId: string): Promise<void> {
  await getDb()
    .prepare(
      `DELETE FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .run(meId, otherId, otherId, meId);
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  return !!(await getDb()
    .prepare(
      `SELECT 1 FROM friendships WHERE status='accepted'
       AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`
    )
    .get(a, b, b, a));
}

export async function listFriends(meId: string): Promise<Brief[]> {
  const rows = await getDb()
    .prepare(
      `SELECT CASE WHEN requester_id=? THEN addressee_id ELSE requester_id END AS other
       FROM friendships WHERE status='accepted' AND (requester_id=? OR addressee_id=?)`
    )
    .all<{ other: string }>(meId, meId, meId);
  return Promise.all(rows.map((r) => brief(r.other)));
}

export async function listIncoming(meId: string): Promise<Brief[]> {
  const rows = await getDb()
    .prepare("SELECT requester_id FROM friendships WHERE addressee_id=? AND status='pending'")
    .all<{ requester_id: string }>(meId);
  return Promise.all(rows.map((r) => brief(r.requester_id)));
}

export async function listOutgoing(meId: string): Promise<Brief[]> {
  const rows = await getDb()
    .prepare("SELECT addressee_id FROM friendships WHERE requester_id=? AND status='pending'")
    .all<{ addressee_id: string }>(meId);
  return Promise.all(rows.map((r) => brief(r.addressee_id)));
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
  spendLabel?: string;
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

export async function sendMessage(
  fromId: string,
  toId: string,
  body: string
): Promise<"ok" | "notfriends" | "empty"> {
  const text = body.trim();
  if (!text) return "empty";
  if (!(await areFriends(fromId, toId))) return "notfriends";
  await getDb()
    .prepare(
      "INSERT INTO messages (id, sender_id, recipient_id, body, created_at) VALUES (?,?,?,?,?)"
    )
    .run(randomUUID(), fromId, toId, text.slice(0, 2000), Date.now());
  return "ok";
}

/** アルバムの記録を、任意のコメント付きでフレンドに共有する。 */
export async function shareRecord(
  fromId: string,
  toId: string,
  record: SharedRecord,
  comment: string
): Promise<"ok" | "notfriends" | "invalid"> {
  if (!record || !record.photo || !record.dishNameJa) return "invalid";
  if (!(await areFriends(fromId, toId))) return "notfriends";
  // 写真が自前ストアの画像なら、受信者に閲覧権を付与する
  const m = /^\/api\/images\/([\w-]+)$/.exec(record.photo);
  if (m) await grantImageAccess(m[1], toId);
  await getDb()
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

export async function listMessages(meId: string, otherId: string): Promise<ChatMessage[]> {
  if (!(await areFriends(meId, otherId))) return [];
  const rows = await getDb()
    .prepare(
      `SELECT id, sender_id, body, created_at, record FROM messages
       WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
       ORDER BY created_at ASC LIMIT 500`
    )
    .all<{
      id: string;
      sender_id: string;
      body: string;
      created_at: number;
      record: string | null;
    }>(meId, otherId, otherId, meId);
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

export async function listConversations(meId: string): Promise<Conversation[]> {
  const friends = await listFriends(meId);
  const db = getDb();
  const conversations = await Promise.all(
    friends.map(async (f) => {
      const last = await db
        .prepare(
          `SELECT sender_id, body, created_at, record FROM messages
           WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
           ORDER BY created_at DESC LIMIT 1`
        )
        .get<{ sender_id: string; body: string; created_at: number; record: string | null }>(
          meId,
          f.id,
          f.id,
          meId
        );
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
  );
  return conversations.sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
}
