"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";
import { resetPassword } from "@/lib/auth";

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-20 text-center text-[13px] text-ink/45">読み込み中…</div>}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    const res = await resetPassword(token, password);
    setBusy(false);
    if (!res.ok) return setError(res.error || "再設定に失敗しました");
    setDone(true);
  };

  return (
    <div className="px-5 pt-5">
      <div className="mt-12 text-center">
        {done ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink">パスワードを変更しました</h1>
            <p className="mt-2 text-[12px] text-ink/50">新しいパスワードでログインしてください。</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 rounded-2xl bg-clay px-6 py-3 text-[14px] font-medium text-cream shadow-card active:scale-[0.98]"
            >
              ログインへ
            </button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-semibold text-ink">新しいパスワード</h1>
            <p className="mt-2 text-[12px] text-ink/50">6文字以上で設定してください。</p>
            <div className="mt-6 flex items-center rounded-xl border border-black/10 bg-white px-3 text-left focus-within:border-clay">
              <Lock className="h-4 w-4 text-ink/40" />
              <input
                type="password"
                placeholder="新しいパスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent px-3 py-3 text-[15px] text-ink focus:outline-none"
              />
            </div>
            {error && (
              <p className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-[12px] text-clay">{error}</p>
            )}
            <button
              onClick={submit}
              disabled={busy || password.length < 6 || !token}
              className="mt-4 w-full rounded-2xl bg-clay py-3.5 text-[14px] font-medium text-cream shadow-card active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "変更中…" : "パスワードを変更"}
            </button>
            <Link href="/login" className="mt-4 block text-[12px] text-ink/45 underline">
              ログインへ戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
