"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Camera,
  Utensils,
  Salad,
  MapPin,
  Check,
  Sparkles,
  Pencil,
} from "lucide-react";
import { addRecord, OPEN_UPLOAD_EVENT } from "@/lib/created-store";
import { recordCandidate } from "@/lib/candidates-store";
import type { MealEntry } from "@/lib/mock-data";
import { prepareImage } from "@/lib/image";
import MealEditForm from "./MealEditForm";
import GohankunWidget from "./GohankunWidget";

type Phase = "closed" | "pick" | "analyze" | "confirm";

const STEPS = [
  { icon: Utensils, label: "料理を認識しています" },
  { icon: Salad, label: "栄養を計算しています" },
  { icon: MapPin, label: "場所を推定しています" },
  { icon: Pencil, label: "ジャーナルを下書きしています" },
];

const SAMPLES = [
  {
    slug: "char-kway-teow",
    name: "チャークウェイティオウ",
    photo:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
  },
  {
    slug: "hainanese-chicken-rice-steamed",
    name: "海南チキンライス",
    photo:
      "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=80",
  },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function UploadFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("closed");
  const [step, setStep] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const [photo, setPhoto] = useState<string>("");
  const [meal, setMeal] = useState<MealEntry | null>(null);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // FAB から開く
  useEffect(() => {
    const open = () => {
      setPhase("pick");
      setStep(0);
      setError("");
    };
    window.addEventListener(OPEN_UPLOAD_EVENT, open);
    return () => window.removeEventListener(OPEN_UPLOAD_EVENT, open);
  }, []);

  // 解析アニメーション
  useEffect(() => {
    if (phase !== "analyze") return;
    setStep(0);
    setAnimDone(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= STEPS.length; i++) {
      timers.push(setTimeout(() => setStep(i), i * 680));
    }
    timers.push(setTimeout(() => setAnimDone(true), STEPS.length * 680 + 400));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // アニメーション完了＋API応答が揃ったら確認ステップへ
  useEffect(() => {
    if (phase === "analyze" && animDone && meal) setPhase("confirm");
  }, [phase, animDone, meal]);

  const analyze = useCallback(
    async (photoUrl: string, payload: Record<string, unknown>) => {
      setPhoto(photoUrl);
      setMeal(null);
      setError("");
      setPhase("analyze");
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, photo: photoUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.meal) throw new Error(data.error || "analyze failed");
        // 既定の日付はローカル今日に。価格は0（手入力）。
        const m: MealEntry = {
          ...(data.meal as MealEntry),
          confidence: data.confidence,
          date: todayISO(),
        };
        setSource(data.source ?? "");
        setMeal(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : "解析に失敗しました");
        setAnimDone(true);
        setPhase("pick");
      }
    },
    []
  );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // GPSは変換でEXIFが消えるため、変換前のオリジナルから読む
    let exifCoords: { lat: number; lng: number } | undefined;
    try {
      const exifr = (await import("exifr")).default;
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === "number") {
        exifCoords = { lat: gps.latitude, lng: gps.longitude };
      }
    } catch {
      /* EXIF無し/読み取り不可は無視 */
    }
    // HEIC→JPEG変換＋リサイズ（表示崩れ・Vision非対応を回避）
    const { dataUrl, base64, mime } = await prepareImage(file);
    analyze(dataUrl, { imageBase64: base64, mimeType: mime, exifCoords });
  };

  const close = () => {
    setPhase("closed");
    setMeal(null);
    setPhoto("");
    setError("");
  };

  // 編集フォームから受け取った最終内容で確定（サーバーへ保存）
  const save = async (updated: MealEntry, goJournal: boolean) => {
    if (source === "vision_estimate") {
      recordCandidate(updated, updated.confidence ?? 0);
    }
    const rec = await addRecord(updated);
    close();
    router.push(goJournal && rec ? `/entry/${rec.id}` : "/");
  };

  if (phase === "closed") return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <button
        aria-label="閉じる"
        onClick={close}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      {/* === 写真選択シート === */}
      {phase === "pick" && (
        <div className="mt-auto animate-sheet-up rounded-t-[2rem] bg-paper p-6 pb-10 shadow-[0_-20px_50px_-20px_rgba(43,39,34,0.5)]">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-ink/15" />
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-clay" />
            <h2 className="font-serif text-lg text-ink">新しい思い出を1タップで</h2>
          </div>
          <p className="mb-5 text-[12px] text-ink/50">
            写真を選ぶだけ。料理名・カロリー・栄養はAIが計算し、料理名・分量・日付・価格・メモは次の画面で編集できます。
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-clay/10 px-3 py-3">
              <GohankunWidget state="sad" size="sm" bubble={false} />
              <p className="flex-1 text-[12px] text-clay">{error}</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-2xl bg-clay px-4 py-5 text-cream shadow-card transition active:scale-95"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-[13px] font-medium">写真をえらぶ</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-5 text-ink/70 shadow-card ring-1 ring-black/5 transition active:scale-95"
            >
              <Camera className="h-7 w-7" />
              <span className="text-[13px] font-medium">撮影する</span>
            </button>
          </div>

          <p className="mb-2 mt-6 text-[11px] tracking-wide text-ink/40">
             または、サンプルで体験する
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLES.map((s) => (
              <button
                key={s.slug}
                onClick={() => analyze(s.photo, { slug: s.slug })}
                className="group relative aspect-[5/3] overflow-hidden rounded-xl bg-ink/5 ring-1 ring-black/5 transition active:scale-95"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photo}
                  alt={s.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-2 py-1.5 text-left text-[11px] font-medium text-cream">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === 解析アニメーション === */}
      {phase === "analyze" && (
        <div className="m-auto w-[88%] max-w-[360px] animate-pop rounded-[1.6rem] bg-paper p-6 shadow-polaroid">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-2xl bg-ink/5">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="解析中の写真" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-cream/40 to-transparent" />
            <div className="absolute inset-0 ring-2 ring-inset ring-clay/40" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[10px] text-cream backdrop-blur">
              <Sparkles className="h-3 w-3 animate-twinkle text-clay" />
              AIが解析中
            </div>
          </div>

          {/* ごはんくんは解析中おやすみ中（ゆっくりpulse） */}
          <div className="mt-4 flex justify-center">
            <GohankunWidget state="sleep" size="sm" bubblePosition="right" />
          </div>

          <div className="mt-5 space-y-2.5">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 transition-all duration-300 ${
                    done || active ? "opacity-100" : "opacity-35"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      done
                        ? "bg-sage text-cream"
                        : active
                          ? "bg-clay/15 text-clay"
                          : "bg-ink/5 text-ink/40"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      <Icon className={`h-4 w-4 ${active ? "animate-twinkle" : ""}`} />
                    )}
                  </span>
                  <span
                    className={`text-[13px] ${
                      done ? "text-ink/70" : active ? "font-medium text-ink" : "text-ink/40"
                    }`}
                  >
                    {s.label}
                    {active && <span className="animate-pulse">…</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === 確認・編集ステップ（共有フォーム） === */}
      {phase === "confirm" && meal && (
        <MealEditForm
          meal={meal}
          onClose={close}
          actions={[
            { label: "この内容で記録する", primary: true, onClick: (m) => save(m, true) },
            { label: "記録してアルバムへ", onClick: (m) => save(m, false) },
          ]}
        />
      )}
    </div>
  );
}
