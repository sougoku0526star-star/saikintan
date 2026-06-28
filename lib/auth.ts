// 認証のクライアントAPI。
import { ALBUM_UPDATED } from "./created-store";
import { SETTINGS_UPDATED } from "./settings";

export const AUTH_UPDATED = "saikintan:auth-updated";

export interface AuthUser {
  email: string;
  username: string | null;
  nickname: string | null;
  emailVerified: boolean;
}

// ログイン状態が変わると、ユーザーのスコープ（記録・予算など）が変わるので全体を再取得させる
function broadcast() {
  if (typeof window === "undefined") return;
  for (const ev of [AUTH_UPDATED, ALBUM_UPDATED, SETTINGS_UPDATED]) {
    window.dispatchEvent(new Event(ev));
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).user ?? null;
  } catch {
    return null;
  }
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

export async function signup(email: string, password: string) {
  const { ok, data } = await postJson("/api/auth/signup", { email, password });
  if (!ok) return { error: data.error || "登録に失敗しました" };
  broadcast();
  return { user: data.user, devVerifyUrl: data.devVerifyUrl as string | undefined };
}

export async function login(email: string, password: string) {
  const { ok, data } = await postJson("/api/auth/login", { email, password });
  if (!ok) return { error: data.error || "ログインに失敗しました" };
  broadcast();
  return { user: data.user };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  broadcast();
}

export async function verifyEmail(token: string) {
  const { ok, data } = await postJson("/api/auth/verify", { token });
  if (ok) broadcast();
  return { ok, error: data.error as string | undefined };
}

export async function resendVerification() {
  const { ok, data } = await postJson("/api/auth/resend", {});
  return { ok, devUrl: data.devUrl as string | undefined };
}

export async function forgotPassword(email: string) {
  const { data } = await postJson("/api/auth/forgot", { email });
  return { ok: true, devUrl: data.devUrl as string | undefined };
}

export async function resetPassword(token: string, password: string) {
  const { ok, data } = await postJson("/api/auth/reset", { token, password });
  return { ok, error: data.error as string | undefined };
}

export async function setUsername(username: string) {
  const { ok, data } = await postJson("/api/account/username", { username });
  if (ok) broadcast();
  return { ok, error: data.error as string | undefined, username: data.username as string | undefined };
}

export async function setNickname(nickname: string) {
  const { ok, data } = await postJson("/api/account/nickname", { nickname });
  if (ok) broadcast();
  return { ok, error: data.error as string | undefined, nickname: data.nickname as string | null | undefined };
}

export async function searchUsers(q: string): Promise<{ id: string; username: string }[]> {
  try {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).users ?? [];
  } catch {
    return [];
  }
}
