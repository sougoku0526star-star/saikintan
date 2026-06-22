import Link from "next/link";
import { Settings } from "lucide-react";
import CreatedSection from "@/components/CreatedSection";
import GohankunWidget from "@/components/GohankunWidget";

export default function HomePage() {
  return (
    <div className="px-5 pt-14">
      {/* ヘッダー */}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[12px] tracking-[0.3em] text-clay">SINGAPORE</p>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-ink">
            彩金譚
          </h1>
          <p className="mt-1 text-[12px] text-ink/50">
            食べた記憶が、そのまま記録になる。
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="設定"
          className="relative h-11 w-11 rounded-full ring-2 ring-cream transition active:scale-95"
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-clay/15 font-serif text-clay">
            悠
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-cream ring-2 ring-paper">
            <Settings className="h-3 w-3" />
          </span>
        </Link>
      </header>

      {/* ごはんくんのあいさつ */}
      <div className="mb-7">
        <GohankunWidget state="happy" size="sm" />
      </div>

      {/* タイムライン（デモ記録もユーザー記録も同じストアから） */}
      <CreatedSection />

      <p className="py-10 text-center text-[11px] text-ink/30">
        ＋ で写真を1枚足すだけ。あとはAIにおまかせ。
      </p>
    </div>
  );
}
