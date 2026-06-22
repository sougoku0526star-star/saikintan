"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, AlertCircle } from "lucide-react";
import { verifyEmail } from "@/lib/auth";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-20 text-center text-[13px] text-ink/45">確認中…</div>}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("リンクが正しくありません");
      return;
    }
    verifyEmail(token).then((r) => {
      if (r.ok) setState("ok");
      else {
        setState("error");
        setError(r.error || "確認に失敗しました");
      }
    });
  }, [token]);

  return (
    <div className="px-5 pt-5">
      <div className="mt-20 text-center">
        {state === "loading" && (
          <p className="text-[13px] text-ink/45">確認中…</p>
        )}
        {state === "ok" && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink">確認できました</h1>
            <p className="mt-2 text-[12px] text-ink/50">メールアドレスの確認が完了しました。</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-clay/15 text-clay">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink">確認できませんでした</h1>
            <p className="mt-2 text-[12px] text-ink/50">{error}</p>
          </>
        )}
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-clay px-6 py-3 text-[14px] font-medium text-cream shadow-card active:scale-[0.98]"
        >
          アプリへ
        </Link>
      </div>
    </div>
  );
}
