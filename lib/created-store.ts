// 食事記録のクライアントAPI。
// 以前は sessionStorage。サーバー(DB)へ永続化し、端末をまたいで残る。
// レコードは料理slugとは別の固有ID(id)を持つ（同じ料理を複数回記録しても衝突しない）。

import type { MealEntry } from "./mock-data";

export interface CreatedEntry {
  id: string; // レコード固有ID
  meal: MealEntry;
  createdAt: number;
}

export const ALBUM_UPDATED = "saikintan:album-updated";
export const OPEN_UPLOAD_EVENT = "saikintan:open-upload";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ALBUM_UPDATED));
  }
}

/** 記録一覧をサーバーから取得（新しい日付順）。 */
export async function fetchRecords(): Promise<CreatedEntry[]> {
  const res = await fetch("/api/records", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records ?? []) as CreatedEntry[];
}

/** 新規記録を追加（サーバーがIDを発行）。 */
export async function addRecord(meal: MealEntry): Promise<CreatedEntry | null> {
  const res = await fetch("/api/records", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ meal, createdAt: Date.now() }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  notify();
  return data.record as CreatedEntry;
}

/** 既存記録を更新（編集・分量調整の保存）。 */
export async function updateRecord(rec: CreatedEntry): Promise<void> {
  await fetch("/api/records", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rec),
  });
  notify();
}

/** 記録を削除。 */
export async function deleteRecord(id: string): Promise<void> {
  await fetch(`/api/records/${encodeURIComponent(id)}`, { method: "DELETE" });
  notify();
}
