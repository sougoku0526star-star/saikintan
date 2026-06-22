// 画像の正規化（クライアント）。
// HEIC/HEIF→JPEG変換＋リサイズで「表示崩れ」と「Vision非対応」を回避する。
// ※ GPS(EXIF)は変換で失われるため、呼び出し側で必ず変換前のFileから読むこと。

export interface PreparedImage {
  dataUrl: string;
  base64: string;
  mime: string;
}

function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

/** HEICならJPEG化し、長辺 maxDim 以内に縮小したJPEGを返す。 */
export async function prepareImage(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<PreparedImage> {
  let blob: Blob = file;

  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality });
      blob = Array.isArray(out) ? out[0] : (out as Blob);
    } catch {
      // 変換失敗時はそのまま（最悪表示は崩れるが処理は続行）
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d ctx");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" };
  } catch {
    // キャンバス処理に失敗したら、変換後blobをそのままdataURL化
    const dataUrl = await readAsDataURL(blob);
    return {
      dataUrl,
      base64: dataUrl.split(",")[1] ?? "",
      mime: blob.type || "image/jpeg",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
