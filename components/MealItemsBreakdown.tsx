"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, UtensilsCrossed, Info, Plus } from "lucide-react";
import type { MealEntry, MealItem, NutritionDetail } from "@/lib/mock-data";
import { getMealItems, applyItemsToMeal, scaleNutrition } from "@/lib/nutrition-scale";
import { lookupFood, type LookupFood } from "@/lib/food-search";
import DishNameInput from "./DishNameInput";

// 辞書ヒット → その栄養値で MealItem を作る（分量1）。
function itemFromLookup(food: LookupFood): MealItem {
  return {
    slug: food.slug,
    dishName: food.name,
    dishNameJa: food.nameJa,
    nutrition: {
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carb: food.carb,
      sodium: food.sodium,
      portions: 1,
    },
    ...(food.source ? { source: food.source } : {}),
  };
}

// 品目内訳（複数品目対応）。定食の主菜/ご飯/味噌汁/小鉢…を1品ずつ表示し、
// 各品目を名前訂正（鯖→イワシ）・除外（これは食べてない）・追加でき、合計は再計算で更新。
// 名前訂正は AI再解析せず、辞書の引き直しのみ（ヒットで辞書値に差し替え／無ければ既存値保持）。
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
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [busy, setBusy] = useState(false);

  if (items.length === 0) return null;

  const commit = (next: MealItem[]) => onChange?.(applyItemsToMeal(meal, next));

  const startEdit = (i: number) => {
    setEditIdx(i);
    setDraftName(items[i].dishNameJa);
    setDraftKcal(String(items[i].nutrition.calories));
  };

  const manualScale = (it: MealItem): NutritionDetail => {
    const newKcal = Number(draftKcal);
    return newKcal > 0 && it.nutrition.calories > 0
      ? scaleNutrition(it.nutrition, newKcal / it.nutrition.calories)
      : it.nutrition;
  };

  const saveEdit = async (i: number) => {
    const it = items[i];
    const newName = draftName.trim() || it.dishNameJa;
    const nameChanged = newName !== it.dishNameJa;
    let next: MealItem;
    if (nameChanged) {
      // 名前が変わったら辞書を引き直す（AI再解析はしない）
      setBusy(true);
      const food = await lookupFood(newName);
      setBusy(false);
      if (food) {
        next = itemFromLookup(food); // ヒット → 辞書値に差し替え
      } else {
        // 辞書に無い → 既存の栄養値を保持し名前だけ更新（手動編集はkcalで反映）。
        // userNamed を立てて保存時にユーザー辞書へ学習させる。
        next = {
          ...it,
          slug: undefined,
          source: undefined,
          dishName: newName,
          dishNameJa: newName,
          nutrition: manualScale(it),
          userNamed: true,
        };
      }
    } else {
      // 名前そのまま → kcalの手動編集のみ反映（比例スケール）
      next = { ...it, nutrition: manualScale(it) };
    }
    commit(items.map((x, idx) => (idx === i ? next : x)));
    setEditIdx(null);
  };

  const remove = (i: number) => {
    if (items.length <= 1) return; // 最低1品は残す
    commit(items.filter((_, idx) => idx !== i));
  };

  const addItem = async () => {
    const name = addName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    setBusy(true);
    const food = await lookupFood(name);
    setBusy(false);
    const newItem: MealItem = food
      ? itemFromLookup(food)
      : {
          dishName: name,
          dishNameJa: name,
          // 辞書に無い品目は0スタート（あとでkcalを手入力）。userNamedで学習対象に
          nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, sodium: 0, portions: 1, estimated: true },
          userNamed: true,
        };
    commit([...items, newItem]);
    setAddName("");
    setAdding(false);
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

      {/* 品目を追加（辞書検索 or 手動） */}
      {editable && (
        <div className="mt-3 border-t border-black/[0.05] pt-3">
          {adding ? (
            <div className="space-y-2">
              <DishNameInput
                value={addName}
                onChange={setAddName}
                placeholder="追加する品目名（辞書にあれば栄養も自動）"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setAdding(false);
                    setAddName("");
                  }}
                  className="rounded-full bg-ink/[0.06] px-4 py-1.5 text-[12px] text-ink/60 active:scale-95"
                >
                  取消
                </button>
                <button
                  onClick={addItem}
                  disabled={busy || !addName.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-clay px-4 py-1.5 text-[12px] text-cream active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  追加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 py-2.5 text-[12px] text-ink/50 transition hover:border-clay hover:text-clay"
            >
              <Plus className="h-3.5 w-3.5" />
              品目を追加
            </button>
          )}
        </div>
      )}
    </section>
  );
}
