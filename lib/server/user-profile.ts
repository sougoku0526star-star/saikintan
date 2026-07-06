// ユーザーの食プロファイル抽出（P2-1・調達源A）。records集計のみで作る（AI不要）。
// 提案の解像度を上げるため、「いつもの店・よく食べる料理・自炊率・外食の曜日パターン・都市」
// を出し、weekly-letter / memory-letter 以外の全AI呼び出しのプロンプトに含める。
import { listRecords } from "./records-db";
import { getSettings } from "./settings-db";
import { currencyToRegion, type RegionCode } from "../region";

export interface UserFoodProfile {
  topPlaces: { name: string; count: number; avgCost: number }[]; // 上位3
  repeatDishes: { name: string; count: number }[]; // 上位5（2回以上）
  selfCookRatio: number; // 直近4週の自炊比率 0〜1
  eatingOutByDow: number[]; // 曜日別の外食回数（0=日〜6=土）直近4週
  city: string; // 記録のlocationから最頻都市を推定（無ければ通貨の地域から）
}

// 自炊判定：家庭料理データ（日本食品標準成分表）由来を自炊とみなす（aggregatePeriodと同基準）。
const isSelfCook = (source: string | undefined) =>
  (source ?? "").includes("日本食品標準成分表");

// 位置文字列から都市を拾うキーワード。旅行先の記録があれば都市を上書きできる。
const CITY_KEYWORDS: { kw: RegExp; city: string }[] = [
  { kw: /singapore|シンガポール/i, city: "Singapore" },
  { kw: /tokyo|東京/i, city: "Tokyo" },
  { kw: /osaka|大阪/i, city: "Osaka" },
  { kw: /sydney|シドニー/i, city: "Sydney" },
  { kw: /melbourne|メルボルン/i, city: "Melbourne" },
  { kw: /london|ロンドン/i, city: "London" },
  { kw: /new york|ニューヨーク/i, city: "New York" },
  { kw: /toronto|トロント/i, city: "Toronto" },
  { kw: /seoul|ソウル/i, city: "Seoul" },
];

// 都市が特定できないときの、地域→代表都市のフォールバック。
const REGION_CITY: Record<RegionCode, string> = {
  SG: "Singapore",
  JP: "Tokyo",
  AU: "Sydney",
  US: "New York",
  CA: "Toronto",
  GB: "London",
  KR: "Seoul",
  EU: "",
  CN: "",
};

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export function buildUserFoodProfile(uid: string): UserFoodProfile {
  const records = listRecords(uid);
  const settings = getSettings(uid);
  const fallbackCity = REGION_CITY[currencyToRegion(settings.mainCurrency)] ?? "";

  // --- 都市: locationのキーワード最頻。無ければ通貨の地域から ---
  const cityCount = new Map<string, number>();
  for (const r of records) {
    for (const { kw, city } of CITY_KEYWORDS) {
      if (kw.test(r.meal.location || "")) {
        cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
        break;
      }
    }
  }
  const city =
    Array.from(cityCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackCity;

  // --- topPlaces: location別の回数と平均金額（その通貨建て）---
  const places = new Map<string, { count: number; sum: number; costN: number }>();
  for (const r of records) {
    const name = (r.meal.location || "").trim();
    if (!name) continue;
    const p = places.get(name) ?? { count: 0, sum: 0, costN: 0 };
    p.count++;
    if (r.meal.spend?.amount > 0) {
      p.sum += r.meal.spend.amount;
      p.costN++;
    }
    places.set(name, p);
  }
  const topPlaces = Array.from(places.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([name, p]) => ({
      name,
      count: p.count,
      avgCost: p.costN ? Math.round(p.sum / p.costN) : 0,
    }));

  // --- repeatDishes: 料理名の頻度（2回以上・上位5）---
  const dishes = new Map<string, number>();
  for (const r of records) {
    const name = (r.meal.dishNameJa || "").trim();
    if (!name) continue;
    dishes.set(name, (dishes.get(name) ?? 0) + 1);
  }
  const repeatDishes = Array.from(dishes.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // --- 直近4週の自炊比率・曜日別外食回数 ---
  const windowStart = localISO(new Date(Date.now() - 28 * 24 * 3600_000));
  const recent = records.filter((r) => r.meal.date >= windowStart);
  let homeCount = 0;
  const eatingOutByDow = [0, 0, 0, 0, 0, 0, 0];
  for (const r of recent) {
    const home = isSelfCook(r.meal.source);
    if (home) homeCount++;
    else {
      const dow = new Date(r.meal.date).getDay(); // 0=日〜6=土
      eatingOutByDow[dow]++;
    }
  }
  const selfCookRatio = recent.length ? homeCount / recent.length : 0;

  return { topPlaces, repeatDishes, selfCookRatio, eatingOutByDow, city };
}

// プロンプト用の短い日本語要約（AI呼び出しに埋め込む）。空プロファイルでも安全。
export function describeProfile(p: UserFoodProfile): string {
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  const lines: string[] = [];
  lines.push(`- 都市: ${p.city || "不明"}`);
  if (p.topPlaces.length)
    lines.push(
      `- よく行く場所: ${p.topPlaces
        .map((x) => `${x.name}（${x.count}回${x.avgCost ? `・平均${x.avgCost}` : ""}）`)
        .join(" / ")}`
    );
  if (p.repeatDishes.length)
    lines.push(
      `- よく食べる料理: ${p.repeatDishes.map((x) => `${x.name}（${x.count}回）`).join("、")}`
    );
  lines.push(`- 直近4週の自炊率: ${Math.round(p.selfCookRatio * 100)}%`);
  const peak = p.eatingOutByDow.indexOf(Math.max(...p.eatingOutByDow));
  if (p.eatingOutByDow.some((n) => n > 0))
    lines.push(`- 外食が多い曜日: ${dow[peak]}曜`);
  return lines.join("\n");
}
