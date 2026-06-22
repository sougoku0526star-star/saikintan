"use client";

import { useEffect, useState } from "react";
import { BookMarked, Download, Trash2 } from "lucide-react";
import {
  fetchUserFoods,
  removeUserFood,
  toCsv,
  USER_DICT_UPDATED,
  type UserFood,
} from "@/lib/user-dictionary";

// 辞書へ昇格させた料理の一覧。CSVで正規データへ統合できる。
export default function UserDictionarySection() {
  const [items, setItems] = useState<UserFood[]>([]);

  useEffect(() => {
    const refresh = () => {
      fetchUserFoods().then(setItems);
    };
    refresh();
    window.addEventListener(USER_DICT_UPDATED, refresh);
    return () => window.removeEventListener(USER_DICT_UPDATED, refresh);
  }, []);

  if (items.length === 0) return null;

  const exportCsv = () => {
    const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-foods.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <BookMarked className="h-4 w-4 text-sage" />
        <h2 className="font-serif text-sm text-ink/70">あなたの辞書</h2>
        <span className="ml-auto text-[11px] text-ink/35">{items.length}品</span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink/45">
        あなたが追加した料理です。次回からデータ参照として認識されます。CSVに書き出して正規データへ統合できます。
      </p>

      <div className="space-y-2">
        {items.map((f) => (
          <div
            key={f.slug}
            className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 ring-1 ring-black/[0.04]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage/15 text-[10px] font-medium text-sage">
              {f.category.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[13px] text-ink">{f.nameJa}</p>
              <p className="truncate text-[10px] text-ink/45">
                {f.calories} kcal · P{f.protein} F{f.fat} C{f.carb}
              </p>
            </div>
            <button
              onClick={() => removeUserFood(f.slug)}
              aria-label="削除"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/35 hover:bg-ink/[0.05] hover:text-clay"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={exportCsv}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink/[0.05] py-2.5 text-[12px] font-medium text-ink/70 transition hover:bg-ink/10 active:scale-[0.99]"
      >
        <Download className="h-4 w-4" />
        CSVに書き出す（{items.length}品）
      </button>
    </section>
  );
}
