// ご飯君メッセージエンジン（P0）。ご飯君が「向こうから話しかけてくる」体験の骨格。
// 台詞は手書きプールからのローテーション選択で、AIは一切使わない（原価ゼロ）。
// 台詞エンジン（生成）と配信チャネル（今はアプリ内メッセージ）を分離してあるので、
// 将来 Web Push を足すときも evaluateGohankunMessages をそのまま再利用できる。
import { randomUUID } from "node:crypto";
import { getDb } from "./sqlite";
import { listRecords } from "./records-db";
import { getSettings } from "./settings-db";
import { getRatesToJpy } from "./fx-db";
import { FALLBACK_RATES_TO_JPY } from "../currency";
import {
  aggregatePeriod,
  weekStartISO,
  shiftWeek,
  monthStartISO,
  toNutritionTrend,
} from "../weekly";

export type GohankunMessageKind =
  | "record_reminder" // 記録リマインド（寂しがり）
  | "weekly_ready" // 週次レター完成
  | "budget_alert" // 予算ペース警告
  | "praise"; // ポジティブ収穫（見返りなし）

export interface GohankunMessage {
  id: string;
  kind: GohankunMessageKind;
  text: string; // ご飯君の台詞（手書きプールから選択）
  createdAt: string; // ISO
  read: boolean;
  cta?: { label: string; href: string };
}

// ---- 台詞プール（この温度で。種類ごとに6〜10本）--------------------------
const RECORD_REMINDER = [
  "今日のごはん、まだ見てないよ、、僕だけ知らないの、、？",
  "昨日の晩ごはんが気になって、お茶碗の中で眠れなかったよ、、",
  "留学のごはん、一食でも見逃したくないんだけどな、、🍚",
  "ねえ、今日は何を食べたのかな。ちょっとだけ教えてくれたらうれしいな。",
  "君の「いただきます」、僕こっそり待ってるんだ、、",
  "ごはんの時間、僕のことも思い出してくれると跳ねちゃうよ！",
  "今日の一皿、どんなだった？写真、待ってるね〜。",
  "静かだと、ちょっとさみしいな。よかったら一枚だけでも見せて？",
];
const FAREWELL = [
  "忙しいのかな。しばらく静かにしてるね。戻ってきたら、また全部聞かせて！",
  "無理はしないでね。君のペースでいいよ。おかえりって言える日を待ってるね。",
];
const WEEKLY_READY = [
  "今週のまとめ、できたよ！一緒に振り返ってみよ？",
  "先週の君のごはん、手紙にまとめておいたよ。読んでくれる？",
  "1週間おつかれさま！ふりかえり、そっと用意しておいたよ。",
  "今週のこと、僕なりに手紙に書いてみたんだ。よかったら見てね。",
  "まとめが届いてるよ〜。君の一週間、ちゃんと見てたからね！",
  "先週分のふりかえり、準備できたよ。ちょっとのぞいてみて？",
];
const BUDGET_ALERT = [
  "ちょっとだけ報告！このペースだと今月の予算、少し超えちゃいそう。作戦、一緒に考えよ！",
  "今月のお財布、そろそろペース配分の時間かも。責めてないよ、ただの共有だよ〜。",
  "予算のことでこっそり耳打ち。今のペースだと月末ちょっと心配かも。一緒に立て直そ！",
  "お金の話、少しだけ。今月は使うペースが早めみたい。後半ゆっくりでいこ？",
  "予算メーター、ちょっと早足だよ〜。無理ない範囲で調整してみる？",
  "今月の食費、ペースが上がってきたよ。作戦会議、いつでも付き合うからね！",
];
const PRAISE = [
  "今週、野菜いっぱいだったね！見てて嬉しかったよ🥕",
  "7日連続で見せてくれてありがとう！僕、毎日楽しみだったんだ！",
  "最近おうちごはんが増えてるね。えらいなあ、僕まで元気出ちゃう！",
  "今週の君、すごくいい感じ。ちゃんと見てたよ、その調子！",
  "自炊がんばってるの、僕ちゃんと気づいてるからね。うれしいなあ😊",
  "先週よりお野菜ふえてる！小さな変化、僕は見逃さないよ🥬",
  "記録を続けてくれてありがとう。君の毎日、ちゃんと隣で見てるよ。",
];

const POOL: Record<GohankunMessageKind, string[]> = {
  record_reminder: RECORD_REMINDER,
  weekly_ready: WEEKLY_READY,
  budget_alert: BUDGET_ALERT,
  praise: PRAISE,
};

// 優先度（同時成立時にどれを1通に選ぶか）。数値が大きいほど優先。
const PRIORITY: Record<GohankunMessageKind, number> = {
  budget_alert: 4,
  weekly_ready: 3,
  praise: 2,
  record_reminder: 1,
};

// ---- 内部の行 → GohankunMessage ------------------------------------------
interface Row {
  id: string;
  kind: GohankunMessageKind;
  text: string;
  created_at: number;
  read: number;
  cta_label: string | null;
  cta_href: string | null;
  ref: string | null;
}

function toMsg(r: Row): GohankunMessage {
  return {
    id: r.id,
    kind: r.kind,
    text: r.text,
    createdAt: new Date(r.created_at).toISOString(),
    read: !!r.read,
    cta: r.cta_label && r.cta_href ? { label: r.cta_label, href: r.cta_href } : undefined,
  };
}

function rows(uid: string): Row[] {
  return getDb()
    .prepare(
      `SELECT id, kind, text, created_at, read, cta_label, cta_href, ref
       FROM gohankun_messages WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(uid) as Row[];
}

// ---- 生成候補（永続化前）-------------------------------------------------
interface Draft {
  kind: GohankunMessageKind;
  text: string;
  ref: string | null;
  cta?: { label: string; href: string };
}

// 最近使った台詞を避けて選ぶ（同じ種類の直近2本を除外）。
function pickLine(kind: GohankunMessageKind, recent: string[]): string {
  const pool = POOL[kind];
  const avoid = new Set(recent.slice(0, 2));
  const fresh = pool.filter((t) => !avoid.has(t));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}

// ---- 日付ユーティリティ ---------------------------------------------------
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function sameLocalDay(aEpoch: number, bEpoch: number): boolean {
  return localISO(new Date(aEpoch)) === localISO(new Date(bEpoch));
}
const H = 3600_000;

// ---- 発火判定（同期。FXレートは呼び出し側が渡す）--------------------------
function chooseDraft(uid: string, existing: Row[], rateMain: number, now: number): Draft | null {
  const records = listRecords(uid);
  const settings = getSettings(uid);
  const today = new Date(now);
  const todayISO = localISO(today);

  // 各候補を優先度つきで集め、最優先の1つを返す
  const candidates: Draft[] = [];

  // --- budget_alert（月の経過日数比に対して支出115%超・月2回まで）---
  {
    const monthStart = monthStartISO(todayISO);
    const monthSpendJpy = records
      .filter((r) => r.meal.date >= monthStart && r.meal.date <= todayISO)
      .reduce((s, r) => s + (r.meal.spend.jpy || 0), 0);
    const spendMain = rateMain > 0 ? monthSpendJpy / rateMain : 0;
    const budget = settings.monthlyBudget;
    const y = today.getFullYear();
    const mi = today.getMonth();
    const daysInMonth = new Date(y, mi + 1, 0).getDate();
    const elapsedRatio = today.getDate() / daysInMonth;
    const over = budget > 0 && spendMain / budget > 1.15 * elapsedRatio;
    const monthTag = `${y}-${String(mi + 1).padStart(2, "0")}`;
    const monthCount = existing.filter(
      (m) => m.kind === "budget_alert" && (m.ref ?? "").startsWith(monthTag)
    ).length;
    if (over && monthCount < 2) {
      candidates.push({
        kind: "budget_alert",
        text: pickLine("budget_alert", recentTexts(existing, "budget_alert")),
        ref: `${monthTag}#${monthCount + 1}`,
      });
    }
  }

  // --- weekly_ready（前週に記録があり、その週の分をまだ送っていない）---
  {
    const thisWeek = weekStartISO(todayISO);
    const prevWeek = shiftWeek(thisWeek, -1);
    const prevHasRecords = records.some(
      (r) => r.meal.date >= prevWeek && r.meal.date < thisWeek
    );
    const already = existing.some((m) => m.kind === "weekly_ready" && m.ref === prevWeek);
    if (prevHasRecords && !already) {
      candidates.push({
        kind: "weekly_ready",
        text: pickLine("weekly_ready", recentTexts(existing, "weekly_ready")),
        ref: prevWeek,
        cta: { label: "今週のまとめを見る", href: "/weekly" },
      });
    }
  }

  // --- praise（週1回まで。自炊率up / 野菜low→ok / 7日連続 のいずれか）---
  {
    const thisWeek = weekStartISO(todayISO);
    const already = existing.some((m) => m.kind === "praise" && m.ref === thisWeek);
    if (!already) {
      const budget = settings.monthlyBudget;
      const cur = settings.mainCurrency;
      const curr = aggregatePeriod(records, "week", thisWeek, budget, cur, rateMain);
      const prev = aggregatePeriod(records, "week", shiftWeek(thisWeek, -1), budget, cur, rateMain);
      const selfCookUp = curr.mealsCount > 0 && curr.eatingOutRatio < prev.eatingOutRatio;
      const vegImproved =
        curr.mealsCount > 0 &&
        toNutritionTrend(prev).vegetable === "low" &&
        toNutritionTrend(curr).vegetable !== "low";
      // 直近7日すべてに記録があるか
      const days = new Set(records.map((r) => r.meal.date));
      let streak7 = true;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now - i * 24 * H);
        if (!days.has(localISO(d))) {
          streak7 = false;
          break;
        }
      }
      if (selfCookUp || vegImproved || streak7) {
        candidates.push({
          kind: "praise",
          text: pickLine("praise", recentTexts(existing, "praise")),
          ref: thisWeek,
        });
      }
    }
  }

  // --- record_reminder（段階的減衰 + 引き際）---
  {
    const rr = recordReminderDraft(existing, records, now);
    if (rr) candidates.push(rr);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind]);
  return candidates[0];
}

function recentTexts(existing: Row[], kind: GohankunMessageKind): string[] {
  return existing.filter((m) => m.kind === kind).map((m) => m.text);
}

function recordReminderDraft(
  existing: Row[],
  records: { createdAt: number }[],
  now: number
): Draft | null {
  if (records.length === 0) return null; // 一度も記録がない人には送らない
  const lastRecordAt = Math.max(...records.map((r) => r.createdAt));
  const dormancyH = (now - lastRecordAt) / H;
  if (dormancyH < 24) return null;

  // 「最後の記録より後に送ったリマインド」だけを数える＝記録再開で自動リセット
  const since = existing.filter(
    (m) => m.kind === "record_reminder" && m.created_at > lastRecordAt
  );
  const farewellSent = since.some((m) => m.ref === "farewell");
  if (farewellSent) return null; // 引き際を送ったら以後停止

  // 7日超の休眠 → 引き際の台詞を1回だけ
  if (dormancyH > 7 * 24) {
    return { kind: "record_reminder", text: pickLine2(FAREWELL), ref: "farewell" };
  }

  // 段階的減衰: 送るほど間隔を広げる（24h → 48h → 7d）
  const level = since.length;
  const interval = level >= 3 ? 168 : level >= 1 ? 48 : 24;
  const lastReminderAt = since.length ? Math.max(...since.map((m) => m.created_at)) : lastRecordAt;
  if ((now - lastReminderAt) / H < interval) return null;

  return {
    kind: "record_reminder",
    text: pickLine("record_reminder", since.map((m) => m.text)),
    ref: null,
  };
}

function pickLine2(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- 公開API --------------------------------------------------------------

/** ユーザーのアクセス時に遅延評価（cron不要）。総量規制 1日1通。既読含む全件を返す。 */
export async function evaluateGohankunMessages(uid: string): Promise<GohankunMessage[]> {
  const existing = rows(uid);
  const now = Date.now();

  // 総量規制: 今日すでに1通作っていれば新規生成しない
  const createdToday = existing.some((m) => sameLocalDay(m.created_at, now));
  if (!createdToday) {
    let rateMain = FALLBACK_RATES_TO_JPY[getSettings(uid).mainCurrency];
    try {
      const fx = await getRatesToJpy();
      rateMain = fx.rates[getSettings(uid).mainCurrency] ?? rateMain;
    } catch {
      /* フォールバックレートで続行 */
    }
    const draft = chooseDraft(uid, existing, rateMain, now);
    if (draft) {
      getDb()
        .prepare(
          `INSERT INTO gohankun_messages
             (user_id, id, kind, text, created_at, read, cta_label, cta_href, ref)
           VALUES (?,?,?,?,?,0,?,?,?)`
        )
        .run(
          uid,
          randomUUID(),
          draft.kind,
          draft.text,
          now,
          draft.cta?.label ?? null,
          draft.cta?.href ?? null,
          draft.ref
        );
    }
  }
  return rows(uid).map(toMsg);
}

/** 既読にする（id指定 or 全件）。 */
export function markMessagesRead(uid: string, id?: string): void {
  const db = getDb();
  if (id) {
    db.prepare("UPDATE gohankun_messages SET read = 1 WHERE user_id = ? AND id = ?").run(uid, id);
  } else {
    db.prepare("UPDATE gohankun_messages SET read = 1 WHERE user_id = ?").run(uid);
  }
}
