// 為替レートのクライアント取得（/api/fx）。セッション内でメモ化して呼び過ぎを防ぐ。
import { JPY_PER_SGD } from "./nutrition-scale";

let cached: number | null = null;
let inflight: Promise<number> | null = null;

/** SGD→JPY の最新レート（取得失敗時は既定値）。 */
export async function fetchSgdJpyRate(): Promise<number> {
  if (cached != null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      const d = await res.json();
      cached = Number(d.rate) || JPY_PER_SGD;
    } catch {
      cached = JPY_PER_SGD;
    }
    inflight = null;
    return cached;
  })();
  return inflight;
}
