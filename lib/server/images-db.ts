// 画像のオブジェクトストア（ローカル実装）。サーバー専用。
// 画像本体は .data/images/<id> にファイルとして保存し、メタはDBに。
// 記録には base64 ではなく URL（/api/images/<id>）だけを持たせる。
// ※ この層を差し替えれば S3 等のオブジェクトストレージへ移行できる。
import { getDb } from "./sqlite";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

const IMG_DIR = path.join(process.cwd(), ".data", "images");

function dir(): string {
  mkdirSync(IMG_DIR, { recursive: true });
  return IMG_DIR;
}

/**
 * data:URL を受け取り、画像ストアへ保存して公開URLを返す。
 * data:URL でなければ null（既存URLはそのまま使う想定）。
 */
export function saveDataUrl(userId: string, dataUrl: string): string | null {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  const id = randomUUID();
  writeFileSync(path.join(dir(), id), buf);
  getDb()
    .prepare(
      "INSERT INTO images (id, user_id, mime, created_at) VALUES (?,?,?,?)"
    )
    .run(id, userId, mime, Date.now());
  return `/api/images/${id}`;
}

/** 共有時：所有者以外のユーザーに、この画像の閲覧を許可する。 */
export function grantImageAccess(imageId: string, userId: string): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO image_grants (image_id, user_id, created_at) VALUES (?,?,?)"
    )
    .run(imageId, userId, Date.now());
}

/** 閲覧可否：所有者、または共有で許可されたユーザー。 */
export function canAccessImage(imageId: string, userId: string): boolean {
  const row = getDb()
    .prepare("SELECT user_id FROM images WHERE id = ?")
    .get(imageId) as { user_id: string } | undefined;
  if (!row) return false;
  if (row.user_id === userId) return true;
  return !!getDb()
    .prepare("SELECT 1 FROM image_grants WHERE image_id = ? AND user_id = ?")
    .get(imageId, userId);
}

export interface StoredImage {
  bytes: Buffer;
  mime: string;
  userId: string;
}

export function getImage(id: string): StoredImage | undefined {
  const row = getDb()
    .prepare("SELECT user_id, mime FROM images WHERE id = ?")
    .get(id) as { user_id: string; mime: string } | undefined;
  if (!row) return undefined;
  const file = path.join(IMG_DIR, id);
  if (!existsSync(file)) return undefined;
  return { bytes: readFileSync(file), mime: row.mime, userId: row.user_id };
}
