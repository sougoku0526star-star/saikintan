// ユーザー識別。ログイン中はアカウントID、未ログインは匿名Cookieのuid。
// この関数の戻り値で records / dictionary / settings / images すべてがスコープされる。
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSessionUserId, getUserById, type AuthUser } from "./auth-db";

const ANON = "uid";
export const SESSION_COOKIE = "sid";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

/** データのスコープに使うID（ログイン中はアカウント、未ログインは匿名）。 */
export function getUserId(): string {
  const jar = cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) {
    const uid = getSessionUserId(sid);
    if (uid) return uid;
  }
  const existing = jar.get(ANON)?.value;
  if (existing) return existing;
  const uid = randomUUID();
  jar.set(ANON, uid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TWO_YEARS,
  });
  return uid;
}

/** ログイン中のユーザー（未ログインは null）。 */
export function getAuthUser(): AuthUser | null {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const uid = getSessionUserId(sid);
  if (!uid) return null;
  return getUserById(uid) ?? null;
}

/** 現在の匿名uid（あれば）。サインアップ時のデータ引き継ぎに使う。 */
export function getAnonUid(): string | undefined {
  return cookies().get(ANON)?.value;
}
