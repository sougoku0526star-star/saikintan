// ご飯君メッセージの型＋クライアント用フェッチ（サーバー専用コードを含めない）。
// 発火判定エンジンは lib/server/gohankun-messages.ts 側。

export type GohankunMessageKind =
  | "record_reminder"
  | "weekly_ready"
  | "budget_alert"
  | "praise";

export interface GohankunMessage {
  id: string;
  kind: GohankunMessageKind;
  text: string;
  createdAt: string; // ISO
  read: boolean;
  cta?: { label: string; href: string };
}

export async function fetchGohankunMessages(): Promise<GohankunMessage[]> {
  try {
    const res = await fetch("/api/gohankun/messages", { cache: "no-store" });
    const data = await res.json();
    return Array.isArray(data.messages) ? (data.messages as GohankunMessage[]) : [];
  } catch {
    return [];
  }
}

export async function markGohankunRead(id?: string): Promise<void> {
  try {
    await fetch("/api/gohankun/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
  } catch {
    /* 既読化失敗は致命的でないので握りつぶす */
  }
}
