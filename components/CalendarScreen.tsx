"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, MapPin, Map as MapIcon } from "lucide-react";
import { fetchRecords, ALBUM_UPDATED, type CreatedEntry } from "@/lib/created-store";

// 地図はクライアント専用（SSRしない）
const FoodMap = dynamic(() => import("./FoodMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[12px] text-ink/40">
      地図を読み込み中…
    </div>
  ),
});

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() {
  return fmt(new Date());
}

export default function CalendarScreen() {
  const [records, setRecords] = useState<CreatedEntry[]>([]);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return fmt(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [selected, setSelected] = useState(todayISO());

  useEffect(() => {
    const load = () => fetchRecords().then(setRecords);
    load();
    window.addEventListener(ALBUM_UPDATED, load);
    return () => window.removeEventListener(ALBUM_UPDATED, load);
  }, []);

  // 日付 -> 記録
  const byDate = useMemo(() => {
    const map: Record<string, CreatedEntry[]> = {};
    for (const r of records) (map[r.meal.date] ??= []).push(r);
    return map;
  }, [records]);

  // カレンダーのセル（月曜始まり）
  const cells = useMemo(() => {
    const first = parse(monthAnchor);
    const lead = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(
      first.getFullYear(),
      first.getMonth() + 1,
      0
    ).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      arr.push(fmt(new Date(first.getFullYear(), first.getMonth(), day)));
    }
    return arr;
  }, [monthAnchor]);

  const monthLabel = (() => {
    const d = parse(monthAnchor);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  })();

  const shiftMonth = (delta: number) => {
    const d = parse(monthAnchor);
    setMonthAnchor(fmt(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
  };

  const selectedRecords = byDate[selected] ?? [];
  const today = todayISO();

  return (
    <div className="px-5 pt-14">
      <header className="mb-6">
        <p className="text-[12px] tracking-[0.3em] text-clay">CALENDAR</p>
        <h1 className="font-serif text-3xl font-semibold text-ink">カレンダー</h1>
      </header>

      {/* 月ナビ */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="前の月"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-serif text-lg text-ink">{monthLabel}</span>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="次の月"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card active:scale-90"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* カレンダー */}
      <div className="rounded-2xl bg-white/60 p-3 shadow-card ring-1 ring-black/[0.04]">
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-ink/40">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) =>
            iso === null ? (
              <div key={`b${i}`} />
            ) : (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] transition ${
                  selected === iso
                    ? "bg-clay text-cream"
                    : iso === today
                      ? "bg-clay/10 text-ink"
                      : "text-ink/70 hover:bg-ink/[0.04]"
                }`}
              >
                {parse(iso).getDate()}
                {byDate[iso] && (
                  <span
                    className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                      selected === iso ? "bg-cream" : "bg-clay"
                    }`}
                  />
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* 食べた場所マップ */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 font-serif text-lg text-ink">
          <MapIcon className="h-4 w-4 text-clay" />
          食べた場所
        </h2>
        <div className="h-72 overflow-hidden rounded-2xl shadow-card ring-1 ring-black/[0.06]">
          <FoodMap records={records} selectedDate={selected} />
        </div>
      </div>

      {/* 選択日の記録 */}
      <div className="mt-6">
        <h2 className="mb-3 font-serif text-lg text-ink">
          {parse(selected).getMonth() + 1}月{parse(selected).getDate()}日
          <span className="ml-2 text-[12px] text-ink/40">
            {selectedRecords.length}件の記録
          </span>
        </h2>

        {selectedRecords.length === 0 ? (
          <div className="rounded-2xl bg-white/50 p-8 text-center text-[13px] text-ink/45">
            この日の記録はありません
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {selectedRecords.map((e) => {
              const m = e.meal;
              return (
                <Link
                  key={e.id}
                  href={`/entry/${e.id}`}
                  className="group block rounded-[4px] bg-white p-2 pb-3 shadow-card transition-transform duration-300 hover:-translate-y-1"
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
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
