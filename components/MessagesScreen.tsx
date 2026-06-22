"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, UserPlus, Check, X, MessageCircle, ChevronRight } from "lucide-react";
import { fetchMe, searchUsers, AUTH_UPDATED, type AuthUser } from "@/lib/auth";
import {
  fetchFriends,
  fetchConversations,
  sendFriendRequest,
  respondRequest,
  type Brief,
  type Conversation,
} from "@/lib/friends";

export default function MessagesScreen() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<{ friends: Brief[]; incoming: Brief[]; outgoing: Brief[] }>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; username: string }[]>([]);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    const f = await fetchFriends();
    if (f) setData(f);
    setConvos(await fetchConversations());
  }, []);

  useEffect(() => {
    const load = () =>
      fetchMe().then((u) => {
        setMe(u);
        if (u) refresh();
      });
    load();
    window.addEventListener(AUTH_UPDATED, load);
    return () => window.removeEventListener(AUTH_UPDATED, load);
  }, [refresh]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchUsers(q);
      if (!cancelled) setResults(r);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const request = async (username: string) => {
    setNote("");
    const res = await sendFriendRequest(username);
    if (!res.ok) setNote(res.error || "申請できませんでした");
    else setNote("申請を送りました");
    refresh();
  };

  const respond = async (id: string, action: "accept" | "decline") => {
    await respondRequest(id, action);
    refresh();
  };

  if (me === undefined) {
    return <div className="px-5 pt-24 text-center text-[13px] text-ink/40">読み込み中…</div>;
  }

  if (!me) {
    return (
      <div className="px-5 pt-14">
        <Header />
        <div className="mt-8 rounded-2xl bg-white/60 p-8 text-center ring-1 ring-black/[0.04]">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-ink/30" />
          <p className="text-[13px] text-ink/55">フレンドとメッセージするにはログインが必要です</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream"
          >
            ログイン / 新規登録
          </Link>
        </div>
      </div>
    );
  }

  const outgoingIds = new Set(data.outgoing.map((u) => u.id));
  const friendIds = new Set(data.friends.map((u) => u.id));

  return (
    <div className="px-5 pt-14">
      <Header />

      {/* 検索（ユーザーID） */}
      <div className="mt-6">
        <div className="flex items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-clay">
          <Search className="h-4 w-4 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toLowerCase())}
            placeholder="ユーザーIDで探す（@なしで入力）"
            autoCapitalize="none"
            className="w-full bg-transparent px-3 py-2.5 text-[14px] text-ink focus:outline-none"
          />
        </div>
        {note && <p className="mt-2 text-[11px] text-clay">{note}</p>}
        {results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {results.map((u) => {
              const isFriend = friendIds.has(u.id);
              const requested = outgoingIds.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-xl bg-white/60 p-2.5 ring-1 ring-black/[0.04]"
                >
                  <Avatar name={u.username} />
                  <span className="flex-1 truncate text-[13px] text-ink">@{u.username}</span>
                  {isFriend ? (
                    <span className="text-[11px] text-sage">フレンド</span>
                  ) : requested ? (
                    <span className="text-[11px] text-ink/40">申請済み</span>
                  ) : (
                    <button
                      onClick={() => request(u.username)}
                      className="flex items-center gap-1 rounded-full bg-clay px-3 py-1.5 text-[11px] font-medium text-cream active:scale-95"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      申請
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 受け取った申請 */}
      {data.incoming.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 text-[12px] text-ink/55">受け取った申請</h2>
          <div className="space-y-1.5">
            {data.incoming.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 rounded-xl bg-white/70 p-2.5 shadow-card ring-1 ring-black/[0.04]"
              >
                <Avatar name={u.username} />
                <span className="flex-1 truncate text-[13px] text-ink">@{u.username}</span>
                <button
                  onClick={() => respond(u.id, "accept")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-cream active:scale-90"
                  aria-label="承認"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => respond(u.id, "decline")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink/50 ring-1 ring-black/10 active:scale-90"
                  aria-label="拒否"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* トーク */}
      <section className="mt-7">
        <h2 className="mb-2 text-[12px] text-ink/55">トーク</h2>
        {convos.length === 0 ? (
          <div className="rounded-2xl bg-white/50 p-8 text-center text-[13px] text-ink/45">
            まだフレンドがいません。ユーザーIDで探して申請しましょう。
          </div>
        ) : (
          <div className="space-y-1.5">
            {convos.map((c) => (
              <Link
                key={c.user.id}
                href={`/messages/${c.user.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-card ring-1 ring-black/[0.04] transition active:scale-[0.99]"
              >
                <Avatar name={c.user.username} big />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[14px] text-ink">@{c.user.username}</p>
                  <p className="truncate text-[12px] text-ink/45">
                    {c.lastBody ? (c.fromMe ? "あなた: " : "") + c.lastBody : "まだメッセージはありません"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink/25" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="h-6" />
    </div>
  );
}

function Header() {
  return (
    <header>
      <p className="text-[12px] tracking-[0.3em] text-clay">MESSAGES</p>
      <h1 className="font-serif text-3xl font-semibold text-ink">メッセージ</h1>
    </header>
  );
}

function Avatar({ name, big }: { name: string | null; big?: boolean }) {
  const ch = (name ?? "?").slice(0, 1).toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-clay/15 font-serif text-clay ${
        big ? "h-10 w-10 text-[15px]" : "h-8 w-8 text-[13px]"
      }`}
    >
      {ch}
    </span>
  );
}
