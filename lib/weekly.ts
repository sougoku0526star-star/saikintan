// 期間集計の純粋関数（週・月）。DB非依存・クライアント/サーバー共用。
// 金額の集計基準は常にJPY（通貨が混在しても正しく合算できる）。
// 表示用にメイン通貨換算値(totalMain/budgetMain)も持つ。
import type { CreatedEntry } from "./created-store";
import { formatMoney, type CurrencyCode } from "./currency";

export type PeriodKind = "week" | "month";

export interface PeriodStats {
  kind: PeriodKind;
  start: string; // 期間開始ISO（週=月曜 / 月=1日）
  label: string;
  mealsCount: number;
  totalJpy: number; // 円換算の合計（集計の基準）
  totalMain: number; // メイン通貨換算の合計（表示用）
  mainCurrency: CurrencyCode;
  budgetMain: number; // メイン通貨建ての予算
  budgetPct: number;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  pfcPct: { protein: number; fat: number; carb: number };
  dishes: string[];
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ---- 週 ----
export function weekStartISO(iso: string): string {
  const d = parseISO(iso);
  const offset = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - offset);
  return fmtISO(d);
}
export function shiftWeek(weekStart: string, delta: number): string {
  const d = parseISO(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return fmtISO(d);
}
export function weekRangeLabel(weekStart: string): string {
  const s = parseISO(weekStart);
  const e = parseISO(weekStart);
  e.setDate(e.getDate() + 6);
  return `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getMonth() + 1}月${e.getDate()}日`;
}

// ---- 月 ----
export function monthStartISO(iso: string): string {
  const d = parseISO(iso);
  return fmtISO(new Date(d.getFullYear(), d.getMonth(), 1));
}
export function shiftMonth(monthStart: string, delta: number): string {
  const d = parseISO(monthStart);
  return fmtISO(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
export function monthLabel(monthStart: string): string {
  const d = parseISO(monthStart);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// ---- 期間の汎用ヘルパー ----
export function periodStartOf(kind: PeriodKind, iso: string): string {
  return kind === "week" ? weekStartISO(iso) : monthStartISO(iso);
}
export function shiftPeriod(kind: PeriodKind, start: string, delta: number): string {
  return kind === "week" ? shiftWeek(start, delta) : shiftMonth(start, delta);
}
function periodEnd(kind: PeriodKind, start: string): string {
  const d = parseISO(start);
  if (kind === "week") {
    d.setDate(d.getDate() + 6);
    return fmtISO(d);
  }
  return fmtISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); // 月末
}
function periodLabel(kind: PeriodKind, start: string): string {
  return kind === "week" ? weekRangeLabel(start) : monthLabel(start);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 指定期間（週/月）の記録を集計する。budget はその期間の予算。 */
export function aggregatePeriod(
  records: CreatedEntry[],
  kind: PeriodKind,
  start: string,
  budgetMain: number,
  mainCurrency: CurrencyCode,
  rateMain: number // 1 メイン通貨 = ? JPY
): PeriodStats {
  const end = periodEnd(kind, start);
  const inP = records.filter((r) => r.meal.date >= start && r.meal.date <= end);

  let totalJpy = 0,
    calories = 0,
    protein = 0,
    fat = 0,
    carb = 0,
    sodium = 0;
  const dishes: string[] = [];

  for (const r of inP) {
    const m = r.meal;
    totalJpy += m.spend.jpy || 0;
    if (m.nutrition) {
      calories += m.nutrition.calories || 0;
      protein += m.nutrition.protein || 0;
      fat += m.nutrition.fat || 0;
      carb += m.nutrition.carb || 0;
      sodium += m.nutrition.sodium || 0;
    }
    dishes.push(m.dishNameJa);
  }

  const pCal = protein * 4,
    fCal = fat * 9,
    cCal = carb * 4;
  const macroCal = pCal + fCal + cCal;
  const pfcPct = macroCal
    ? {
        protein: Math.round((pCal / macroCal) * 100),
        fat: Math.round((fCal / macroCal) * 100),
        carb: Math.round((cCal / macroCal) * 100),
      }
    : { protein: 0, fat: 0, carb: 0 };

  const totalMain = rateMain > 0 ? totalJpy / rateMain : 0;

  return {
    kind,
    start,
    label: periodLabel(kind, start),
    mealsCount: inP.length,
    totalJpy: Math.round(totalJpy),
    totalMain: round1(totalMain),
    mainCurrency,
    budgetMain: budgetMain,
    budgetPct: budgetMain ? Math.round((totalMain / budgetMain) * 100) : 0,
    calories: Math.round(calories),
    protein: round1(protein),
    fat: round1(fat),
    carb: round1(carb),
    sodium: Math.round(sodium),
    pfcPct,
    dishes,
  };
}

export interface WeeklyLetter {
  greeting: string;
  body: string[];
  sign: string;
}

/** AIキーが無い/失敗時の、集計値からの定型レター。 */
export function fallbackLetter(s: PeriodStats): WeeklyLetter {
  const term = s.kind === "week" ? "今週" : "今月";
  const within = s.totalMain <= s.budgetMain;
  const money = `${formatMoney(s.totalMain, s.mainCurrency)}（約 ¥${s.totalJpy.toLocaleString()}）`;
  const dominant =
    s.pfcPct.carb >= s.pfcPct.fat && s.pfcPct.carb >= s.pfcPct.protein
      ? "炭水化物"
      : s.pfcPct.fat >= s.pfcPct.protein
        ? "脂質"
        : "タンパク質";
  const avg = s.mealsCount ? Math.round(s.calories / s.mealsCount) : 0;
  return {
    greeting: `${term}もおつかれさま！`,
    body: [
      `${term}は${s.mealsCount}食を記録してくれたね。食費は ${money}、予算 ${formatMoney(s.budgetMain, s.mainCurrency)} に対して ${s.budgetPct}% だよ。${
        within ? "ちゃんと予算におさまってて、いいペース！僕もうれしいなー。" : "ちょっとだけ予算オーバーかな…無理しない範囲で配分を気にしてみよ？"
      }`,
      `1食あたり平均 ${avg} kcal。カロリー比だと${dominant}が中心の${term === "今週" ? "一週間" : "一か月"}だったみたい。${
        dominant === "炭水化物"
          ? "お野菜やタンパク質の一皿を足すと、もっと彩りよくなるよ！"
          : dominant === "脂質"
            ? "揚げ物がつづいたら、蒸し・ゆでの一皿もはさんでみよ？"
            : "すごくいいバランス！この調子で楽しみながらいこうね。"
      }`,
      `遠いところでがんばってる君を、僕はいつも応援してるよ。また次のごはん、楽しみにしてるね！`,
    ],
    sign: "— ごはんくんより",
  };
}
