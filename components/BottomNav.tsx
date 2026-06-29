"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarDays, BookOpen, MessageCircle, Sparkles, Plus } from "lucide-react";
import { OPEN_UPLOAD_EVENT } from "@/lib/created-store";

export default function BottomNav() {
  const pathname = usePathname();
  const isAlbum = pathname === "/" || pathname.startsWith("/entry");
  const isCalendar = pathname.startsWith("/calendar");
  const isPhotobook = pathname.startsWith("/photobook");
  const isMessages = pathname.startsWith("/messages");
  const isWeekly = pathname.startsWith("/weekly");

  // チャットスレッドは集中画面のためナビを隠す
  if (/^\/messages\/.+/.test(pathname)) return null;

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <div className="relative mx-auto max-w-[440px]">
        {/* 写真アップロード（バーの上にフローティング） */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_UPLOAD_EVENT))}
          aria-label="写真を追加"
          className="pointer-events-auto absolute bottom-full right-4 mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-cream shadow-[0_12px_24px_-6px_rgba(201,110,74,0.7)] ring-4 ring-paper transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </button>

        <div className="pointer-events-auto flex items-center justify-between border-t border-black/5 bg-cream/90 px-2 pb-6 pt-3 backdrop-blur-md">
          <NavItem href="/" active={isAlbum} icon={<BookHeart className="h-6 w-6" />} label="アルバム" />
          <NavItem href="/calendar" active={isCalendar} icon={<CalendarDays className="h-6 w-6" />} label="カレンダー" />
          <NavItem href="/photobook" active={isPhotobook} icon={<BookOpen className="h-6 w-6" />} label="フォトブック" />
          <NavItem href="/messages" active={isMessages} icon={<MessageCircle className="h-6 w-6" />} label="メッセージ" />
          <NavItem href="/weekly" active={isWeekly} icon={<Sparkles className="h-6 w-6" />} label="ふりかえり" />
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
      className={`flex w-[60px] flex-col items-center gap-1 transition-colors ${
        active ? "text-clay" : "text-ink/40"
      }`}
    >
      {icon}
      <span className="whitespace-nowrap text-[10px] leading-none">{label}</span>
    </Link>
  );
}
