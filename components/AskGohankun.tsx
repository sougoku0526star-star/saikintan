"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

// 「ご飯君に聞く」ボタン（P3）。ワンタップで即時提案を1つもらう。
// 自由入力なし・出力1個・1日3回。回答は吹き出しカードで表示、残り回数を小さく出す。
interface Answer {
  suggestion: string;
  reason: string;
}

export default function AskGohankun() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    fetch("/api/suggest")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  const ask = async () => {
    if (loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const d = await fetch("/api/suggest", { method: "POST" }).then((r) => r.json());
      setAnswer({ suggestion: d.suggestion ?? "", reason: d.reason ?? "" });
      if (typeof d.remaining === "number") setRemaining(d.remaining);
    } catch {
      setAnswer({ suggestion: "ごめん、うまく考えられなかった…もう一度きいてみて！", reason: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-7">
      <button
        onClick={ask}
        disabled={loading}
        className="flex w-full items-center justify-between rounded-2xl bg-clay/8 px-4 py-3 text-left ring-1 ring-clay/10 transition active:scale-[0.99] disabled:opacity-70"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-clay">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "ご飯君が考えてるよ…" : "ご飯君に、今日のごはんを聞く"}
        </span>
        {remaining !== null && (
          <span className="shrink-0 text-[11px] text-ink/40">今日あと{remaining}回</span>
        )}
      </button>

      {answer && !loading && (
        <div className="mt-2 animate-fade-up rounded-2xl bg-cream/70 p-4 ring-1 ring-black/[0.04]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-clay/80">
            <Sparkles className="h-3.5 w-3.5" />
            ご飯君のこたえ
          </div>
          <p className="font-serif text-[15px] leading-relaxed text-ink/85">
            {answer.suggestion}
          </p>
          {answer.reason && (
            <p className="mt-2 text-[12px] text-ink/50">💭 {answer.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
