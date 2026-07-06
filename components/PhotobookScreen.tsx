"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Download, ChevronLeft, ChevronRight, MapPin, Feather } from "lucide-react";
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
                  <CoverSpread
                    title={title}
                    periodLabel={periodLabel}
                    photoCount={photoCount}
                    coverPhoto={spreads[0]?.photos[0]?.src}
                  />
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

// 見開きの外枠（左右2ページ＋綴じ目＋端の影）。中身はページ単位で流し込む。
function SpreadFrame({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="relative flex aspect-[2/1] w-full bg-paper">
      <div className="relative w-1/2 overflow-hidden">{left}</div>
      <div className="relative w-1/2 overflow-hidden">{right}</div>
      {/* 中央の綴じ目シャドウ */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/12 to-transparent" />
      {/* 外端の紙重なり影 */}
      <div className="pointer-events-none absolute inset-y-1.5 left-0 w-2 bg-gradient-to-r from-ink/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-1.5 right-0 w-2 bg-gradient-to-l from-ink/10 to-transparent" />
    </div>
  );
}

// 編集キャプション（英字の日付＋場所）。海外雑誌風の細く洗練された表記。
function EditorialCaption({
  dateISO,
  location,
  light = false,
  className = "",
}: {
  dateISO: string;
  location?: string;
  light?: boolean;
  className?: string;
}) {
  const d = new Date(dateISO);
  const en = d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const place = location ? location.split("·")[0].trim() : "";
  return (
    <div className={className}>
      <p className={`font-serif text-[9px] tracking-[0.28em] ${light ? "text-white/90" : "text-ink/45"}`}>
        {en}
      </p>
      {place && (
        <p
          className={`mt-0.5 flex items-center gap-0.5 text-[8.5px] tracking-wide ${
            light ? "text-white/75" : "text-ink/40"
          }`}
        >
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          {place}
        </p>
      )}
    </div>
  );
}

// ごはんくん（名編集者）のワンポイント。1見開き1つだけ、余白にひょっこり。
function EditorNote({
  mascot,
  comment,
  fromLetter = false,
  className = "",
}: {
  mascot: Spread["mascot"];
  comment: string;
  /** comment が思い出レター由来のとき、便箋風に見せて“交換日記”感を出す */
  fromLetter?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-1.5 ${className}`}>
      <GohankunWidget state={mascot} size="xs" bubble={false} />
      <div
        className={`rounded-xl rounded-bl-sm px-2 py-1 text-[8.5px] leading-relaxed shadow-soft ${
          fromLetter
            ? "bg-[#FBF6EC] text-ink/80 ring-1 ring-[#E7D9BE]"
            : "bg-cream/95 text-ink/75 ring-1 ring-ink/[0.06]"
        }`}
      >
        {fromLetter && (
          <span className="mb-0.5 flex items-center gap-0.5 text-[7px] tracking-wide text-clay/70">
            <Feather className="h-2 w-2" />
            思い出レター
          </span>
        )}
        {comment}
      </div>
    </div>
  );
}

function Photo({ p, className = "" }: { p: BookPhoto; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[4px] bg-ink/5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
    </div>
  );
}

// 表紙：左ページ＝白地にタイトル、右ページ＝全面のヒーロー写真（海外雑誌風）。
function CoverSpread({
  title,
  periodLabel,
  photoCount,
  coverPhoto,
}: {
  title: string;
  periodLabel: string;
  photoCount: number;
  coverPhoto?: string;
}) {
  return (
    <SpreadFrame
      left={
        <div className="flex h-full flex-col justify-between p-5">
          <div>
            <p className="font-serif text-[9px] tracking-[0.35em] text-clay/70">SINGAPORE DIARY</p>
            <h2 className="mt-3 font-serif text-[15px] font-medium leading-relaxed text-ink">
              『{title}』
            </h2>
            <p className="mt-2 font-serif text-[11px] tracking-[0.2em] text-ink/50">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <GohankunWidget state="proud" size="xs" bubble={false} />
            <p className="text-[8px] tracking-wide text-ink/40">
              {photoCount} PHOTOS ・ 編集 ごはんくん
            </p>
          </div>
        </div>
      }
      right={
        coverPhoto ? (
          <Photo p={{ src: coverPhoto, label: "cover", kind: "food" }} className="h-full w-full rounded-none" />
        ) : (
          <div className="flex h-full items-center justify-center bg-cream">
            <GohankunWidget state="sing" size="md" bubble={false} />
          </div>
        )
      }
    />
  );
}

// 中身の見開き：枚数に応じて雑誌風テンプレートを選択。
function ContentSpread({ spread }: { spread: Spread }) {
  const n = spread.photos.length;
  if (n >= 3) return <HeroGridSpread spread={spread} />;
  if (n === 2) return <AirySpread spread={spread} />;
  return <SoloSpread spread={spread} />;
}

// 1枚：右ページ全面のエモい写真 × 左ページの余白＋編集メモ。
function SoloSpread({ spread }: { spread: Spread }) {
  return (
    <SpreadFrame
      left={
        <div className="flex h-full flex-col justify-between p-5">
          <EditorialCaption dateISO={spread.dateISO} location={spread.location} />
          <EditorNote mascot={spread.mascot} comment={spread.comment} fromLetter={spread.fromMemoryLetter} />
        </div>
      }
      right={<Photo p={spread.photos[0]} className="h-full w-full rounded-none" />}
    />
  );
}

// 2枚：大小のメリハリ。左＝大きめ、右＝小さくオフセット＋余白に編集メモ。
function AirySpread({ spread }: { spread: Spread }) {
  const [a, b] = spread.photos;
  return (
    <SpreadFrame
      left={
        <div className="flex h-full flex-col p-4">
          <Photo p={a} className="min-h-0 flex-1" />
          <EditorialCaption dateISO={spread.dateISO} location={spread.location} className="mt-2" />
        </div>
      }
      right={
        <div className="relative h-full p-4">
          <Photo p={b} className="ml-auto h-[56%] w-[78%]" />
          <EditorNote mascot={spread.mascot} comment={spread.comment} fromLetter={spread.fromMemoryLetter} className="absolute inset-x-4 bottom-4" />
        </div>
      }
    />
  );
}

// 3〜4枚：左ページ全面のヒーロー × 右ページに小さくグリッド＋編集メモ。
function HeroGridSpread({ spread }: { spread: Spread }) {
  const [hero, ...rest] = spread.photos; // rest: 2〜3枚
  const three = rest.length === 3;
  return (
    <SpreadFrame
      left={
        <div className="relative h-full">
          <Photo p={hero} className="h-full w-full rounded-none" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
          <EditorialCaption
            dateISO={spread.dateISO}
            location={spread.location}
            light
            className="absolute bottom-3 left-3"
          />
        </div>
      }
      right={
        <div className="flex h-full flex-col p-4">
          <div className={`grid min-h-0 flex-1 gap-2 ${three ? "grid-cols-2 grid-rows-2" : "grid-rows-2"}`}>
            {rest.map((p, i) => (
              <Photo key={p.src} p={p} className={three && i === 0 ? "col-span-2" : ""} />
            ))}
          </div>
          <EditorNote mascot={spread.mascot} comment={spread.comment} fromLetter={spread.fromMemoryLetter} className="mt-2" />
        </div>
      }
    />
  );
}
