// 食品辞書パイプラインの共通フォーマット定義とI/O。
// 既存の公式辞書（lib/japanese-dishes.json / lib/au-dishes.json）と完全準拠させる。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/food-pipeline/lib → リポジトリ root
export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const PIPELINE_DIR = path.resolve(__dirname, "..");
export const PENDING_PATH = path.join(PIPELINE_DIR, "pending-foods.json");

// 公式辞書エントリのフィールド順（出力の一貫性のため固定）。
export const OFFICIAL_FIELDS = [
  "dish",
  "dish_en",
  "category",
  "confidence",
  "serving",
  "serving_g",
  "energy_kcal",
  "protein_g",
  "fat_g",
  "carb_g",
  "fiber_g",
  "sugar_g",
  "salt_g",
  "sodium_mg",
  "potassium_mg",
  "calcium_mg",
  "iron_mg",
  "vitamin_c_mg",
  "alcohol_g",
  "caffeine_mg",
  "note",
  "recipe",
  "incomplete",
  "source",
];

// pending 専用のメタ情報（公式辞書には出力しない。全て "_" 始まり）。
//   _origin: "gov" | "user-promotion"
//   _region: "jp" | "sg" | "au" ...
//   _warnings: string[]（自動検品の警告。目視の注意喚起のみ・自動却下はしない）
//   _sourceDetail: { source, retrievedOn, method, ... }
//   _approved: boolean（人間が採用マークを付けたら true。apply はこれだけを適用する）
export const META_FIELDS = ["_origin", "_region", "_warnings", "_sourceDetail", "_approved"];

// 地域コード → 公式辞書JSONの相対パス。
export const REGION_DICT = {
  jp: "lib/japanese-dishes.json",
  au: "lib/au-dishes.json",
  sg: "lib/sg-dishes.json",
};

export function dictPathForRegion(region) {
  const rel = REGION_DICT[region];
  if (!rel) throw new Error(`未対応の region: ${region}（jp|sg|au のいずれか）`);
  return path.join(REPO_ROOT, rel);
}

// ---- I/O -----------------------------------------------------------------
export function loadJson(absPath, fallback = null) {
  if (!existsSync(absPath)) return fallback;
  return JSON.parse(readFileSync(absPath, "utf8"));
}

export function saveJson(absPath, data) {
  writeFileSync(absPath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function loadPending() {
  return loadJson(PENDING_PATH, []) ?? [];
}
export function savePending(list) {
  saveJson(PENDING_PATH, list);
}

// ---- 名寄せ・重複判定 -----------------------------------------------------
export function normalizeName(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　・（）()、,.\-]/g, "")
    .trim();
}

/** 重複判定キー（料理名・英名の正規化）。 */
export function dedupKeys(entry) {
  const keys = [];
  if (entry.dish) keys.push(normalizeName(entry.dish));
  if (entry.dish_en) keys.push("en:" + normalizeName(entry.dish_en));
  return keys;
}

// ---- 公式エントリの組み立て（メタを除去し、フィールド順を固定）-----------
export function toOfficialEntry(entry) {
  const out = {};
  for (const f of OFFICIAL_FIELDS) {
    if (entry[f] !== undefined) out[f] = entry[f];
  }
  return out;
}

/** 数値の丸め（小数2桁）。 */
export function round2(n) {
  if (n == null || Number.isNaN(Number(n))) return n;
  return Math.round(Number(n) * 100) / 100;
}
