// デジタルフォトブックの組み立てロジック（純粋関数・DOM非依存）。
import type { CreatedEntry } from "./created-store";
import type { GohankunState } from "@/components/GohankunWidget";

export interface BookPhoto {
  src: string;
  label: string;
  kind: "food" | "memory";
}

export interface Spread {
  dateISO: string;
  dateLabel: string;
  photos: BookPhoto[]; // 1〜4枚
  comment: string; // ごはんくんのまとめコメント（1〜2行）
  mascot: GohankunState;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** anchor を起点に offset か月分（0=今月, -1=先月）の月初・月末ISOを返す。 */
export function monthRange(anchor: Date, offset: number): { start: string; end: string } {
  const first = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + offset + 1, 0);
  return { start: iso(first), end: iso(last) };
}

/** 期間ラベル。同一月なら「2026.06」、またがるなら「2026.01 - 2026.02」。 */
export function formatPeriodLabel(start: string, end: string): string {
  const s = start.slice(0, 7).replace("-", ".");
  const e = end.slice(0, 7).replace("-", ".");
  return s === e ? s : `${s} - ${e}`;
}

const MASCOTS: GohankunState[] = ["sing", "eating", "proud", "happy"];

// ごはんくん口調の「1日まとめコメント」（生成済みログ＝料理名から組み立て）。
function daySummary(
  dateISO: string,
  dishes: string[],
  hasMemory: boolean,
  nick: string
): string {
  const d = new Date(dateISO);
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  const dish = dishes[0] ?? "ごはん";
  const many = dishes.length >= 2;
  const patterns = [
    `${nick}、${md}は${dish}を楽しんだね！こういう一日、僕は大すきだよ。`,
    `${md}の${dish}、おいしそうだったなー。${nick}、また一緒に食べ歩こ！`,
    `がんばった一日のごほうびに${dish}だね。${nick}、えらいぞ〜！`,
    `${nick}、${md}も しっかり食べてて安心したよ。${dish}、いい選択だね！`,
  ];
  let line = patterns[d.getDate() % patterns.length];
  if (many) line = line.replace("を楽しんだね", `たちを楽しんだね`);
  if (hasMemory) line += " 写真からあったかい空気が伝わってくるよ。";
  return line;
}

/** 期間内の記録を見開き（最大4枚）に自動配置する。日付ごとにまとめる。 */
export function buildSpreads(
  records: CreatedEntry[],
  start: string,
  end: string,
  nick: string
): { spreads: Spread[]; photoCount: number; dayCount: number } {
  const inRange = records.filter((r) => r.meal.date >= start && r.meal.date <= end);

  // 日付ごとにグルーピング（古い順）
  const byDay = new Map<string, CreatedEntry[]>();
  for (const r of inRange) {
    (byDay.get(r.meal.date) ?? byDay.set(r.meal.date, []).get(r.meal.date)!).push(r);
  }
  const days = Array.from(byDay.keys()).sort();

  const spreads: Spread[] = [];
  let photoCount = 0;
  let spreadIndex = 0;

  for (const day of days) {
    const entries = byDay.get(day)!.sort((a, b) => a.createdAt - b.createdAt);
    const photos: BookPhoto[] = [];
    const dishes: string[] = [];
    let hasMemory = false;
    for (const e of entries) {
      if (e.meal.photo) {
        photos.push({ src: e.meal.photo, label: e.meal.dishNameJa, kind: "food" });
        dishes.push(e.meal.dishNameJa);
      }
      if (e.meal.memoryPhoto) {
        photos.push({ src: e.meal.memoryPhoto, label: "思い出の一枚", kind: "memory" });
        hasMemory = true;
      }
    }
    photoCount += photos.length;
    if (photos.length === 0) continue;

    const d = new Date(day);
    const dateLabel = d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    const comment = daySummary(day, dishes, hasMemory, nick);

    // 1見開き最大4枚。多い日は複数見開きに分割。
    for (let i = 0; i < photos.length; i += 4) {
      spreads.push({
        dateISO: day,
        dateLabel,
        photos: photos.slice(i, i + 4),
        comment,
        mascot: MASCOTS[spreadIndex % MASCOTS.length],
      });
      spreadIndex++;
    }
  }

  return { spreads, photoCount, dayCount: days.length };
}
