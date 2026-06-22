"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  Check,
  UserCircle,
  LogOut,
  CloudOff,
  AtSign,
  MailCheck,
  MailWarning,
} from "lucide-react";
import {
  fetchMonthlyBudget,
  saveMonthlyBudget,
  weeklyFromMonthly,
  DEFAULT_MONTHLY_BUDGET_SGD,
} from "@/lib/settings";
import {
  fetchMe,
  logout,
  setUsername as setUsernameApi,
  resendVerification,
  AUTH_UPDATED,
  type AuthUser,
} from "@/lib/auth";

export default function SettingsScreen() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unameDraft, setUnameDraft] = useState("");
  const [unameMsg, setUnameMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadBudget = () =>
      fetchMonthlyBudget().then((m) => {
        setDraft(String(m));
        setLoading(false);
      });
    loadBudget();
    window.addEventListener(AUTH_UPDATED, loadBudget);
    return () => window.removeEventListener(AUTH_UPDATED, loadBudget);
  }, []);

  useEffect(() => {
    const loadMe = () =>
      fetchMe().then((u) => {
        setUser(u);
        setUnameDraft(u?.username ?? "");
      });
    loadMe();
    window.addEventListener(AUTH_UPDATED, loadMe);
    return () => window.removeEventListener(AUTH_UPDATED, loadMe);
  }, []);

  const monthly = parseFloat(draft) || 0;

  const save = async () => {
    if (monthly <= 0) return;
    await saveMonthlyBudget(monthly);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const saveUsername = async () => {
    setUnameMsg(null);
    const res = await setUsernameApi(unameDraft);
    if (res.ok) setUnameMsg({ ok: true, text: "保存しました" });
    else setUnameMsg({ ok: false, text: res.error || "保存できませんでした" });
  };

  const resend = async () => {
    setResendMsg("送信中…");
    const res = await resendVerification();
    setResendMsg(res.devUrl ? `送信しました（開発リンク: ${res.devUrl}）` : "確認メールを再送しました");
  };

  return (
    <div className="px-5 pt-5">
      {/* 上部バー */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="戻る"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card backdrop-blur transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-serif text-sm tracking-widest text-ink/40">SETTINGS</span>
        <div className="h-10 w-10" />
      </div>

      <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">設定</h1>

      {/* アカウント */}
      <section className="mt-7">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-ink/55">
          <UserCircle className="h-4 w-4 text-dusk" />
          アカウント
        </div>
        <div className="rounded-2xl bg-white/70 p-5 shadow-card ring-1 ring-black/[0.04]">
          {user ? (
            <>
              <p className="text-[11px] text-ink/45">ログイン中</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="font-serif text-[15px] text-ink">{user.email}</p>
                {user.emailVerified ? (
                  <span className="flex items-center gap-1 rounded-full bg-sage/12 px-2 py-0.5 text-[10px] text-sage">
                    <MailCheck className="h-3 w-3" />
                    確認済み
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[10px] text-clay">
                    <MailWarning className="h-3 w-3" />
                    未確認
                  </span>
                )}
              </div>
              {!user.emailVerified && (
                <div className="mt-2">
                  <button
                    onClick={resend}
                    className="text-[11px] text-clay underline"
                  >
                    確認メールを再送する
                  </button>
                  {resendMsg && (
                    <p className="mt-1 break-all text-[10px] text-ink/45">{resendMsg}</p>
                  )}
                </div>
              )}

              {/* ユーザーID（ハンドル） */}
              <div className="mt-4 border-t border-black/5 pt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink/55">
                  <AtSign className="h-3.5 w-3.5" />
                  ユーザーID（フレンド検索に使われます）
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-lg border border-black/10 bg-white px-3 focus-within:border-clay">
                    <span className="text-[13px] text-ink/40">@</span>
                    <input
                      value={unameDraft}
                      onChange={(e) => {
                        setUnameDraft(e.target.value.toLowerCase());
                        setUnameMsg(null);
                      }}
                      placeholder="your_id"
                      autoCapitalize="none"
                      className="w-full bg-transparent px-2 py-2 text-[14px] text-ink focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={saveUsername}
                    disabled={!unameDraft || unameDraft === user.username}
                    className="rounded-lg bg-clay px-4 py-2 text-[12px] font-medium text-cream active:scale-95 disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
                {unameMsg && (
                  <p className={`mt-1.5 text-[11px] ${unameMsg.ok ? "text-sage" : "text-clay"}`}>
                    {unameMsg.text}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-ink/35">半角英数字と _、3〜20文字</p>
              </div>

              <button
                onClick={() => logout()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-[13px] text-ink/70 ring-1 ring-black/10 transition active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[13px] text-ink/60">
                <CloudOff className="h-4 w-4 text-ink/40" />
                この端末にのみ保存されています
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
                ログインすると、記録や予算を他の端末とも同期できます。
              </p>
              <Link
                href="/login"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-3 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98]"
              >
                ログイン / 新規登録
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 予算 */}
      <section className="mt-7">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-ink/55">
          <Wallet className="h-4 w-4 text-gold" />
          予算
        </div>
        <div className="rounded-2xl bg-white/70 p-5 shadow-card ring-1 ring-black/[0.04]">
          <label className="mb-1.5 block text-[12px] text-ink/55">1か月の予算（S$）</label>
          <div className="flex items-center rounded-lg border border-black/10 bg-white px-3 focus-within:border-clay">
            <span className="text-[14px] text-ink/45">S$</span>
            <input
              type="number"
              inputMode="decimal"
              disabled={loading}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-transparent px-2 py-2.5 text-[16px] text-ink focus:outline-none"
            />
          </div>
          <p className="mt-2 text-[12px] text-ink/45">
            週あたり 約 <span className="font-medium text-ink/70">S${weeklyFromMonthly(monthly)}</span>（月予算 ÷ 4）
          </p>

          <button
            onClick={save}
            disabled={loading || monthly <= 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-3 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98] disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                保存しました
              </>
            ) : (
              "保存する"
            )}
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink/40">
          ふりかえりの「週」表示では月予算の1/4、「月」表示では月予算そのものを使って使用率を計算します。
        </p>
      </section>
    </div>
  );
}
