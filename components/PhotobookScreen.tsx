"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download } from "lucide-react";
import { fetchRecords, ALBUM_UPDATED, type CreatedEntry } from "@/lib/created-store";
import { fetchMe, AUTH_UPDATED, type AuthUser } from "@/lib/auth";
import {
  buildSpreads,
  monthRange,
  formatPeriodLabel,
  type BookPhoto,
  type Spread,
} from "@/lib/photobook";
import GohankunWidget from "./GohankunWidget";
import { buildPrintHtml } from "./photobookPrint";

type Mode = "thisMonth" | "lastMonth" | "custom";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export default function PhotobookScreen() {
  const [records, setRecords] = useState<CreatedEntry[]>([]);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<Mode>("thisMonth");

  const now = useMemo(() => new Date(), []);
  const thisM = useMemo(() => monthRange(now, 0), [now]);
  const lastM = useMemo(() => monthRange(now, -1), [now]);
  const [customStart, setCustomStart] = useState(lastM.start);
  const [customEnd, setCustomEnd] = useState(thisM.end);

  useEffect(() => {
    const load = () => {
      fetchRecords().then(setRecords);
      fetchMe().then(setMe);
    };
    load();
    window.addEventListener(ALBUM_UPDATED, load);
    window.addEventListener(AUTH_UPDATED, load);
    return () => {
      window.removeEventListener(ALBUM_UPDATED, load);
      window.removeEventListener(AUTH_UPDATED, load);
    };
  }, []);

  const { start, end } =
    mode === "thisMonth" ? thisM : mode === "lastMonth" ? lastM : { start: customStart, end: customEnd };

  const nick = me?.nickname ?? me?.username ?? "君";
  const periodLabel = formatPeriodLabel(start, end);
  const title = `${nick}のシンガポールごはん旅日記`;

  const { spreads, photoCount, dayCount } = useMemo(
    () => buildSpreads(records, start, end, nick),
    [records, start, end, nick]
  );

  const download = () => {
    const html = buildPrintHtml({ title, periodLabel, photoCount, dayCount, spreads });
    const w = window.open("", "_blank");
    if (!w) {
      alert("PDF用のウィンドウを開けませんでした。ポップアップを許可してください。");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="px-5 pt-14">
      <header>
        <p className="text-[12px] tracking-[0.3em] text-clay">PHOTO BOOK</p>
        <h1 className="font-serif text-3xl font-semibold text-ink">フォトブック</h1>
        <p className="mt-1 text-[12px] text-ink/50">
          食事と思い出を、1冊の旅日記に。
        </p>
      </header>

      {/* 期間選択 */}
      <div className="mt-6">
        <div className="inline-flex rounded-full bg-ink/[0.06] p-1 text-[12px]">
          {([
            ["thisMonth", "今月分"],
            ["lastMonth", "先月分"],
            ["custom", "カスタム"],
          ] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                mode === m ? "bg-clay text-cream shadow-card" : "text-ink/55"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={customEnd || todayISO()}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px] text-ink focus:border-clay focus:outline-none"
            />
            <span className="text-ink/40">〜</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={todayISO()}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px] text-ink focus:border-clay focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* プレビュー */}
      {photoCount === 0 ? (
        <div className="mt-8 rounded-3xl bg-cream/70 p-8 text-center shadow-soft ring-1 ring-ink/[0.04]">
          <div className="mb-3 flex justify-center">
            <GohankunWidget state="warning" size="md" bubble={false} />
          </div>
          <p className="text-[13px] text-ink/55">
            この期間の写真はまだないみたい…
          </p>
          <p className="mt-1 text-[11px] text-ink/40">
            期間を変えるか、ごはんの記録を増やしてみよう。
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-[12px] text-ink/55">
              {periodLabel}・{dayCount}日・写真{photoCount}枚
            </p>
            <span className="flex items-center gap-1 text-[11px] text-ink/40">
              <BookOpen className="h-3.5 w-3.5" />
              {spreads.length + 1}ページ
            </span>
          </div>

          {/* 本のプレビュー（スクエア） */}
          <div className="mt-3 space-y-5">
            <Cover title={title} periodLabel={periodLabel} photoCount={photoCount} />
            {spreads.map((s, i) => (
              <SpreadCard key={i} spread={s} />
            ))}
          </div>

          {/* ダウンロード */}
          <button
            onClick={download}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3.5 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            PDFにする（印刷 → PDFで保存）
          </button>
          <p className="mt-2 text-center text-[10px] text-ink/35">
            印刷ダイアログで「PDFに保存」を選ぶと1冊のPDFになります。
          </p>
        </>
      )}

      <div className="h-6" />
    </div>
  );
}

function Cover({
  title,
  periodLabel,
  photoCount,
}: {
  title: string;
  periodLabel: string;
  photoCount: number;
}) {
  return (
    <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-cream to-paper p-7 text-center shadow-card ring-1 ring-ink/[0.05]">
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-clay/5" />
      <span className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-sage/5" />
      <GohankunWidget state="proud" size="lg" bubble={false} />
      <p className="mt-3 text-[11px] tracking-[0.3em] text-clay/80">SINGAPORE DIARY</p>
      <h2 className="mt-2 font-serif text-[20px] font-semibold leading-snug text-ink">
        『{title}』
      </h2>
      <p className="mt-3 rounded-full bg-white/70 px-4 py-1 font-serif text-[13px] text-ink/70">
        {periodLabel}
      </p>
      <p className="mt-3 text-[11px] text-ink/45">{photoCount}枚のごはんと思い出</p>
    </div>
  );
}

function SpreadCard({ spread }: { spread: Spread }) {
  return (
    <div className="flex aspect-square flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink/[0.05]">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-serif text-[12px] text-ink/55">{spread.dateLabel}</span>
        <span className="text-[10px] tracking-widest text-clay/60">MEMORY</span>
      </div>
      {/* 写真グリッド */}
      <div className="min-h-0 flex-1 px-3 py-2">
        <PhotoGrid photos={spread.photos} />
      </div>
      {/* ごはんくんのまとめコメント */}
      <div className="flex items-end gap-2 px-3 pb-3">
        <GohankunWidget state={spread.mascot} size="sm" bubble={false} />
        <div className="flex-1 rounded-2xl rounded-bl-md bg-cream px-3 py-2 text-[11px] leading-relaxed text-ink/80 ring-1 ring-ink/[0.05]">
          {spread.comment}
        </div>
      </div>
    </div>
  );
}

// 枚数に応じたスクラップブック風グリッド
function PhotoGrid({ photos }: { photos: BookPhoto[] }) {
  const n = photos.length;
  const img = (p: BookPhoto, extra = "") => (
    <div
      key={p.src}
      className={`overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/[0.05] ${extra}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
    </div>
  );

  if (n === 1) return <div className="h-full">{img(photos[0])}</div>;
  if (n === 2)
    return <div className="grid h-full grid-cols-2 gap-2">{photos.map((p) => img(p))}</div>;
  if (n === 3)
    return (
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
        {img(photos[0], "col-span-2")}
        {img(photos[1])}
        {img(photos[2])}
      </div>
    );
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">{photos.map((p) => img(p))}</div>
  );
}
