// 対応通貨の定義とフォーマット（純粋・クライアント/サーバー共用）。
// 表示の基準は常に日本円(JPY)。各通貨→JPYのレートで換算する。

export type CurrencyCode =
  | "SGD"
  | "USD"
  | "CAD"
  | "AUD"
  | "GBP"
  | "EUR"
  | "KRW"
  | "CNY";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  SGD: { code: "SGD", symbol: "S$", label: "シンガポールドル", decimals: 2 },
  USD: { code: "USD", symbol: "$", label: "米ドル", decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", label: "カナダドル", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", label: "豪ドル", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", label: "英ポンド", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", label: "ユーロ", decimals: 2 },
  KRW: { code: "KRW", symbol: "₩", label: "韓国ウォン", decimals: 0 },
  CNY: { code: "CNY", symbol: "CN¥", label: "中国元", decimals: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
export const DEFAULT_CURRENCY: CurrencyCode = "SGD";

export function isCurrency(x: unknown): x is CurrencyCode {
  return typeof x === "string" && x in CURRENCIES;
}

export function toCurrency(x: unknown): CurrencyCode {
  return isCurrency(x) ? x : DEFAULT_CURRENCY;
}

/** API/キャッシュ失敗時のフォールバック（1通貨 = ? JPY・概算）。 */
export const FALLBACK_RATES_TO_JPY: Record<CurrencyCode, number> = {
  SGD: 116,
  USD: 157,
  CAD: 114,
  AUD: 103,
  GBP: 198,
  EUR: 169,
  KRW: 0.11,
  CNY: 21.6,
};

/** 金額を「記号＋桁区切り」で整形（例: S$6.80 / ₩12,000）。 */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.SGD;
  const s = amount.toLocaleString("en-US", {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
  return `${info.symbol}${s}`;
}

export function formatJpy(jpy: number): string {
  return `¥${Math.round(jpy).toLocaleString()}`;
}

/** 金額(通貨)→JPY。 */
export function toJpy(
  amount: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>
): number {
  const r = rates[currency] ?? FALLBACK_RATES_TO_JPY[currency];
  return Math.round(amount * r);
}
