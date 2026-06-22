// 為替レート（SGD→JPY）。1日1回 ExchangeRate-API から取得し、SQLiteにキャッシュ。
// サーバー専用。差し替えれば別プロバイダにも対応可能。
import { getDb } from "./sqlite";

const PAIR = "SGD_JPY";
const DEFAULT_RATE = 116; // API未設定/失敗・キャッシュ無し時のフォールバック

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export interface FxResult {
  rate: number;
  date: string;
  source: "cache" | "api" | "stale" | "default";
}

/** SGD→JPY の最新レート。当日キャッシュがあればそれを返し、無ければAPI取得して保存。 */
export async function getSgdJpyRate(): Promise<FxResult> {
  const db = getDb();
  const today = todayStr();
  const row = db
    .prepare("SELECT rate, fetched_on FROM fx_rates WHERE pair = ?")
    .get(PAIR) as { rate: number; fetched_on: string } | undefined;

  // 当日キャッシュがあれば再取得しない
  if (row && row.fetched_on === today) {
    return { rate: row.rate, date: row.fetched_on, source: "cache" };
  }

  const key = process.env.EXCHANGERATE_API_KEY;
  if (key) {
    try {
      const res = await fetch(
        `https://v6.exchangerate-api.com/v6/${key}/pair/SGD/JPY`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.result === "success" && typeof data.conversion_rate === "number") {
        const rate = data.conversion_rate;
        db.prepare(
          `INSERT INTO fx_rates (pair, rate, fetched_on) VALUES (?,?,?)
           ON CONFLICT(pair) DO UPDATE SET rate = excluded.rate, fetched_on = excluded.fetched_on`
        ).run(PAIR, rate, today);
        return { rate, date: today, source: "api" };
      }
    } catch {
      /* ネットワーク失敗 → 下のフォールバックへ */
    }
  }

  // 取得失敗：古いキャッシュがあれば使う、無ければ既定値
  if (row) return { rate: row.rate, date: row.fetched_on, source: "stale" };
  return { rate: DEFAULT_RATE, date: today, source: "default" };
}
