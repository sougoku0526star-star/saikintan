// 為替レート（各対応通貨→JPY）のクライアント取得（/api/fx）。
// セッション内でメモ化して呼び過ぎを防ぐ。
import { FALLBACK_RATES_TO_JPY, type CurrencyCode } from "./currency";

export type RatesToJpy = Record<CurrencyCode, number>;

let cached: RatesToJpy | null = null;
let inflight: Promise<RatesToJpy> | null = null;

/** 全対応通貨→JPY の最新レート（取得失敗時はフォールバック）。 */
export async function fetchRatesToJpy(): Promise<RatesToJpy> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    let result: RatesToJpy;
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      const d = await res.json();
      result = { ...FALLBACK_RATES_TO_JPY, ...(d?.rates ?? {}) };
    } catch {
      result = { ...FALLBACK_RATES_TO_JPY };
    }
    cached = result;
    inflight = null;
    return result;
  })();
  return inflight;
}
