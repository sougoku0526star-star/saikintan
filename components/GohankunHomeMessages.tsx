"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, Clock } from "lucide-react";
import GohankunWidget, { type GohankunState } from "./GohankunWidget";
import {
  fetchGohankunMessages,
  markGohankunRead,
  type GohankunMessage,
  type GohankunMessageKind,
} from "@/lib/gohankun-messages";

// 種類ごとの見た目（受信箱のチップ色＋ご飯君の表情）。
const KIND_META: Record<
  GohankunMessageKind,
  { label: string; chip: string; state: GohankunState }
> = {
  weekly_ready: { label: "ふりかえり", chip: "bg-gold/15 text-gold", state: "proud" },
  budget_alert: { label: "予算メモ", chip: "bg-clay/12 text-clay", state: "thinking" },
  praise: { label: "ほめ", chip: "bg-sage/15 text-sage", state: "happy" },
  record_reminder: { label: "おしらせ", chip: "bg-ink/8 text-ink/60", state: "warning" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "さっき";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

// ホームのご飯君あいさつ＋受信箱（P0-2）。
// 未読があれば最新1件を吹き出しで表示し、ベルから過去メッセージ一覧を開ける。
export default function GohankunHomeMessages() {
  const [messages, setMessages] = useState<GohankunMessage[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchGohankunMessages().then(setMessages);
  }, []);

  const unread = messages.filter((m) => !m.read);
  const latest = unread[0]; // APIは新しい順
  const meta = latest ? KIND_META[latest.kind] : null;

  const openInbox = () => {
    setOpen(true);
    if (unread.length) {
      markGohankunRead(); // 受信箱を開いたら全既読
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    }
  };

  return (
    <div className="mb-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <GohankunWidget
            state={meta ? meta.state : "welcome"}
            size="sm"
            message={latest ? latest.text : undefined}
          />
          {latest?.cta && (
            <Link
              href={latest.cta.href}
              className="mt-2 inline-flex items-center rounded-full bg-clay px-4 py-1.5 text-[12px] text-cream shadow-card transition active:scale-95"
            >
              {latest.cta.label}
            </Link>
          )}
        </div>

        <button
          onClick={openInbox}
          aria-label="ご飯君からのおしらせ"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card backdrop-blur transition active:scale-95"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-medium text-cream ring-2 ring-paper">
              {unread.length}
            </span>
          )}
        </button>
      </div>

      {open && (
        <Inbox
          messages={messages}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function Inbox({
  messages,
  onClose,
}: {
  messages: GohankunMessage[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] max-h-[80vh] animate-fade-up overflow-y-auto rounded-t-3xl bg-paper px-5 pb-8 pt-4 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">ごはんくんから</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ink/60 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink/40">
            まだおしらせはないよ。また来るね！
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const meta = KIND_META[m.kind];
              return (
                <li
                  key={m.id}
                  className="rounded-2xl bg-white/70 p-4 shadow-card ring-1 ring-black/[0.03]"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-ink/35">
                      <Clock className="h-2.5 w-2.5" />
                      {relTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/80">
                    {m.text}
                  </p>
                  {m.cta && (
                    <Link
                      href={m.cta.href}
                      onClick={onClose}
                      className="mt-2.5 inline-flex items-center rounded-full bg-clay px-4 py-1.5 text-[12px] text-cream transition active:scale-95"
                    >
                      {m.cta.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
