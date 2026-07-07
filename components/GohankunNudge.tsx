"use client";

import { useMemo } from "react";
import GohankunWidget from "./GohankunWidget";

// 低confidence（判定に自信なし）のときだけ出す、入力学習の誘導。
// 台詞は手書きローテーション（AI生成しない）。gohankun-persona の禁止事項に準拠。
const LINES = [
  "もし違ってたら教えてね！次から料理名を入れてくれると、僕もっと正確にわかるよ🍚",
  "うーん、ちょっと自信がないかも…。次は料理名も教えてくれたら、僕バッチリ当てるからね！",
  "この判定、合ってたかな？料理名を書いてくれると、次からもっと上手に記録できるよ😊",
];

export default function GohankunNudge({ seed = "" }: { seed?: string }) {
  // seed（記録ID等）が変わらない限り台詞を固定（再レンダーで揺れない）
  const line = useMemo(
    () => LINES[Math.floor(Math.random() * LINES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-clay/8 px-3 py-2.5 ring-1 ring-clay/10">
      <GohankunWidget state="thinking" size="sm" bubble={false} />
      <p className="flex-1 text-[12px] leading-relaxed text-ink/70">{line}</p>
    </div>
  );
}
