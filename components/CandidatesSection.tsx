"use client";

import { useEffect, useState } from "react";
import { Database, Plus, Check, X } from "lucide-react";
import {
  getCandidates,
  removeCandidate,
  CANDIDATES_UPDATED,
  type CandidateEntry,
} from "@/lib/candidates-store";
import {
  addUserFood,
  slugifyUser,
  FOOD_CATEGORIES,
} from "@/lib/user-dictionary";

// 辞書に無くAIが推定した料理＝「次に集めるべきデータ候補」。編集して辞書へ昇格できる。
export default function CandidatesSection() {
  const [items, setItems] = useState<CandidateEntry[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setItems(getCandidates());
    refresh();
    window.addEventListener(CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(CANDIDATES_UPDATED, refresh);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-dusk" />
        <h2 className="font-serif text-sm text-ink/70">辞書化の候補</h2>
        <span className="ml-auto text-[11px] text-ink/35">{items.length}件</span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink/45">
        まだ栄養データベースに無く、AIが写真から推定した料理です。数値を確認・修正して「辞書に追加」すると、次回からデータ参照として認識されます。
      </p>

      <div className="space-y-2">
        {items.map((c) =>
          editing === c.id ? (
            <PromoteForm
              key={c.id}
              candidate={c}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 ring-1 ring-black/[0.04]"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt={c.nameJa} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[13px] text-ink">{c.nameJa}</p>
                <p className="truncate text-[10px] text-ink/45">
                  {c.calories} kcal{c.count > 1 ? ` · ×${c.count}回` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditing(c.id)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-clay px-3 py-1.5 text-[11px] font-medium text-cream transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                辞書に追加
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function PromoteForm({
  candidate,
  onCancel,
  onSaved,
}: {
  candidate: CandidateEntry;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nameJa, setNameJa] = useState(candidate.nameJa);
  const [name, setName] = useState(candidate.name);
  const [category, setCategory] = useState("Other");
  const [calories, setCalories] = useState(candidate.calories);
  const [protein, setProtein] = useState(candidate.protein);
  const [fat, setFat] = useState(candidate.fat);
  const [carb, setCarb] = useState(candidate.carb);
  const [sodium, setSodium] = useState(candidate.sodium);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await addUserFood({
      slug: slugifyUser(name || nameJa),
      name: name || nameJa,
      nameJa: nameJa || name,
      category,
      calories,
      protein,
      fat,
      carb,
      sodium,
    });
    removeCandidate(candidate.id);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="rounded-xl bg-cream/80 p-3.5 ring-1 ring-clay/20">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={candidate.photo} alt={nameJa} className="h-full w-full object-cover" />
        </div>
        <p className="text-[11px] text-ink/55">数値を確認して辞書に登録</p>
      </div>

      <div className="space-y-2">
        <Field label="料理名（日本語）">
          <input
            value={nameJa}
            onChange={(e) => setNameJa(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] text-ink focus:border-clay focus:outline-none"
          />
        </Field>
        <Field label="料理名（英語）">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] text-ink focus:border-clay focus:outline-none"
          />
        </Field>
        <Field label="カテゴリ">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] text-ink focus:border-clay focus:outline-none"
          >
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="カロリー(kcal)" value={calories} onChange={setCalories} />
          <NumField label="塩分(mg)" value={sodium} onChange={setSodium} />
          <NumField label="タンパク質(g)" value={protein} onChange={setProtein} />
          <NumField label="脂質(g)" value={fat} onChange={setFat} />
          <NumField label="炭水化物(g)" value={carb} onChange={setCarb} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-clay py-2 text-[12px] font-medium text-cream transition active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {saving ? "登録中…" : "辞書に登録"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1 rounded-lg bg-white px-4 py-2 text-[12px] text-ink/60 ring-1 ring-black/10 active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] text-ink/45">{label}</span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] text-ink/45">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] text-ink focus:border-clay focus:outline-none"
      />
    </label>
  );
}
