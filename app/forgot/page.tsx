"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    const res = await forgotPassword(email);
    setBusy(false);
    setDevUrl(res.devUrl ?? null);
    setSent(true);
  };

  return (
    <div className="px-5 pt-5">
      <div className="flex items-center">
        <Link
          href="/login"
          aria-label="戻る"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card backdrop-blur active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {sent ? (
        <div className="mt-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">送信しました</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-ink/50">
            登録済みのメールアドレスなら、再設定用のリンクを送りました。
          </p>
          {devUrl && (
            <div className="mx-auto mt-5 max-w-[320px] rounded-xl bg-clay/5 p-3 text-left">
              <p className="mb-1 text-[10px] text-clay/70">開発用リンク</p>
              <Link href={devUrl} className="break-all text-[11px] text-clay underline">
                {devUrl}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10">
          <h1 className="font-serif text-2xl font-semibold text-ink">パスワードの再設定</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-ink/50">
            登録したメールアドレスに、再設定リンクを送ります。
          </p>
          <div className="mt-6 flex items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-clay">
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
          <button
            onClick={submit}
            disabled={busy || !email.includes("@")}
            className="mt-4 w-full rounded-2xl bg-clay py-3.5 text-[14px] font-medium text-cream shadow-card active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "送信中…" : "再設定リンクを送る"}
          </button>
        </div>
      )}
    </div>
  );
}
