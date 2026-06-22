"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, CalendarDays } from "lucide-react";
import {
  fetchRecords,
  ALBUM_UPDATED,
  type CreatedEntry,
} from "@/lib/created-store";
import GohankunWidget from "./GohankunWidget";

const tilts = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2"];

// アルバムは直近1週間のみ表示（それ以前はカレンダーから）
function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6); // 今日を含めて7日間
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDateHeader(iso: string) {
  const d = new Date(iso);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return {
    label: isToday ? "今日" : `${d.getMonth() + 1}/${d.getDate()}`,
    weekday: days[d.getDay()],
    isToday,
  };
}

// ユーザーが記録した思い出を、選んだ日付ごとにまとめて表示する。
export default function CreatedSection() {
  const [items, setItems] = useState<CreatedEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      fetchRecords().then(setItems);
    };
    refresh();
    window.addEventListener(ALBUM_UPDATED, refresh);
    return () => window.removeEventListener(ALBUM_UPDATED, refresh);
  }, []);

  // 直近1週間だけに絞り込む
  const cutoff = sevenDaysAgoISO();
  const recent = items.filter((e) => e.meal.date >= cutoff);
  const hasOlder = items.length > recent.length;

  // 日付ごとにグルーピング（新しい日付が上）
  const groups: Record<string, CreatedEntry[]> = {};
  for (const e of recent) (groups[e.meal.date] ??= []).push(e);
  const sorted = Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  if (recent.length === 0) {
    return (
      <div className="rounded-3xl bg-cream/70 p-8 text-center shadow-soft ring-1 ring-ink/[0.04]">
        <div className="mb-3 flex justify-center">
          <GohankunWidget state="sad" size="md" bubble={false} />
        </div>
        <p className="text-[13px] text-ink/50">直近1週間の記録はまだありません</p>
        {hasOlder && (
          <Link
            href="/calendar"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-clay px-4 py-2 text-[12px] text-cream"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            カレンダーで過去の記録を見る
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {sorted.map(([date, entries]) => {
        const d = formatDateHeader(date);
        return (
          <section key={date} className="animate-fade-up">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-serif text-2xl font-semibold text-ink">
                {d.label}
              </span>
              <span className="text-[12px] text-ink/45">{d.weekday}曜日</span>
              <span className="ml-auto text-[11px] text-ink/35">
                {entries.length}件の思い出
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {entries.map((e, i) => {
                const m = e.meal;
                return (
                  <Link
                    key={e.id}
                    href={`/entry/${e.id}`}
                    className={`group block rounded-[4px] bg-white p-2 pb-3 shadow-card transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 ${
                      tilts[i % tilts.length]
                    }`}
                  >
                    <div className="aspect-square overflow-hidden rounded-[2px] bg-ink/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.photo}
                        alt={m.dishNameJa}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 truncate font-serif text-[13px] text-ink">
                      {m.dishNameJa}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink/45">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.location.split("·")[0].trim()}</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {hasOlder && (
        <Link
          href="/calendar"
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/50 py-3 text-[12px] text-ink/50 ring-1 ring-black/[0.04] transition hover:text-clay"
        >
          <CalendarDays className="h-4 w-4" />
          それ以前の記録はカレンダーから
        </Link>
      )}
    </div>
  );
}
