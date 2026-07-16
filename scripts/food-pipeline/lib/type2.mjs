// 型2（料理ベース・直引き）の共通ロジック。SG(HPB) と AU(AFCD) で共用。
// ソースに「料理単位」の栄養データがある前提で、料理名で直接引いて公式フォーマットに変換する。
// AIは使わない（表記ゆれは軽いファジーで吸収。原価ゼロ）。
import { normalizeName, toOfficialEntry } from "./format.mjs";

/**
 * ソース配列から dishName に一致する料理を直引きし、公式フォーマット＋メタで返す。
 * @param source  料理単位の栄養データ配列（各要素は公式フォーマット準拠 or 近い形）
 * @param dishName 検索する料理名
 * @param opts { region, sourceLabel, confidence="A", sourceDetail={} }
 * @returns 公式エントリ＋メタ | null（未収載）
 */
export function directLookup(source, dishName, opts) {
  const { region, sourceLabel, confidence = "A", sourceDetail = {} } = opts;
  const q = normalizeName(dishName);
  if (!q) return null;

  const nm = (e, key) => normalizeName(e[key] ?? "");
  // 1) 料理名/英名の正規化・完全一致
  let hit = source.find((e) => nm(e, "dish") === q || nm(e, "dish_en") === q);
  // 2) 軽いファジー（部分一致）フォールバック
  if (!hit) {
    hit = source.find((e) => {
      const d = nm(e, "dish");
      const en = nm(e, "dish_en");
      return (d && (d.includes(q) || q.includes(d))) || (en && (en.includes(q) || q.includes(en)));
    });
  }
  if (!hit) return null;

  const entry = toOfficialEntry(hit); // 公式フィールドのみ・順序固定（余計なキーを落とす）
  entry.dish = hit.dish || dishName;
  entry.confidence = confidence; // 直引き=高
  entry.source = hit.source || sourceLabel; // 元データの出典を優先、無ければ既定表記
  entry._origin = "gov";
  entry._region = region;
  entry._sourceDetail = { source: sourceLabel, method: "direct", ...sourceDetail };
  return entry;
}
