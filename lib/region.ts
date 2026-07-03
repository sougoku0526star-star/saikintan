// 地域（国）モデル。栄養データの地域補正に使う。
// ユーザーの地域は「メイン通貨」から推定する（例: SGD → シンガポール）。
import type { CurrencyCode } from "./currency";

export type RegionCode = "JP" | "SG" | "US" | "CA" | "AU" | "GB" | "EU" | "KR" | "CN";

export const REGION_LABEL: Record<RegionCode, string> = {
  JP: "日本",
  SG: "シンガポール",
  US: "アメリカ",
  CA: "カナダ",
  AU: "オーストラリア",
  GB: "イギリス",
  EU: "ヨーロッパ",
  KR: "韓国",
  CN: "中国",
};

const CURRENCY_REGION: Record<CurrencyCode, RegionCode> = {
  JPY: "JP",
  SGD: "SG",
  USD: "US",
  CAD: "CA",
  AUD: "AU",
  GBP: "GB",
  EUR: "EU",
  KRW: "KR",
  CNY: "CN",
};

/** メイン通貨からユーザーの地域を推定。 */
export function currencyToRegion(currency: CurrencyCode): RegionCode {
  return CURRENCY_REGION[currency] ?? "SG";
}

export function regionLabel(region: RegionCode): string {
  return REGION_LABEL[region] ?? region;
}
