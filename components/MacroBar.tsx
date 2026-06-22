import type { MacroLevel } from "@/lib/mock-data";

const levelToPct: Record<MacroLevel, number> = {
  low: 28,
  mid: 58,
  high: 90,
};

const levelLabel: Record<MacroLevel, string> = {
  low: "ひかえめ",
  mid: "ほどよく",
  high: "しっかり",
};

// 円グラフではなく、控えめな横棒で「ざっくり」を伝える
export default function MacroBar({
  label,
  level,
  accent,
}: {
  label: string;
  level: MacroLevel;
  accent: string;
}) {
  const pct = levelToPct[level];
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[12px] text-ink/55">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-[11px] text-ink/45">
        {levelLabel[level]}
      </span>
    </div>
  );
}
