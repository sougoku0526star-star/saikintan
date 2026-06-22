"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarDays, MessageCircle, Sparkles, Plus } from "lucide-react";
import { OPEN_UPLOAD_EVENT } from "@/lib/created-store";

export default function BottomNav() {
  const pathname = usePathname();
  const isAlbum = pathname === "/" || pathname.startsWith("/entry");
  const isCalendar = pathname.startsWith("/calendar");
  const isMessages = pathname.startsWith("/messages");
  const isWeekly = pathname.startsWith("/weekly");

  // チャットスレッドは集中画面のためナビを隠す
  if (/^\/messages\/.+/.test(pathname)) return null;

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <div className="relative mx-auto max-w-[440px]">
        {/* 中央のFAB（写真アップロード） */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_UPLOAD_EVENT))}
          aria-label="写真を追加"
          className="pointer-events-auto absolute -top-7 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-clay text-cream shadow-[0_12px_24px_-6px_rgba(201,110,74,0.7)] ring-4 ring-paper transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.4} />
        </button>

        <div className="pointer-events-auto flex items-center justify-between border-t border-black/5 bg-cream/90 px-4 pb-6 pt-3 backdrop-blur-md">
          <div className="flex gap-1">
            <NavItem href="/" active={isAlbum} icon={<BookHeart className="h-6 w-6" />} label="アルバム" />
            <NavItem href="/calendar" active={isCalendar} icon={<CalendarDays className="h-6 w-6" />} label="カレンダー" />
          </div>
          <div className="w-12" aria-hidden />
          <div className="flex gap-1">
            <NavItem href="/messages" active={isMessages} icon={<MessageCircle className="h-6 w-6" />} label="メッセージ" />
            <NavItem href="/weekly" active={isWeekly} icon={<Sparkles className="h-6 w-6" />} label="ふりかえり" />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 text-[11px] tracking-wide transition-colors ${
        active ? "text-clay" : "text-ink/40"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
