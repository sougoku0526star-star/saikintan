"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Wallet, ChevronLeft, ChevronRight, Flame, Pencil } from "lucide-react";
import { fetchRecords, ALBUM_UPDATED, type CreatedEntry } from "@/lib/created-store";
import {
  aggregatePeriod,
  periodStartOf,
  shiftPeriod,
  fallbackLetter,
  type PeriodKind,
  type PeriodStats,
  type WeeklyLetter,
} from "@/lib/weekly";
import {
  fetchSettings,
  weeklyFromMonthly,
  SETTINGS_UPDATED,
  DEFAULT_MONTHLY_BUDGET_SGD,
} from "@/lib/settings";
import { fetchRatesToJpy, type RatesToJpy } from "@/lib/fx";
import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES_TO_JPY,
  formatMoney,
  type CurrencyCode,
} from "@/lib/currency";
import GohankunWidget from "./GohankunWidget";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function WeeklyDashboard() {
  const [records, setRecords] = useState<CreatedEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<PeriodKind>("week");
  const [anchor, setAnchor] = useState<string>(periodStartOf("week", todayISO()));
  const [monthlyBudget, setMonthlyBudget] = useState(DEFAULT_MONTHLY_BUDGET_SGD);
  const [mainCurrency, setMainCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<RatesToJpy>(FALLBACK_RATES_TO_JPY);
  const [letter, setLetter] = useState<WeeklyLetter | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);

  // 記録を取得
  useEffect(() => {
    const load = () =>
      fetchRecords().then((list) => {
        setRecords(list);
        setLoaded(true);
      });
    load();
    window.addEventListener(ALBUM_UPDATED, load);
    return () => window.removeEventListener(ALBUM_UPDATED, load);
  }, []);

  // 設定（月予算・メイン通貨）を取得（週予算は月予算÷4）
  useEffect(() => {
    const load = () =>
      fetchSettings().then((s) => {
        setMonthlyBudget(s.monthlyBudget);
        setMainCurrency(s.mainCurrency);
      });
    load();
    window.addEventListener(SETTINGS_UPDATED, load);
    return () => window.removeEventListener(SETTINGS_UPDATED, load);
  }, []);

  // 為替レート（各通貨→JPY）を取得
  useEffect(() => {
    fetchRatesToJpy().then(setRates);
  }, []);

  // モード切替時、データのある最新の期間に合わせる
  useEffect(() => {
    if (!loaded) return;
    const starts = records.map((r) => periodStartOf(kind, r.meal.date)).sort();
    setAnchor(starts.at(-1) ?? periodStartOf(kind, todayISO()));
  }, [kind, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodBudget = kind === "week" ? weeklyFromMonthly(monthlyBudget) : monthlyBudget;
  const rateMain = rates[mainCurrency] ?? FALLBACK_RATES_TO_JPY[mainCurrency];

  const stats: PeriodStats = useMemo(
    () => aggregatePeriod(records, kind, anchor, periodBudget, mainCurrency, rateMain),
    [records, kind, anchor, periodBudget, mainCurrency, rateMain]
  );

  const currentStart = periodStartOf(kind, todayISO());
  const canNext = anchor < currentStart;

  // 期間ごとにAIの手紙を取得（sessionStorageにキャッシュ）
  useEffect(() => {
    if (!loaded) return;
    if (stats.mealsCount === 0) {
      setLetter(null);
      return;
    }
    const sig = `${stats.kind}:${stats.start}:${stats.mealsCount}:${stats.totalMain}:${stats.calories}:${stats.budgetMain}:${stats.mainCurrency}`;
    const cacheKey = `saikintan:letter:${sig}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setLetter(JSON.parse(cached));
      return;
    }
    setLetter(null);
    setLetterLoading(true);
    let cancelled = false;
    fetch("/api/weekly-letter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stats),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const l: WeeklyLetter = d.letter ?? fallbackLetter(stats);
        sessionStorage.setItem(cacheKey, JSON.stringify(l));
        setLetter(l);
      })
      .catch(() => !cancelled && setLetter(fallbackLetter(stats)))
      .finally(() => !cancelled && setLetterLoading(false));
    return () => {
      cancelled = true;
    };
  }, [stats, loaded]);

  const budgetPctClamped = Math.min(100, stats.budgetPct);
  const unit = kind === "week" ? "週" : "月";

  return (
    <div>
      <header className="mb-4">
        <p className="text-[12px] tracking-[0.3em] text-clay">WEEKLY LETTER</p>
        <h1 className="font-serif text-3xl font-semibold text-ink">ふりかえり</h1>
      </header>

      {/* ごはんくんのねぎらい */}
      <div className="mb-5">
        <GohankunWidget state="proud" size="sm" />
      </div>

      {/* 週/月トグル */}
      <div className="mb-3 inline-flex rounded-full bg-ink/[0.06] p-1 text-[12px]">
        {(["week", "month"] as PeriodKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-5 py-1.5 font-medium transition ${
              kind === k ? "bg-clay text-cream shadow-card" : "text-ink/55"
            }`}
          >
            {k === "week" ? "週" : "月"}
          </button>
        ))}
      </div>

      {/* 期間ナビ */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setAnchor((a) => shiftPeriod(kind, a, -1))}
          aria-label="前へ"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[150px] text-center text-[12px] text-ink/55">
          {stats.label}
        </span>
        <button
          onClick={() => canNext && setAnchor((a) => shiftPeriod(kind, a, 1))}
          disabled={!canNext}
          aria-label="次へ"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card active:scale-90 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {stats.mealsCount === 0 ? (
        <div className="rounded-2xl bg-white/60 p-8 text-center ring-1 ring-black/[0.04]">
          <p className="font-serif text-[15px] text-ink/60">
            この{unit}の記録はまだありません
          </p>
          <p className="mt-1 text-[12px] text-ink/40">
            ＋ から食事を記録すると、ここに集計が出ます。
          </p>
        </div>
      ) : (
        <>
          {/* 予算サマリー */}
          <div className="rounded-2xl bg-white/70 p-5 shadow-card ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] text-ink/55">
                <Wallet className="h-4 w-4 text-gold" />
                この{unit}の食費
              </span>
              <Link
                href="/settings"
                className="flex items-center gap-1 text-[11px] text-ink/40 transition hover:text-clay"
              >
                予算 {formatMoney(stats.budgetMain, stats.mainCurrency)}/{unit}
                <Pencil className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-semibold text-ink">
                {formatMoney(stats.totalMain, stats.mainCurrency)}
              </span>
              {stats.mainCurrency !== "JPY" && (
                <span className="text-[13px] text-ink/45">
                  ≈ ¥{stats.totalJpy.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/80 to-clay"
                style={{ width: `${budgetPctClamped}%` }}
              />
            </div>
            <p className="mt-2 flex items-center justify-between text-[11px] text-ink/45">
              <span>予算の {stats.budgetPct}% を使用 · {stats.mealsCount}食を記録</span>
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-clay" />
                {stats.calories.toLocaleString()} kcal
              </span>
            </p>
          </div>

          {/* AIからのパーソナルレター */}
          <article className="relative mt-6 overflow-hidden rounded-2xl bg-cream p-6 shadow-card ring-1 ring-black/[0.05]">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-medium tracking-wide text-clay">
              <Sparkles className="h-4 w-4" />
              あなたへの手紙
            </div>
            {letter ? (
              <>
                <p className="font-serif text-[17px] text-ink">{letter.greeting}</p>
                <div className="mt-4 space-y-4">
                  {letter.body.map((para, i) => (
                    <p key={i} className="font-serif text-[14.5px] leading-[2] text-ink/80">
                      {para}
                    </p>
                  ))}
                </div>
                <div className="mt-6 flex items-end justify-end gap-2">
                  <p className="font-serif text-[13px] italic text-clay/80">{letter.sign}</p>
                  <GohankunWidget state="explaining" size="sm" bubble={false} />
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-[13px] text-ink/40">
                {letterLoading ? "AIが手紙を書いています…" : "—"}
              </p>
            )}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-clay/5" />
          </article>

          {/* PFCカロリー比 */}
          <p className="mb-2 mt-6 text-[11px] text-ink/45">PFCバランス（カロリー比）</p>
          <div className="grid grid-cols-3 gap-3">
            <BalanceChip label="タンパク質" value={stats.pfcPct.protein} accent="#7C8B6F" />
            <BalanceChip label="脂質" value={stats.pfcPct.fat} accent="#C96E4A" />
            <BalanceChip label="炭水化物" value={stats.pfcPct.carb} accent="#B68A3E" />
          </div>
        </>
      )}
    </div>
  );
}

function BalanceChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-white/60 p-3 text-center ring-1 ring-black/[0.04]">
      <div className="relative mx-auto mb-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: accent }}
        />
      </div>
      <p className="font-serif text-lg font-semibold text-ink">{value}%</p>
      <p className="text-[10px] text-ink/45">{label}</p>
    </div>
  );
}
