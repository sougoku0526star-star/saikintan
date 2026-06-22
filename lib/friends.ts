// フレンド＋メッセージのクライアントAPI。
export interface Brief {
  id: string;
  username: string | null;
}
export interface Conversation {
  user: Brief;
  lastBody: string | null;
  lastAt: number | null;
  fromMe: boolean;
}
export interface SharedRecord {
  recordId: string;
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
  record?: SharedRecord;
}

async function getJson(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
async function postJson(path: string, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function fetchFriends(): Promise<{
  friends: Brief[];
  incoming: Brief[];
  outgoing: Brief[];
} | null> {
  return getJson("/api/friends");
}

export async function sendFriendRequest(username: string) {
  const { ok, data } = await postJson("/api/friends/request", { username });
  return { ok, error: data.error as string | undefined };
}

export async function respondRequest(requesterId: string, action: "accept" | "decline") {
  await postJson("/api/friends/respond", { requesterId, action });
}

export async function removeFriend(userId: string) {
  await postJson("/api/friends/remove", { userId });
}

export async function fetchConversations(): Promise<Conversation[]> {
  const d = await getJson("/api/conversations");
  return d?.conversations ?? [];
}

export async function fetchThread(
  withId: string
): Promise<{ friend: Brief; messages: ChatMessage[] } | null> {
  return getJson(`/api/messages?with=${encodeURIComponent(withId)}`);
}

export async function sendMessage(to: string, body: string) {
  const { ok, data } = await postJson("/api/messages", { to, body });
  return { ok, error: data.error as string | undefined };
}

// 記録をコメント付きで共有する
export async function shareRecord(to: string, comment: string, record: SharedRecord) {
  const { ok, data } = await postJson("/api/messages", { to, body: comment, record });
  return { ok, error: data.error as string | undefined };
}
