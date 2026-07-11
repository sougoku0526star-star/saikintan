import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/user";
import { getImage, canAccessImage } from "@/lib/server/images-db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const img = await getImage(params.id);
  if (!img) return new NextResponse("not found", { status: 404 });
  // 所有者、または共有で閲覧を許可されたユーザーのみ
  if (!(await canAccessImage(params.id, await getUserId()))) {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
