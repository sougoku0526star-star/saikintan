// 為替レート（各対応通貨 → JPY）。1日1回 ExchangeRate-API から取得し、
// Postgres(fx_rates)にキャッシュ。サーバー専用。差し替えれば別プロバイダにも対応可能。
import { getDb } from "./pg";
import {
  CURRENCY_CODES,
  FALLBACK_RATES_TO_JPY,
  type CurrencyCode,
} from "../currency";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export interface FxRates {
  rates: Record<CurrencyCode, number>; // 1通貨 = ? JPY
  date: string;
  source: "cache" | "api" | "stale" | "default";
}

async function readCache(): Promise<{ rates: Partial<Record<CurrencyCode, number>>; dates: Set<string> }> {
  const rows = await getDb()
    .prepare("SELECT pair, rate, fetched_on FROM fx_rates")
    .all<{ pair: string; rate: number; fetched_on: string }>();
  const rates: Partial<Record<CurrencyCode, number>> = {};
  const dates = new Set<string>();
  for (const r of rows) {
    const m = /^([A-Z]{3})_JPY$/.exec(r.pair);
    if (m && CURRENCY_CODES.includes(m[1] as CurrencyCode)) {
      rates[m[1] as CurrencyCode] = r.rate;
      dates.add(r.fetched_on);
    }
  }
  return { rates, dates };
}

function withFallback(
  partial: Partial<Record<CurrencyCode, number>>
): Record<CurrencyCode, number> {
  const out = {} as Record<CurrencyCode, number>;
  for (const c of CURRENCY_CODES) out[c] = partial[c] ?? FALLBACK_RATES_TO_JPY[c];
  return out;
}

/** 全対応通貨→JPY の最新レート。当日キャッシュがあれば使い、無ければAPI取得。 */
export async function getRatesToJpy(): Promise<FxRates> {
  const db = getDb();
  const today = todayStr();
  const cache = await readCache();
  const haveAll = CURRENCY_CODES.every((c) => cache.rates[c] != null);

  // 全通貨そろっていて当日取得済みなら再取得しない
  if (haveAll && cache.dates.size === 1 && cache.dates.has(today)) {
    return { rates: withFallback(cache.rates), date: today, source: "cache" };
  }

  const key = process.env.EXCHANGERATE_API_KEY;
  if (key) {
    try {
      // latest/JPY は JPY→各通貨。逆数を取って 各通貨→JPY にする。
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/JPY`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.result === "success" && data.conversion_rates) {
        const cr = data.conversion_rates as Record<string, number>;
        const rates = {} as Record<CurrencyCode, number>;
        for (const c of CURRENCY_CODES) {
          const jpyToC = cr[c];
          const rate = jpyToC && jpyToC > 0 ? 1 / jpyToC : FALLBACK_RATES_TO_JPY[c];
          rates[c] = Math.round(rate * 10000) / 10000;
          await db
            .prepare(
              `INSERT INTO fx_rates (pair, rate, fetched_on) VALUES (?,?,?)
               ON CONFLICT(pair) DO UPDATE SET rate = excluded.rate, fetched_on = excluded.fetched_on`
            )
            .run(`${c}_JPY`, rates[c], today);
        }
        return { rates, date: today, source: "api" };
      }
    } catch {
      /* ネットワーク失敗 → 下のフォールバックへ */
    }
  }

  // 取得失敗：古いキャッシュがあれば使う（無い分はフォールバック）、無ければ既定値
  if (Object.keys(cache.rates).length > 0) {
    return { rates: withFallback(cache.rates), date: today, source: "stale" };
  }
  return { rates: withFallback({}), date: today, source: "default" };
}
