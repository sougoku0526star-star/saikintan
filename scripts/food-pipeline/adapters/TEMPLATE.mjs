// 新地域アダプタの雛形。手順は docs/add-region.md を参照。
//
// 使い方:
//   1. このファイルを adapters/<region>.mjs にコピー（例: adapters/us.mjs）
//   2. その地域が【型1】食材ベース か【型2】料理ベース かを判定し、不要な方を削除
//   3. REGION / SOURCE / ソースの読み込み先を埋める
//   4. lib/format.mjs の REGION_DICT に <region> → 公式辞書JSONのパス を追加
//
// 共通インターフェース（generate.mjs から呼ばれる）:
//   generateEntry(dishName: string) => PendingFood | { error }
//
// PendingFood = 公式辞書フォーマット（lib/format.mjs の OFFICIAL_FIELDS）
//   ＋ メタ: _origin("gov"|"user-promotion") / _region / _warnings / _sourceDetail
import path from "node:path";
import { PIPELINE_DIR, REPO_ROOT, loadJson, round2 } from "../lib/format.mjs";
import { inspectEntry } from "../lib/inspect.mjs";

// --- 必ず埋める ---------------------------------------------------------
export const REGION = "xx"; // 地域コード（jp/sg/au/us/...）
const SOURCE = "<一次ソース名> より引用"; // 出典表記（source フィールドに入る・義務）
const SOURCE_JSON = "data/xx-source.json"; // セットアップで作るローカルJSON（data/ は .gitignore）

function loadSource() {
  return loadJson(path.join(PIPELINE_DIR, SOURCE_JSON), null);
}

// ========================================================================
// 【型2】料理ベース（直引き）— SG(HPB) / AU(AFCD) と同じ。AI不使用・原価ゼロ。
// ソースに「料理」単位の栄養がある場合はこちらを使う（推奨・最も簡単）。
// ========================================================================
import { directLookup } from "../lib/type2.mjs";

export async function generateEntry(dishName) {
  const source = loadSource();
  if (!source) {
    return { error: `${SOURCE_JSON} がありません。セットアップスクリプトで生成してください。` };
  }
  const entry = directLookup(source, dishName, {
    region: REGION,
    sourceLabel: SOURCE,
    confidence: "A", // 直引き=高
    sourceDetail: { retrievedOn: new Date().toISOString().slice(0, 10) },
  });
  if (!entry) return { error: `ソースに「${dishName}」が見つかりません（型2は直引き）` };
  entry._warnings = inspectEntry(entry, REGION);
  return entry;
}

// ========================================================================
// 【型1】食材ベース（compose）— 日本(文科省 成分表) と同じ。
// ソースが「食材」の成分表しか無い場合はこちら。adapters/jp.mjs を雛形にコピーし、
// ・lib/match.mjs の loadSeibun() 相当を自地域のソースに差し替え
// ・lib/ai.mjs の estimateComposition のプロンプト（言語・食文化）を調整
// ・栄養値は必ずソース由来にする（AIは構成食材の推定と同定の補助のみ）
// ・confidence は "B"（compose=中）
// ※ 型1を使う場合は、上の型2の generateEntry を削除して jp.mjs 相当を実装すること。
// ========================================================================
