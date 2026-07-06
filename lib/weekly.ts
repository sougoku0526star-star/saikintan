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
  vegetableRatio: number; // 野菜系メニューの出現率 0〜1（方向感用）
  eatingOutRatio: number; // 外食（＝自炊でない）比率 0〜1（方向感用）
  dishes: string[];
}

// ---- 栄養の方向感（Trend）------------------------------------------------
// 「支出は精密・栄養はゆるく」の原則により、栄養は数値を出さず low/ok/high の
// 方向感だけをAIに渡す。閾値は一般的な目安で「明らかな偏りだけ拾う」。

export type Trend = "low" | "ok" | "high";

export interface NutritionTrend {
  protein: Trend;
  fat: Trend;
  carb: Trend;
  vegetable: Trend;
  sodium: Trend;
  eatingOutRatio: Trend;
}

// 閾値（根拠コメント付き）。厳密さより方向感。
const TREND = {
  // PFCカロリー比（一般的な目安: P 13–20% / F 20–30% / C 50–65%）
  proteinLowPct: 13,
  proteinHighPct: 20,
  fatLowPct: 20,
  fatHighPct: 35,
  carbLowPct: 45,
  carbHighPct: 65,
  // 1食あたりナトリウム(mg)。日本人の食塩目安 ~6.5g/日 ≒ 1食 ~850mg 前後
  sodiumLowPerMeal: 500,
  sodiumHighPerMeal: 1200,
  // 野菜系メニューの出現率
  vegLowRatio: 0.15,
  vegHighRatio: 0.5,
  // 外食比率
  eatOutLowRatio: 0.3,
  eatOutHighRatio: 0.7,
};

function band(v: number, low: number, high: number): Trend {
  return v < low ? "low" : v > high ? "high" : "ok";
}

/** 集計結果を「方向感（low/ok/high）」へ丸める。数値は一切外に出さない。 */
export function toNutritionTrend(s: PeriodStats): NutritionTrend {
  const perMealSodium = s.mealsCount ? s.sodium / s.mealsCount : 0;
  return {
    protein: band(s.pfcPct.protein, TREND.proteinLowPct, TREND.proteinHighPct),
    fat: band(s.pfcPct.fat, TREND.fatLowPct, TREND.fatHighPct),
    carb: band(s.pfcPct.carb, TREND.carbLowPct, TREND.carbHighPct),
    vegetable: s.mealsCount ? band(s.vegetableRatio, TREND.vegLowRatio, TREND.vegHighRatio) : "ok",
    sodium: band(perMealSodium, TREND.sodiumLowPerMeal, TREND.sodiumHighPerMeal),
    eatingOutRatio: band(s.eatingOutRatio, TREND.eatOutLowRatio, TREND.eatOutHighRatio),
  };
}

const TREND_JA: Record<Trend, string> = { low: "少なめ", ok: "いい感じ", high: "多め" };

/** 方向感を日本語ラベルに（AIに渡す用）。例: 「タンパク質: いい感じ / 野菜: 少なめ」 */
export function nutritionTrendLabels(t: NutritionTrend): string {
  return [
    `タンパク質: ${TREND_JA[t.protein]}`,
    `脂質: ${TREND_JA[t.fat]}`,
    `炭水化物: ${TREND_JA[t.carb]}`,
    `野菜: ${TREND_JA[t.vegetable]}`,
    `塩分: ${TREND_JA[t.sodium]}`,
    `外食: ${TREND_JA[t.eatingOutRatio]}`,
  ].join(" / ");
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
    sodium = 0,
    vegCount = 0,
    homeCount = 0;
  const dishes: string[] = [];
  const VEG_RE = /野菜|ベジ|サラダ|グリーン|空芯菜|ほうれん|ブロッコリ|温野菜/;

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
    // 野菜系：栄養タグ or 料理名から判定
    if (
      m.nutritionTags?.some((t) => VEG_RE.test(t.label)) ||
      VEG_RE.test(m.dishNameJa)
    ) {
      vegCount++;
    }
    // 自炊判定：日本食品標準成分表（家庭料理）由来を自炊とみなし、それ以外は外食扱い
    if ((m.source ?? "").includes("日本食品標準成分表")) homeCount++;
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
    vegetableRatio: inP.length ? vegCount / inP.length : 0,
    eatingOutRatio: inP.length ? (inP.length - homeCount) / inP.length : 0,
    dishes,
  };
}

export interface WeeklyLetter {
  greeting: string;
  body: string[];
  sign: string;
}

/** AIキーが無い/失敗時の、集計値からの定型レター。
 *  栄養は数値を出さず方向感のみ。支出（金額・予算・%）は精密でOK。提案は1個だけ。 */
export function fallbackLetter(s: PeriodStats): WeeklyLetter {
  const term = s.kind === "week" ? "今週" : "今月";
  const within = s.totalMain <= s.budgetMain;
  const money =
    s.mainCurrency === "JPY"
      ? formatMoney(s.totalMain, s.mainCurrency)
      : `${formatMoney(s.totalMain, s.mainCurrency)}（約 ¥${s.totalJpy.toLocaleString()}）`;
  const t = toNutritionTrend(s);

  // 方向感から「気になる1点」を選び、提案は必ず1個だけ添える
  let noticed: string;
  if (t.vegetable === "low") {
    noticed = "お野菜がちょっと少なめだったかな。次はサラダを1皿そえてみよ？";
  } else if (t.fat === "high") {
    noticed = "こってり系が多めだったみたい。蒸し・ゆでの一皿を一度はさんでみよ？";
  } else if (t.sodium === "high") {
    noticed = "味しっかりめの日が多かったね。スープを半分残すだけでもいい感じだよ。";
  } else if (t.eatingOutRatio === "high") {
    noticed = "外食が多めの週だったね。一度だけおうちごはんを入れると、ほっとするよ。";
  } else if (t.protein === "low") {
    noticed = "たんぱく質が少なめかも。卵かお豆腐を1品足すと元気が出るよ！";
  } else {
    noticed = "全体のバランス、いい感じだったよ。この調子で楽しみながらいこうね。";
  }

  return {
    greeting: `${term}もおつかれさま！`,
    body: [
      `${term}は${s.mealsCount}食を記録してくれたね。食費は ${money}、予算 ${formatMoney(s.budgetMain, s.mainCurrency)} に対して ${s.budgetPct}% だよ。${
        within ? "ちゃんと予算におさまってて、いいペース！僕もうれしいなー。" : "ちょっとだけ予算オーバーかな…無理しない範囲で配分を気にしてみよ？"
      }`,
      noticed,
      `遠いところでがんばってる君を、僕はいつも応援してるよ。また次のごはん、楽しみにしてるね！`,
    ],
    sign: "— ごはんくんより",
  };
}
