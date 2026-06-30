"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, ChevronLeft, ChevronRight } from "lucide-react";
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

  // ブックのページ送り（0=表紙, 1..N=見開き）
  const totalViews = spreads.length + 1;
  const [view, setView] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => setView(0), [start, end]);
  const go = (delta: 1 | -1) => {
    setDir(delta);
    setView((v) => Math.min(totalViews - 1, Math.max(0, v + delta)));
  };

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
        <p className="mt-1 text-[12px] text-ink/50">食事と思い出を、1冊の旅日記に。</p>
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

      {photoCount === 0 ? (
        <div className="mt-8 rounded-3xl bg-cream/70 p-8 text-center shadow-soft ring-1 ring-ink/[0.04]">
          <div className="mb-3 flex justify-center">
            <GohankunWidget state="warning" size="md" bubble={false} />
          </div>
          <p className="text-[13px] text-ink/55">この期間の写真はまだないみたい…</p>
          <p className="mt-1 text-[11px] text-ink/40">期間を変えるか、ごはんの記録を増やしてみよう。</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-[12px] text-ink/55">
              {periodLabel}・{dayCount}日・写真{photoCount}枚
            </p>
            <span className="flex items-center gap-1 text-[11px] text-ink/40">
              <BookOpen className="h-3.5 w-3.5" />
              {view + 1} / {totalViews}
            </span>
          </div>

          {/* 本の見開きビューア */}
          <div className="relative mt-3">
            {/* ページ本体 */}
            <div className="overflow-hidden rounded-[14px] shadow-[0_18px_40px_-16px_rgba(61,49,42,0.45)] ring-1 ring-ink/[0.06]">
              <div key={view} className={dir === 1 ? "animate-book-next" : "animate-book-prev"}>
                {view === 0 ? (
                  <CoverSpread title={title} periodLabel={periodLabel} photoCount={photoCount} />
                ) : (
                  <ContentSpread spread={spreads[view - 1]} />
                )}
              </div>
            </div>

            {/* ナビ（左右） */}
            <NavBtn side="left" disabled={view === 0} onClick={() => go(-1)} />
            <NavBtn side="right" disabled={view === totalViews - 1} onClick={() => go(1)} />
          </div>

          {/* ページインジケータ */}
          <div className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: totalViews }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDir(i >= view ? 1 : -1);
                  setView(i);
                }}
                aria-label={`${i + 1}ページへ`}
                className={`h-1.5 rounded-full transition-all ${
                  i === view ? "w-5 bg-clay" : "w-1.5 bg-ink/15"
                }`}
              />
            ))}
          </div>

          {/* ダウンロード */}
          <button
            onClick={download}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3.5 text-[14px] font-medium text-cream shadow-card transition active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            PDFをダウンロード
          </button>
          <p className="mt-2 text-center text-[10px] text-ink/35">
            印刷ダイアログで「PDFに保存」を選ぶと、正方形ページが連続した1冊のPDFになります。
          </p>
        </>
      )}

      <div className="h-6" />
    </div>
  );
}

// 左右のページめくりボタン（本の外端に配置）
function NavBtn({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "前へ" : "次へ"}
      className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-ink/70 shadow-card ring-1 ring-ink/10 transition active:scale-90 disabled:opacity-0 ${
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      }`}
    >
      {side === "left" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

// 表紙（見開き全面）
function CoverSpread({
  title,
  periodLabel,
  photoCount,
}: {
  title: string;
  periodLabel: string;
  photoCount: number;
}) {
  return (
    <div className="relative flex aspect-[2/1] w-full flex-col items-center justify-center bg-gradient-to-br from-cream to-paper p-5 text-center">
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-clay/5" />
      <span className="pointer-events-none absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-sage/5" />
      <GohankunWidget state="proud" size="md" bubble={false} />
      <p className="mt-2 text-[10px] tracking-[0.3em] text-clay/80">SINGAPORE DIARY</p>
      <h2 className="mt-1.5 max-w-[88%] font-serif text-[16px] font-semibold leading-snug text-ink">
        『{title}』
      </h2>
      <p className="mt-2 rounded-full bg-white/70 px-3 py-0.5 font-serif text-[12px] text-ink/70">
        {periodLabel}
      </p>
      <p className="mt-1.5 text-[10px] text-ink/45">{photoCount}枚のごはんと思い出</p>
    </div>
  );
}

// 中身の見開き（左ページ＋右ページ）
function ContentSpread({ spread }: { spread: Spread }) {
  const n = spread.photos.length;
  // 右ページは「写真1枚＋コメント」、残りは左ページへ（左は最大3枚）
  const leftPhotos = n === 1 ? spread.photos : spread.photos.slice(0, n - 1);
  const rightPhotos = n === 1 ? [] : spread.photos.slice(n - 1);

  return (
    <div className="relative flex aspect-[2/1] w-full bg-paper">
      {/* 左ページ */}
      <div className="relative flex w-1/2 flex-col p-3">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-cream/90 px-2 py-0.5 font-serif text-[9px] text-ink/55 shadow-soft">
          {spread.dateLabel}
        </span>
        <div className="min-h-0 flex-1 pt-5">
          <PageGrid photos={leftPhotos} />
        </div>
      </div>

      {/* 右ページ */}
      <div className="flex w-1/2 flex-col p-3">
        {rightPhotos.length > 0 && (
          <div className="min-h-0 flex-[3]">
            <PageGrid photos={rightPhotos} />
          </div>
        )}
        {/* ごはんくんのまとめコメント（右下の余白に必ず収める） */}
        <div
          className={`flex items-end gap-1.5 ${
            rightPhotos.length > 0 ? "flex-[2] pt-2" : "flex-1 items-center"
          }`}
        >
          <GohankunWidget state={spread.mascot} size="sm" bubble={false} />
          <div className="flex-1 rounded-2xl rounded-bl-md bg-cream px-2.5 py-1.5 text-[9px] leading-relaxed text-ink/80 ring-1 ring-ink/[0.06]">
            {spread.comment}
          </div>
        </div>
      </div>

      {/* 中央の綴じ目シャドウ */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/15 to-transparent" />
      {/* 外端の紙重なり影 */}
      <div className="pointer-events-none absolute inset-y-1.5 left-0 w-2 bg-gradient-to-r from-ink/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-1.5 right-0 w-2 bg-gradient-to-l from-ink/10 to-transparent" />
    </div>
  );
}

// 1ページ内の写真グリッド（1〜3枚）。角丸スクラップブック風。
function PageGrid({ photos }: { photos: BookPhoto[] }) {
  const n = photos.length;
  if (n === 0) return null;
  const cell = (p: BookPhoto, extra = "") => (
    <div key={p.src} className={`overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/[0.06] ${extra}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
    </div>
  );
  if (n === 1) return <div className="h-full">{cell(photos[0])}</div>;
  if (n === 2) return <div className="grid h-full grid-rows-2 gap-1.5">{photos.map((p) => cell(p))}</div>;
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1.5">
      {cell(photos[0], "col-span-2")}
      {cell(photos[1])}
      {cell(photos[2])}
    </div>
  );
}
