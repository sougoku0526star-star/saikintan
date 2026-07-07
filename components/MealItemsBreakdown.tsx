"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, UtensilsCrossed, Info } from "lucide-react";
import type { MealEntry, MealItem } from "@/lib/mock-data";
import { getMealItems, applyItemsToMeal, scaleNutrition } from "@/lib/nutrition-scale";

// 品目内訳（複数品目対応・P2④）。定食の主菜/ご飯/味噌汁/小鉢…を1品ずつ表示し、
// 各品目を名前訂正（鯖→イワシ）・除外（これは食べてない）でき、合計は再計算で更新。
export default function MealItemsBreakdown({
  meal,
  onChange,
}: {
  meal: MealEntry;
  onChange?: (meal: MealEntry) => void;
}) {
  const items = getMealItems(meal);
  const editable = !!onChange;
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftKcal, setDraftKcal] = useState("");

  if (items.length === 0) return null;

  const commit = (next: MealItem[]) => onChange?.(applyItemsToMeal(meal, next));

  const startEdit = (i: number) => {
    setEditIdx(i);
    setDraftName(items[i].dishNameJa);
    setDraftKcal(String(items[i].nutrition.calories));
  };

  const saveEdit = (i: number) => {
    const it = items[i];
    const newKcal = Number(draftKcal);
    // カロリーを変えたら栄養全体を比例スケール（P/F/C/塩も整合させる）
    const nutrition =
      newKcal > 0 && it.nutrition.calories > 0
        ? scaleNutrition(it.nutrition, newKcal / it.nutrition.calories)
        : it.nutrition;
    const next = items.map((x, idx) =>
      idx === i ? { ...x, dishNameJa: draftName.trim() || x.dishNameJa, nutrition } : x
    );
    commit(next);
    setEditIdx(null);
  };

  const remove = (i: number) => {
    if (items.length <= 1) return; // 最低1品は残す
    commit(items.filter((_, idx) => idx !== i));
  };

  return (
    <section className="mt-6 rounded-2xl bg-white/60 p-5 ring-1 ring-black/[0.04]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-serif text-sm text-ink/70">
          <UtensilsCrossed className="h-3.5 w-3.5 text-clay" />
          品目の内訳（{items.length}品）
        </h2>
        {editable && (
          <span className="text-[10px] text-ink/35">タップで訂正・除外</span>
        )}
      </div>

      <ul className="divide-y divide-black/[0.05]">
        {items.map((it, i) => (
          <li key={i} className="py-2.5">
            {editIdx === i ? (
              <div className="space-y-2">
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[14px] text-ink focus:border-clay focus:outline-none"
                  placeholder="品目名"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draftKcal}
                    onChange={(e) => setDraftKcal(e.target.value)}
                    className="w-24 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-center text-[13px] text-ink focus:border-clay focus:outline-none"
                  />
                  <span className="text-[11px] text-ink/40">kcal（変更で栄養も比例）</span>
                  <div className="ml-auto flex gap-1.5">
                    <button
                      onClick={() => setEditIdx(null)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 active:scale-90"
                      aria-label="取消"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => saveEdit(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-cream active:scale-90"
                      aria-label="保存"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-ink/85">{it.dishNameJa}</p>
                  {it.source && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink/40">
                      <Info className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{it.source}</span>
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-serif text-[13px] text-ink/60">
                  {it.nutrition.calories}
                  <span className="ml-0.5 text-[10px] text-ink/40">kcal</span>
                </span>
                {editable && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.05] text-ink/55 active:scale-90"
                      aria-label={`${it.dishNameJa}を訂正`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => remove(i)}
                      disabled={items.length <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.05] text-ink/55 transition active:scale-90 disabled:opacity-30"
                      aria-label={`${it.dishNameJa}を除外`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
