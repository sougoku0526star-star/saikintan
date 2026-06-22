"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, MapPin, Flame, Send, MessageCircle } from "lucide-react";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { fetchFriends, shareRecord, type Brief, type SharedRecord } from "@/lib/friends";

// 記録をフレンドへ共有するボトムシート。
export default function ShareSheet({
  record,
  onClose,
}: {
  record: SharedRecord;
  onClose: () => void;
}) {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [friends, setFriends] = useState<Brief[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null); // 送信先username

  useEffect(() => {
    fetchMe().then((u) => {
      setMe(u);
      if (u) fetchFriends().then((f) => setFriends(f?.friends ?? []));
    });
  }, []);

  const send = async () => {
    if (!selected || sending) return;
    setSending(true);
    const res = await shareRecord(selected, comment, record);
    setSending(false);
    if (res.ok) {
      const f = friends.find((x) => x.id === selected);
      setDone(f?.username ?? "フレンド");
      setTimeout(onClose, 1100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 背景 */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* シート */}
      <div className="relative w-full max-w-[440px] animate-fade-up rounded-t-3xl bg-paper px-5 pb-8 pt-4 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">この記録を共有</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ink/60 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 記録プレビュー */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-black/[0.05]">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={record.photo} alt={record.dishNameJa} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[14px] text-ink">{record.dishNameJa}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-ink/45">
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {record.location.split("·").pop()?.trim()}
              </span>
              {typeof record.calories === "number" && (
                <span className="flex shrink-0 items-center gap-0.5">
                  <Flame className="h-3 w-3" />
                  {record.calories}kcal
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 状態別の本文 */}
        {me === undefined ? (
          <p className="py-8 text-center text-[13px] text-ink/40">読み込み中…</p>
        ) : !me ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-ink/55">共有するにはログインが必要です</p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream"
            >
              ログイン / 新規登録
            </Link>
          </div>
        ) : done ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage text-cream">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-[14px] text-ink">@{done} に送りました</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto mb-3 h-7 w-7 text-ink/25" />
            <p className="text-[13px] text-ink/55">まだフレンドがいません</p>
            <Link
              href="/messages"
              className="mt-4 inline-block rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream"
            >
              フレンドを探す
            </Link>
          </div>
        ) : (
          <>
            {/* 送り先 */}
            <p className="mb-2 mt-5 text-[12px] text-ink/55">送り先を選ぶ</p>
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {friends.map((f) => {
                const active = selected === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelected(f.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                      active ? "bg-clay/10 ring-1 ring-clay/40" : "bg-white/60 ring-1 ring-black/[0.04]"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/15 font-serif text-[14px] text-clay">
                      {(f.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-[13px] text-ink">@{f.username}</span>
                    {active && <Check className="h-4 w-4 text-clay" />}
                  </button>
                );
              })}
            </div>

            {/* コメント */}
            <p className="mb-2 mt-5 text-[12px] text-ink/55">ひとこと添える（任意）</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="ここ美味しかったよ！など"
              className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] text-ink focus:border-clay focus:outline-none"
            />

            <button
              onClick={send}
              disabled={!selected || sending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {sending ? "送信中…" : "送信"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
