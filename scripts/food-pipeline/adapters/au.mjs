// オーストラリアアダプタ（型2・料理ベース / 直引き）。AFCD由来の料理データを直引きする。
// 3例目として「型2パターンの再現性」を検証する位置づけ。AI呼び出しなし（原価ゼロ）。
//
// ソース優先順:
//   1. data/au-source.json … AFCDの料理単位抽出（あれば。data/ は .gitignore）
//   2. lib/au-dishes.json  … 既存の公式辞書（32品・AFCD由来）をソースとして使うフォールバック
import path from "node:path";
import { PIPELINE_DIR, REPO_ROOT, loadJson } from "../lib/format.mjs";
import { directLookup } from "../lib/type2.mjs";
import { inspectEntry } from "../lib/inspect.mjs";

export const REGION = "au";
const SOURCE = "Australian Food Composition Database (AFCD) Release 3 より引用";

function loadSource() {
  const s = loadJson(path.join(PIPELINE_DIR, "data", "au-source.json"), null);
  if (Array.isArray(s) && s.length) return s;
  return loadJson(path.join(REPO_ROOT, "lib/au-dishes.json"), []) ?? [];
}

/** 料理名 → PendingFood（直引き）。未収載なら { error }。 */
export async function generateEntry(dishName) {
  const source = loadSource();
  const entry = directLookup(source, dishName, {
    region: REGION,
    sourceLabel: SOURCE,
    confidence: "A", // 直引き=高
    sourceDetail: { retrievedOn: new Date().toISOString().slice(0, 10) },
  });
  if (!entry) {
    return { error: `AFCDソースに「${dishName}」が見つかりません（型2は直引き・compose無し）` };
  }
  entry._warnings = inspectEntry(entry, REGION);
  return entry;
}
