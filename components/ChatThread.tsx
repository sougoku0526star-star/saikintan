"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, MapPin, Flame, Coins } from "lucide-react";
import {
  fetchThread,
  sendMessage,
  type Brief,
  type ChatMessage,
  type SharedRecord,
} from "@/lib/friends";
import GohankunWidget from "./GohankunWidget";

export default function ChatThread({ id }: { id: string }) {
  const [friend, setFriend] = useState<Brief | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const data = await fetchThread(id);
    if (!data) {
      setState("forbidden");
      return;
    }
    setFriend(data.friend);
    setMessages((prev) => {
      // 末尾が変わったときだけ更新（不要な再描画を避ける）
      if (prev.length === data.messages.length && prev.at(-1)?.id === data.messages.at(-1)?.id) {
        return prev;
      }
      return data.messages;
    });
    setState("ok");
  };

  // 初回＋4秒ごとにポーリング
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");
    const res = await sendMessage(id, text);
    if (!res.ok) setBody(text); // 失敗時は戻す
    await load();
    setSending(false);
  };

  if (state === "forbidden") {
    return (
      <div className="px-5 pt-24 text-center">
        <div className="mb-4 flex justify-center">
          <GohankunWidget state="warning" size="lg" bubble={false} />
        </div>
        <p className="font-serif text-lg text-ink/70">表示できません</p>
        <p className="mt-2 text-[12px] text-ink/45">フレンドのみメッセージできます。</p>
        <Link href="/messages" className="mt-6 inline-block rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream">
          メッセージへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/5 bg-paper/95 px-4 py-3 backdrop-blur">
        <Link
          href="/messages"
          aria-label="戻る"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay/15 font-serif text-[14px] text-clay">
          {(friend?.username ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <p className="font-serif text-[15px] text-ink">@{friend?.username ?? ""}</p>
      </div>

      {/* メッセージ */}
      <div className="space-y-2 px-4 py-4 pb-24">
        {messages.length === 0 && state === "ok" && (
          <p className="py-10 text-center text-[12px] text-ink/40">
            最初のメッセージを送ってみましょう
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
            <div className="flex max-w-[80%] flex-col gap-1">
              {/* 共有された記録カード */}
              {m.record && <RecordCard record={m.record} fromMe={m.fromMe} />}
              {/* コメント / 本文（記録のみで本文が無ければ非表示） */}
              {m.body && (
                <div
                  className={`rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
                    m.fromMe
                      ? "self-end rounded-br-md bg-clay text-cream"
                      : "self-start rounded-bl-md bg-white text-ink ring-1 ring-black/[0.05]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              )}
              <p
                className={`text-[9px] text-ink/35 ${m.fromMe ? "text-right" : "text-left"}`}
              >
                {new Date(m.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力（画面下部に固定） */}
      <div className="fixed inset-x-0 bottom-0 left-1/2 z-20 w-full max-w-[440px] -translate-x-1/2 border-t border-black/5 bg-cream/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="メッセージを入力"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-3 py-2 text-[14px] text-ink focus:border-clay focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            aria-label="送信"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay text-cream shadow-card transition active:scale-90 disabled:opacity-40"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// チャット内に表示する、共有された記録カード
function RecordCard({ record, fromMe }: { record: SharedRecord; fromMe: boolean }) {
  return (
    <div
      className={`w-56 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/[0.06] ${
        fromMe ? "self-end" : "self-start"
      }`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={record.photo} alt={record.dishNameJa} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="text-[10px] tracking-[0.15em] text-clay/80">
          {record.timeLabel.toUpperCase()}
        </p>
        <p className="mt-0.5 font-serif text-[14px] leading-snug text-ink">
          {record.dishNameJa}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink/45">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{record.location.split("·").pop()?.trim()}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink/60">
          {typeof record.calories === "number" && (
            <span className="flex items-center gap-0.5 rounded-full bg-clay/8 px-2 py-0.5 text-clay">
              <Flame className="h-3 w-3" />
              {record.calories} kcal
            </span>
          )}
          {record.spendLabel && (
            <span className="flex items-center gap-0.5 rounded-full bg-gold/10 px-2 py-0.5 text-gold">
              <Coins className="h-3 w-3" />
              {record.spendLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
