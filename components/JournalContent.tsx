"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Coins,
  Share2,
  Sparkles,
  Flame,
  Minus,
  Plus,
  Info,
  Pencil,
  Images,
} from "lucide-react";
import type { MealEntry } from "@/lib/mock-data";
import type { SharedRecord } from "@/lib/friends";
import { formatMoney } from "@/lib/currency";
import { withPortions, macrosFromDetail, tagsForMeal } from "@/lib/nutrition-scale";
import Badge from "./Badge";
import MacroBar from "./MacroBar";
import MealEditForm from "./MealEditForm";
import ShareSheet from "./ShareSheet";

const PORTION_PRESETS = [0.5, 0.75, 1, 1.5, 2];

// 思い出ジャーナル（画面B）。onChange を渡すと分量調整・項目編集が有効になる。
export default function JournalContent({
  meal,
  onChange,
  onDelete,
  recordId,
}: {
  meal: MealEntry;
  onChange?: (meal: MealEntry) => void;
  onDelete?: () => void;
  /** この記録のID（共有スナップショット用） */
  recordId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const editable = !!onChange;
  const n = meal.nutrition;

  const snapshot: SharedRecord = {
    recordId: recordId ?? meal.id,
    dishName: meal.dishName,
    dishNameJa: meal.dishNameJa,
    photo: meal.photo,
    location: meal.location,
    date: meal.date,
    timeLabel: meal.timeLabel,
    calories: meal.nutrition?.calories,
    spendLabel: meal.spend.amount > 0 ? formatMoney(meal.spend.amount, meal.spend.currency) : undefined,
    spendJpy: meal.spend.jpy || undefined,
  };

  // 全項目を編集（共有フォーム）
  if (editing && onChange) {
    return (
      <div className="flex min-h-full flex-col py-6">
        <MealEditForm
          meal={meal}
          onClose={() => setEditing(false)}
          onDelete={onDelete}
          actions={[
            {
              label: "変更を保存",
              primary: true,
              onClick: (m) => {
                onChange(m);
                setEditing(false);
              },
            },
          ]}
        />
      </div>
    );
  }

  const dateLabel = new Date(meal.date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 分量クイック調整（絶対的な人前）
  const applyPortions = (p: number) => {
    if (!n || !onChange) return;
    const scaled = withPortions(n, p);
    onChange({
      ...meal,
      nutrition: scaled,
      macros: macrosFromDetail(scaled),
      nutritionTags: tagsForMeal(scaled),
    });
  };
  const setManualCalories = (kcal: number) => {
    if (!n || n.calories <= 0 || kcal <= 0) return;
    applyPortions((n.portions || 1) * (kcal / n.calories));
  };

  const lowConfidence =
    typeof meal.confidence === "number" && meal.confidence < 0.6;

  return (
    <div className="relative px-5 pt-5">
      {/* 上部バー */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="アルバムへ戻る"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card backdrop-blur transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-serif text-sm tracking-widest text-ink/40">MEMORY</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSharing(true)}
            aria-label="フレンドに共有"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink/70 shadow-card backdrop-blur transition active:scale-95"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          {editable && (
            <button
              onClick={() => setEditing(true)}
              aria-label="編集"
              className="flex h-10 items-center justify-center gap-1 rounded-full bg-white/70 px-3 text-[12px] text-ink/70 shadow-card backdrop-blur transition active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              編集
            </button>
          )}
        </div>
      </div>

      {sharing && <ShareSheet record={snapshot} onClose={() => setSharing(false)} />}

      {/* ポラロイド写真 */}
      <div className="mt-6 flex justify-center">
        <figure className="w-full max-w-[340px] -rotate-1 rounded-[6px] bg-white p-3 pb-16 shadow-polaroid">
          <div className="aspect-[4/5] overflow-hidden rounded-[3px] bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meal.photo} alt={meal.dishName} className="h-full w-full object-cover" />
          </div>
          <figcaption className="absolute mt-4 w-full pr-6 text-center font-serif text-[15px] text-ink/70">
            {meal.dishName}
          </figcaption>
        </figure>
      </div>

      {/* 料理名・日時・場所 */}
      <div className="mt-9 animate-fade-up text-center">
        <p className="text-[12px] tracking-[0.2em] text-clay">
          {meal.timeLabel.toUpperCase()}
        </p>
        <h1 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-ink">
          {meal.dishNameJa}
        </h1>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-ink/50">
          <MapPin className="h-3.5 w-3.5 text-clay" />
          {meal.location}
        </p>
        {lowConfidence && (
          <p className="mx-auto mt-3 flex max-w-[300px] items-start gap-1.5 rounded-lg bg-clay/8 px-3 py-2 text-left text-[11px] leading-relaxed text-clay/90">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            AIの判定にやや自信がありません（{Math.round((meal.confidence ?? 0) * 100)}%）。違っていたら「編集」で直せます。
          </p>
        )}
      </div>

      {/* エモい日記風キャプション */}
      <div className="mt-7 animate-fade-up rounded-2xl bg-cream/70 p-5 ring-1 ring-black/[0.04]">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-clay/80">
          <Sparkles className="h-3.5 w-3.5" />
          AIが綴った、この一皿の記憶
        </div>
        <p className="whitespace-pre-wrap font-serif text-[15px] leading-[2] text-ink/85">
          {meal.caption}
        </p>
        <p className="mt-3 text-right text-[11px] text-ink/35">{dateLabel}</p>
      </div>

      {/* 思い出の写真（任意・友人や風景など） */}
      {meal.memoryPhoto && (
        <div className="mt-5 animate-fade-up">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-sage">
            <Images className="h-3.5 w-3.5" />
            この日の思い出
          </div>
          <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-card ring-1 ring-black/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meal.memoryPhoto}
              alt="この日の思い出の写真"
              className="w-full rounded-xl object-cover"
            />
          </div>
        </div>
      )}

      {/* データタグ（支出・栄養・位置） */}
      <div className="mt-5 flex flex-wrap gap-2">
        {meal.spend.amount > 0 ? (
          <Badge tone="gold" icon={<Coins className="h-3.5 w-3.5" />}>
            {formatMoney(meal.spend.amount, meal.spend.currency)}
            <span className="text-gold/60">≈ ¥{meal.spend.jpy.toLocaleString()}</span>
          </Badge>
        ) : (
          <Badge tone="neutral" icon={<Coins className="h-3.5 w-3.5" />}>
            価格 未記録
          </Badge>
        )}
        {meal.nutritionTags.map((t) => (
          <Badge key={t.label} tone={t.tone}>
            {t.label}
          </Badge>
        ))}
        <Badge tone="neutral" icon={<MapPin className="h-3.5 w-3.5" />}>
          {meal.location.split("·").pop()?.trim()}
        </Badge>
      </div>

      {/* 栄養 */}
      <div className="mt-6 rounded-2xl bg-white/60 p-5 ring-1 ring-black/[0.04]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-sm text-ink/70">栄養のバランス</h2>
          <span className="text-[10px] text-ink/35">
            {n?.estimated
              ? "写真からAI推定（概算）"
              : n
                ? "栄養素データから計算"
                : "AI推定 · ざっくり"}
          </span>
        </div>

        {meal.source && (
          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-sage/8 px-3 py-2 text-[11px] leading-relaxed text-ink/60">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
            出典: {meal.source}
          </p>
        )}

        {n?.estimated && !meal.source && (
          <p className="mb-3 rounded-lg bg-clay/5 px-3 py-2 text-[11px] leading-relaxed text-ink/55">
            この料理はまだ栄養データベースに無いため、写真からAIが推定した概算値です。実際と差が出ることがあります。
          </p>
        )}

        {n && (
          <div className="mb-4 flex items-end justify-between rounded-xl bg-clay/5 px-4 py-3">
            <div className="flex items-baseline gap-1.5">
              <Flame className="h-4 w-4 translate-y-0.5 text-clay" />
              <span className="font-serif text-3xl font-semibold text-ink">
                {n.calories}
              </span>
              <span className="text-[12px] text-ink/50">kcal</span>
            </div>
            <div className="flex gap-4 text-right text-[11px] text-ink/55">
              <Macro label="P" value={`${n.protein}g`} />
              <Macro label="F" value={`${n.fat}g`} />
              <Macro label="C" value={`${n.carb}g`} />
              <Macro label="塩分" value={`${(n.sodium / 1000).toFixed(1)}g`} />
            </div>
          </div>
        )}

        <div className="space-y-3.5">
          <MacroBar label="タンパク質" level={meal.macros.protein} accent="#7C8B6F" />
          <MacroBar label="脂質" level={meal.macros.fat} accent="#C96E4A" />
          <MacroBar label="炭水化物" level={meal.macros.carb} accent="#B68A3E" />
        </div>

        {/* 分量クイック調整（生成エントリのみ） */}
        {editable && n && (
          <div className="mt-5 border-t border-black/5 pt-4">
            <p className="mb-2 text-[11px] text-ink/45">分量を調整（1人前=×1）</p>
            <div className="mb-3 flex gap-1.5">
              {PORTION_PRESETS.map((p) => {
                const active = Math.abs((n.portions || 1) - p) < 0.01;
                return (
                  <button
                    key={p}
                    onClick={() => applyPortions(p)}
                    className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "bg-clay text-cream"
                        : "bg-ink/[0.05] text-ink/60 hover:bg-ink/10"
                    }`}
                  >
                    ×{p}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink/45">カロリーを手入力</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManualCalories(n.calories - 50)}
                  aria-label="50kcal減らす"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 active:scale-90"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={n.calories}
                  onChange={(e) => setManualCalories(parseInt(e.target.value, 10) || 0)}
                  className="w-16 rounded-lg border border-black/10 bg-white px-2 py-1 text-center font-serif text-[14px] text-ink focus:border-clay focus:outline-none"
                />
                <span className="text-[11px] text-ink/40">kcal</span>
                <button
                  onClick={() => setManualCalories(n.calories + 50)}
                  aria-label="50kcal増やす"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 active:scale-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {n && n.portions !== 1 && (
          <p className="mt-3 text-[11px] text-ink/40">
            分量 約{n.portions}人前として計算
          </p>
        )}
      </div>

      {/* 為替メモ */}
      {meal.spend.amount > 0 && (
        <p className="mt-4 text-center text-[11px] text-ink/35">
          換算レート 1 {meal.spend.currency} ≈ ¥
          {(meal.spend.jpy / meal.spend.amount).toFixed(meal.spend.jpy / meal.spend.amount < 1 ? 3 : 1)}
          （記録時）
        </p>
      )}

      <div className="h-6" />
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-serif text-[13px] font-semibold text-ink">{value}</p>
      <p className="text-[9px] text-ink/40">{label}</p>
    </div>
  );
}
