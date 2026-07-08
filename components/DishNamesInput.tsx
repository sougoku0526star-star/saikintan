"use client";

import { useEffect, useRef, useState } from "react";
import { Utensils, History, BookMarked, Sparkles, Plus, X } from "lucide-react";
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

// 料理名を複数入れられるフィールド（定食は品目ごとに申告できる・最大 max 品）。
// 各名前はチップで表示、追加はオートコンプリート付き（候補選択は任意で自由入力も可）。
export default function DishNamesInput({
  values,
  onChange,
  max = 8,
  placeholder = "料理名（入れると判定が正確に。定食は品目ごとに追加）",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => setSuggestions(await searchFoods(q)), 180);
    return () => clearTimeout(timer.current);
  }, [text]);

  const full = values.length >= max;

  const add = (name: string) => {
    const n = name.trim();
    setText("");
    setOpen(false);
    if (!n || values.length >= max) return;
    if (values.some((v) => v.toLowerCase() === n.toLowerCase())) return; // 重複回避
    onChange([...values, n]);
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  const showList = open && suggestions.length > 0;

  return (
    <div>
      {/* 追加済みの料理名（チップ） */}
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-clay/12 py-1 pl-3 pr-1.5 text-[12.5px] text-clay"
            >
              {v}
              <button
                onClick={() => remove(i)}
                aria-label={`${v}を外す`}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-clay/20 text-clay active:scale-90"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 入力（最大数に達したら隠す） */}
      {!full && (
        <div className="relative">
          <div className="flex items-center rounded-2xl border border-black/10 bg-white px-3 focus-within:border-clay">
            <Utensils className="h-4 w-4 shrink-0 text-ink/35" />
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) {
                  e.preventDefault();
                  add(text);
                }
              }}
              placeholder={values.length === 0 ? placeholder : "品目を追加"}
              className="w-full bg-transparent px-2.5 py-3 text-[14px] text-ink placeholder:text-ink/35 focus:outline-none"
            />
            {text.trim() && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(text);
                }}
                aria-label="追加"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay text-cream active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {showList && (
            <ul className="absolute z-10 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.06]">
              {suggestions.map((s, i) => {
                const Icon = SOURCE_ICON[s.source];
                return (
                  <li key={`${s.label}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        add(s.label);
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
      )}
      {full && (
        <p className="px-1 text-[11px] text-ink/40">最大{max}品まで登録できます。</p>
      )}
    </div>
  );
}
