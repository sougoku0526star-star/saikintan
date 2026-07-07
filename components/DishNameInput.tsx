"use client";

import { useEffect, useRef, useState } from "react";
import { Utensils, History, BookMarked, Sparkles } from "lucide-react";
import { searchFoods, type FoodSuggestion } from "@/lib/food-search";

const SOURCE_ICON = {
  history: History,
  userdict: BookMarked,
  official: Sparkles,
} as const;
const SOURCE_LABEL = {
  history: "よく食べる",
  userdict: "マイ辞書",
  official: "辞書",
} as const;

// 料理名フィールド（オートコンプリート付き）。1文字目から候補を出す。
// 候補は選ばず自由入力してもよい。
export default function DishNameInput({
  value,
  onChange,
  placeholder = "料理名（入れると判定が正確になるよ）",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const list = await searchFoods(q);
      setSuggestions(list);
    }, 180);
    return () => clearTimeout(timer.current);
  }, [value]);

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center rounded-2xl border border-black/10 bg-white px-3 focus-within:border-clay">
        <Utensils className="h-4 w-4 shrink-0 text-ink/35" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent px-2.5 py-3 text-[14px] text-ink placeholder:text-ink/35 focus:outline-none"
        />
      </div>

      {showList && (
        <ul className="absolute z-10 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.06]">
          {suggestions.map((s, i) => {
            const Icon = SOURCE_ICON[s.source];
            return (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  // onMouseDown so it fires before input blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s.label);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-clay/8 active:scale-[0.99]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-clay/70" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink/85">
                    {s.label}
                  </span>
                  <span className="shrink-0 text-[10px] text-ink/35">
                    {SOURCE_LABEL[s.source]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
