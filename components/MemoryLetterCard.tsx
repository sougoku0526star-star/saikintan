"use client";

import { useState } from "react";
import { Feather, PenLine, Heart, Check, X } from "lucide-react";
import type { MealEntry, MemoryLetter } from "@/lib/mock-data";
import GohankunWidget from "./GohankunWidget";

// 思い出レター（P1-3）。詳細画面に表示。
// - レター未生成 & 編集可: 「思い出にする」トグル → /api/memory-letter を呼ぶ
// - 生成中: 「ご飯君がお手紙を書いてるよ…」の演出（API遅延を演出として使う）
// - レターあり: 便箋風に表示。「書き換える」で編集 → 保存で edited=1（あなたの言葉バッジ）
export default function MemoryLetterCard({
  meal,
  recordId,
  editable,
  onChange,
}: {
  meal: MealEntry;
  recordId?: string;
  editable: boolean;
  onChange?: (meal: MealEntry) => void;
}) {
  const letter = meal.memoryLetter;
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftGreeting, setDraftGreeting] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftSign, setDraftSign] = useState("");

  const canWrite = editable && !!onChange && !!recordId;

  // 「思い出にする」→ レター生成
  const generate = async () => {
    if (!canWrite) return;
    setWriting(true);
    setError(null);
    try {
      const res = await fetch("/api/memory-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordId }),
      });
      const data = await res.json();
      if (!res.ok || !data.letter) throw new Error(data.error || "failed");
      // サーバーは保存済み。クライアントストアにも反映
      onChange?.({ ...meal, isMemory: true, memoryLetter: data.letter as MemoryLetter });
    } catch {
      setError("お手紙をうまく書けなかったみたい…もう一度ためしてね。");
    } finally {
      setWriting(false);
    }
  };

  const startEdit = () => {
    if (!letter) return;
    setDraftGreeting(letter.greeting);
    setDraftBody(letter.body.join("\n\n"));
    setDraftSign(letter.sign);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!letter) return;
    const body = draftBody
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    onChange?.({
      ...meal,
      isMemory: true,
      memoryLetter: {
        greeting: draftGreeting.trim() || letter.greeting,
        body: body.length ? body : letter.body,
        sign: draftSign.trim() || "— ごはんくんより",
        edited: true, // ユーザーが書き換えた＝あなたの言葉
      },
    });
    setEditing(false);
  };

  // --- 生成中の演出 ---
  if (writing) {
    return (
      <section className="mt-6 animate-fade-up rounded-2xl bg-[#FBF6EC] p-6 text-center ring-1 ring-[#E7D9BE]">
        <div className="flex justify-center">
          <GohankunWidget
            state="thinking"
            size="md"
            message="お手紙を書いてるよ…ちょっと待っててね"
          />
        </div>
        <p className="mt-4 text-[12px] tracking-wide text-clay/70">
          ご飯くんがお手紙を書いてるよ…
        </p>
      </section>
    );
  }

  // --- レター未生成: 「思い出にする」トグル ---
  if (!letter) {
    if (!canWrite) return null;
    return (
      <section className="mt-6 animate-fade-up rounded-2xl border border-dashed border-[#E0CFA8] bg-[#FBF6EC]/60 p-5 text-center">
        <div className="mb-1 flex items-center justify-center gap-1.5 text-[12px] font-medium tracking-wide text-clay/80">
          <Feather className="h-3.5 w-3.5" />
          思い出レター
        </div>
        <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-ink/55">
          この一食を「思い出」にすると、ごはんくんがあなたへ手紙を書きます。
        </p>
        <button
          onClick={generate}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream shadow-card transition active:scale-95"
        >
          <Heart className="h-4 w-4" />
          思い出にする
        </button>
        {error && <p className="mt-3 text-[11px] text-clay/80">{error}</p>}
      </section>
    );
  }

  // --- レター表示（便箋風）---
  return (
    <section className="mt-6 animate-fade-up">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-clay/80">
          <Feather className="h-3.5 w-3.5" />
          ごはんくんからの思い出レター
        </div>
        {letter.edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage/12 px-2 py-0.5 text-[10px] text-sage">
            <Heart className="h-2.5 w-2.5" />
            あなたの言葉
          </span>
        )}
      </div>

      {/* 便箋 */}
      <div
        className="rounded-2xl bg-[#FBF6EC] p-6 shadow-card ring-1 ring-[#E7D9BE]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 33px, rgba(180,138,62,0.10) 33px, rgba(180,138,62,0.10) 34px)",
        }}
      >
        {editing ? (
          <div className="space-y-3">
            <input
              value={draftGreeting}
              onChange={(e) => setDraftGreeting(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 font-serif text-[15px] text-ink focus:border-clay focus:outline-none"
              placeholder="書き出し"
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 font-serif text-[15px] leading-[1.9] text-ink focus:border-clay focus:outline-none"
              placeholder="本文（段落は空行で区切ってね）"
            />
            <input
              value={draftSign}
              onChange={(e) => setDraftSign(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-right font-serif text-[13px] text-ink/70 focus:border-clay focus:outline-none"
              placeholder="— 署名"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-4 py-2 text-[12px] text-ink/60 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
                取消
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center gap-1 rounded-full bg-clay px-4 py-2 text-[12px] text-cream active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-serif text-[15px] leading-[2.06] text-ink/85">
              {letter.greeting}
            </p>
            {letter.body.map((p, i) => (
              <p
                key={i}
                className="mt-3 whitespace-pre-wrap font-serif text-[15px] leading-[2.06] text-ink/85"
              >
                {p}
              </p>
            ))}
            <p className="mt-4 text-right font-serif text-[13px] text-ink/60">
              {letter.sign}
            </p>
          </>
        )}
      </div>

      {editable && !editing && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-[12px] text-ink/70 shadow-card backdrop-blur transition active:scale-95"
          >
            <PenLine className="h-3.5 w-3.5" />
            書き換える
          </button>
        </div>
      )}
    </section>
  );
}
