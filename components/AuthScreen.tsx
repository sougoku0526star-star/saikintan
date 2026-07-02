"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Sparkles, MailCheck } from "lucide-react";
import { signup, login } from "@/lib/auth";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const submit = async () => {
    setError("");
    if (mode === "signup" && password !== password2) {
      setError("パスワードが一致しません");
      return;
    }
    setBusy(true);
    if (mode === "signup") {
      const res = await signup(email, password);
      setBusy(false);
      if (res.error) return setError(res.error);
      setSentTo(email);
      setDevUrl(res.devVerifyUrl ?? null);
      return;
    }
    const res = await login(email, password);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.push("/settings");
  };

  // 確認欄が入力済みで不一致のときだけ警告を出す
  const mismatch = mode === "signup" && password2.length > 0 && password !== password2;
  const canSubmit =
    !!email &&
    password.length >= 6 &&
    (mode === "login" || password === password2);

  // サインアップ後：確認メール送信の案内
  if (sentTo) {
    return (
      <div className="px-5 pt-5">
        <div className="mt-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">確認メールを送りました</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-ink/50">
            <span className="text-ink/70">{sentTo}</span> 宛のメール内のリンクで
            <br />
            メールアドレスを確認してください。
          </p>
          {devUrl && (
            <div className="mx-auto mt-5 max-w-[320px] rounded-xl bg-clay/5 p-3 text-left">
              <p className="mb-1 text-[10px] text-clay/70">開発用リンク（本番ではメールで届きます）</p>
              <Link href={devUrl} className="break-all text-[11px] text-clay underline">
                {devUrl}
              </Link>
            </div>
          )}
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-2xl bg-clay px-6 py-3 text-[14px] font-medium text-cream shadow-card active:scale-[0.98]"
          >
            アプリを始める
          </button>
          <p className="mt-3 text-[11px] text-ink/40">
            確認は後からでもOK（設定から再送できます）
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          aria-label="戻る"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card backdrop-blur transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-serif text-sm tracking-widest text-ink/40">ACCOUNT</span>
        <div className="h-10 w-10" />
      </div>

      <div className="mt-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-clay/15 text-clay">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink">
          {mode === "signup" ? "アカウントを作成" : "ログイン"}
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-ink/50">
          ログインすると、記録や予算を端末をまたいで同期できます。
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-clay">
          <Mail className="h-4 w-4 text-ink/40" />
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-[15px] text-ink focus:outline-none"
          />
        </div>
        <div className="flex items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-clay">
          <Lock className="h-4 w-4 text-ink/40" />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-[15px] text-ink focus:outline-none"
          />
        </div>

        {mode === "signup" && (
          <div>
            <div
              className={`flex items-center rounded-xl border bg-white px-3 focus-within:border-clay ${
                mismatch ? "border-clay/60" : "border-black/10"
              }`}
            >
              <Lock className="h-4 w-4 text-ink/40" />
              <input
                type="password"
                placeholder="パスワード（確認のためもう一度）"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full bg-transparent px-3 py-3 text-[15px] text-ink focus:outline-none"
              />
            </div>
            {mismatch && (
              <p className="mt-1 px-1 text-[11px] text-clay">パスワードが一致しません</p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-clay/10 px-3 py-2 text-[12px] text-clay">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={busy || !canSubmit}
          className="w-full rounded-2xl bg-clay py-3.5 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "処理中…" : mode === "signup" ? "登録して同期を始める" : "ログイン"}
        </button>
      </div>

      {mode === "login" && (
        <Link
          href="/forgot"
          className="mt-4 block text-center text-[12px] text-ink/45 underline"
        >
          パスワードをお忘れですか？
        </Link>
      )}

      <button
        onClick={() => {
          setMode((m) => (m === "signup" ? "login" : "signup"));
          setError("");
          setPassword2("");
        }}
        className="mt-5 w-full text-center text-[12px] text-ink/50"
      >
        {mode === "signup" ? "アカウントをお持ちの方はログイン" : "新規登録はこちら"}
      </button>

      {mode === "signup" && (
        <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-ink/35">
          いま端末に記録した内容は、登録後あなたのアカウントに引き継がれます。
        </p>
      )}
    </div>
  );
}
