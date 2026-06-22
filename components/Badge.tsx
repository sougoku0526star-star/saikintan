import type { ReactNode } from "react";

type Tone = "good" | "watch" | "neutral" | "gold";

const toneStyles: Record<Tone, string> = {
  good: "bg-sage/12 text-sage ring-sage/20",
  watch: "bg-clay/10 text-clay ring-clay/20",
  neutral: "bg-ink/[0.06] text-ink/70 ring-ink/10",
  gold: "bg-gold/10 text-gold ring-gold/25",
};

// 「目立ちすぎない、洗練された」データタグ
export default function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 ring-inset ${toneStyles[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
