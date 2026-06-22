"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Flame,
  CalendarDays,
  Coins,
  Sparkles,
  ArrowRight,
  Utensils,
  ImagePlus,
  Trash2,
  MapPin,
} from "lucide-react";
import type { MealEntry } from "@/lib/mock-data";
import { prepareImage } from "@/lib/image";
import type { Coords } from "./LocationPicker";

// 地図はクライアント専用（SSRしない）
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[11px] text-ink/40">
      地図を読み込み中…
    </div>
  ),
});
import {
  withPortions,
  macrosFromDetail,
  tagsForMeal,
  JPY_PER_SGD,
} from "@/lib/nutrition-scale";
import { fetchSgdJpyRate } from "@/lib/fx";

export const MEAL_TYPES = [
  { ja: "朝食", en: "Breakfast" },
  { ja: "昼食", en: "Lunch" },
  { ja: "夕食", en: "Dinner" },
  { ja: "夜食", en: "Late" },
];

const PORTION_PRESETS = [0.5, 0.75, 1, 1.5, 2];

export interface EditAction {
  label: string;
  primary?: boolean;
  onClick: (meal: MealEntry) => void;
}

// 記録の編集フォーム（確認ステップ・アルバム後編集で共有）。
export default function MealEditForm({
  meal,
  actions,
  onClose,
  onDelete,
}: {
  meal: MealEntry;
  actions: EditAction[];
  onClose?: () => void;
  onDelete?: () => void;
}) {
  const [photo, setPhoto] = useState(meal.photo);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dishNameJa, setDishNameJa] = useState(meal.dishNameJa);
  const [date, setDate] = useState(meal.date);
  const [mealType, setMealType] = useState(
    MEAL_TYPES.some((t) => t.en === meal.timeLabel) ? meal.timeLabel : "Lunch"
  );
  const [priceSgd, setPriceSgd] = useState(
    meal.spend.sgd > 0 ? String(meal.spend.sgd) : ""
  );
  const [caption, setCaption] = useState(meal.caption);
  const [portions, setPortions] = useState(meal.nutrition?.portions ?? 1);
  const [coords, setCoords] = useState<Coords | undefined>(meal.coords);
  // 本日の為替レート（1日1回キャッシュ・サーバー取得）。取得まではこれまでのレートを既定に。
  const [rate, setRate] = useState<number>(meal.spend.rate || JPY_PER_SGD);
  useEffect(() => {
    fetchSgdJpyRate().then(setRate);
  }, []);

  const liveN = meal.nutrition ? withPortions(meal.nutrition, portions) : undefined;
  const jpy = Math.round((parseFloat(priceSgd) || 0) * rate);

  const build = (): MealEntry => {
    const sgd = Math.max(0, parseFloat(priceSgd) || 0);
    const n = meal.nutrition ? withPortions(meal.nutrition, portions) : undefined;
    return {
      ...meal,
      photo,
      dishNameJa: dishNameJa.trim() || meal.dishNameJa,
      date,
      timeLabel: mealType,
      caption: caption.trim() || meal.caption,
      coords,
      spend: { sgd, jpy: Math.round(sgd * rate), rate },
      ...(n
        ? { nutrition: n, macros: macrosFromDetail(n), nutritionTags: tagsForMeal(n) }
        : {}),
    };
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  })();

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // HEIC→JPEG変換＋リサイズしてから保持（dataURLなので再読込でも残る）
    const { dataUrl } = await prepareImage(file);
    setPhoto(dataUrl);
  };

  return (
    <div className="no-scrollbar m-auto max-h-[88vh] w-[90%] max-w-[380px] animate-pop overflow-y-auto rounded-[1.6rem] bg-paper p-5 shadow-polaroid">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-7 top-7 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-card backdrop-blur"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* 写真（差し替え可） + 現在のkcal */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickPhoto}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink/5"
          aria-label="写真を変更"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={meal.dishName} className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-cream opacity-0 transition group-hover:opacity-100">
            <ImagePlus className="h-5 w-5" />
          </span>
        </button>
        <div className="min-w-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-clay"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            写真を変更
          </button>
          <p className="text-[11px] text-ink/45">{meal.dishName}</p>
          {liveN && (
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink/70">
              <Flame className="h-3.5 w-3.5 text-clay" />
              <span className="font-serif text-lg font-semibold text-ink">
                {liveN.calories}
              </span>
              kcal
              {liveN.estimated && (
                <span className="ml-1 rounded bg-clay/10 px-1.5 py-0.5 text-[9px] text-clay">
                  AI推定
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 料理名 */}
      <div className="mt-5">
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink/50">
          <Utensils className="h-3.5 w-3.5" />
          料理名
        </label>
        <input
          value={dishNameJa}
          onChange={(e) => setDishNameJa(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[14px] text-ink focus:border-clay focus:outline-none"
        />
      </div>

      {/* 分量 */}
      {meal.nutrition && (
        <div className="mt-4">
          <span className="mb-1.5 block text-[11px] text-ink/50">分量（1人前=×1）</span>
          <div className="flex gap-1.5">
            {PORTION_PRESETS.map((p) => {
              const active = Math.abs(portions - p) < 0.01;
              return (
                <button
                  key={p}
                  onClick={() => setPortions(p)}
                  className={`flex-1 rounded-lg py-2 text-[12px] font-medium transition ${
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
        </div>
      )}

      {/* 日付 */}
      <div className="mt-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink/50">
          <CalendarDays className="h-3.5 w-3.5" />
          日付
        </label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[14px] text-ink focus:border-clay focus:outline-none"
        />
      </div>

      {/* 食事の種類 */}
      <div className="mt-4">
        <span className="mb-1.5 block text-[11px] text-ink/50">食事の種類</span>
        <div className="flex gap-1.5">
          {MEAL_TYPES.map((t) => {
            const active = mealType === t.en;
            return (
              <button
                key={t.en}
                onClick={() => setMealType(t.en)}
                className={`flex-1 rounded-lg py-2 text-[12px] font-medium transition ${
                  active ? "bg-clay text-cream" : "bg-ink/[0.05] text-ink/60 hover:bg-ink/10"
                }`}
              >
                {t.ja}
              </button>
            );
          })}
        </div>
      </div>

      {/* 価格 */}
      <div className="mt-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink/50">
          <Coins className="h-3.5 w-3.5" />
          支払った金額（任意・手入力）
        </label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-black/10 bg-white px-3 focus-within:border-clay">
            <span className="text-[13px] text-ink/45">S$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="0.00"
              value={priceSgd}
              onChange={(e) => setPriceSgd(e.target.value)}
              className="w-full bg-transparent px-2 py-2 text-[14px] text-ink focus:outline-none"
            />
          </div>
          <span className="w-24 text-right text-[12px] text-ink/45">
            ≈ ¥{jpy.toLocaleString()}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-ink/35">
          本日のレート 1 SGD ≈ ¥{rate.toFixed(1)}（自動取得）
        </p>
      </div>

      {/* 場所（地図でドラッグ調整） */}
      <div className="mt-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink/50">
          <MapPin className="h-3.5 w-3.5" />
          場所（{coords ? "ピンをドラッグして調整" : "地図をタップして設定"}）
        </label>
        <div className="h-40 overflow-hidden rounded-xl ring-1 ring-black/[0.06]">
          <LocationPicker value={coords} onChange={setCoords} />
        </div>
        {coords && (
          <button
            onClick={() => setCoords(undefined)}
            className="mt-1.5 text-[11px] text-ink/40 transition hover:text-clay"
          >
            位置をクリア
          </button>
        )}
      </div>

      {/* ジャーナル */}
      <div className="mt-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-clay/80">
          <Sparkles className="h-3.5 w-3.5" />
          ジャーナル（AIが下書き・自由に編集できます）
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 font-serif text-[14px] leading-relaxed text-ink focus:border-clay focus:outline-none"
        />
      </div>

      {/* アクション */}
      <div className="mt-5 space-y-2.5">
        {actions.map((a) =>
          a.primary ? (
            <button
              key={a.label}
              onClick={() => a.onClick(build())}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-3.5 text-cream shadow-card transition active:scale-[0.98]"
            >
              <span className="text-[14px] font-medium">{a.label}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              key={a.label}
              onClick={() => a.onClick(build())}
              className="w-full rounded-2xl bg-white py-3 text-[13px] text-ink/70 ring-1 ring-black/5 transition active:scale-[0.98]"
            >
              {a.label}
            </button>
          )
        )}
      </div>

      {/* 削除（記録の削除導線） */}
      {onDelete && (
        <div className="mt-4 border-t border-black/5 pt-4">
          {confirmDelete ? (
            <div className="rounded-xl bg-clay/5 p-3">
              <p className="mb-2.5 text-center text-[12px] text-ink/70">
                この記録を削除しますか？この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="flex-1 rounded-lg bg-clay py-2 text-[12px] font-medium text-cream active:scale-[0.98]"
                >
                  削除する
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg bg-white py-2 text-[12px] text-ink/60 ring-1 ring-black/10 active:scale-[0.98]"
                >
                  やめる
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] text-ink/45 transition hover:text-clay"
            >
              <Trash2 className="h-3.5 w-3.5" />
              この記録を削除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
