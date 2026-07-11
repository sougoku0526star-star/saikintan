// 画像のオブジェクトストア。
// 旧実装は画像本体を .data/images/<id> にファイルとして保存していたが、
// Vercelのサーバーレス関数はローカルファイルへの書き込みができない（読み取り専用FS）ため、
// 画像バイト列も DB（images.data の BLOB カラム / libSQL・Turso）に直接保存する。
// 記録には base64 ではなく URL（/api/images/<id>）だけを持たせる。
// ※ この層を差し替えれば S3 / Vercel Blob 等のオブジェクトストレージへ移行できる。
import { getDb } from "./pg";
import { randomUUID } from "node:crypto";

/**
 * data:URL を受け取り、画像ストアへ保存して公開URLを返す。
 * data:URL でなければ null（既存URLはそのまま使う想定）。
 */
export async function saveDataUrl(userId: string, dataUrl: string): Promise<string | null> {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  const id = randomUUID();
  await getDb()
    .prepare(
      "INSERT INTO images (id, user_id, mime, data, created_at) VALUES (?,?,?,?,?)"
    )
    .run(id, userId, mime, buf, Date.now());
  return `/api/images/${id}`;
}

/** 共有時：所有者以外のユーザーに、この画像の閲覧を許可する。 */
export async function grantImageAccess(imageId: string, userId: string): Promise<void> {
  await getDb()
    .prepare(
      "INSERT INTO image_grants (image_id, user_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING"
    )
    .run(imageId, userId, Date.now());
}

/** 閲覧可否：所有者、または共有で許可されたユーザー。 */
export async function canAccessImage(imageId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const row = await db
    .prepare("SELECT user_id FROM images WHERE id = ?")
    .get<{ user_id: string }>(imageId);
  if (!row) return false;
  if (row.user_id === userId) return true;
  return !!(await db
    .prepare("SELECT 1 FROM image_grants WHERE image_id = ? AND user_id = ?")
    .get(imageId, userId));
}

export interface StoredImage {
  bytes: Buffer;
  mime: string;
  userId: string;
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const row = await getDb()
    .prepare("SELECT user_id, mime, data FROM images WHERE id = ?")
    .get<{ user_id: string; mime: string; data: ArrayBuffer }>(id);
  if (!row) return undefined;
  // libSQL は BLOB を ArrayBuffer で返すので Buffer に変換する。
  return { bytes: Buffer.from(row.data as ArrayBuffer), mime: row.mime, userId: row.user_id };
}
