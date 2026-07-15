// 食材名 → 成分表(mext-seibun.json) の照合。日本語の表記ゆれに強いよう
// Dice係数（2-gram重なり）でファジーマッチする（形態素解析なしで実用的）。
import path from "node:path";
import { PIPELINE_DIR, loadJson } from "./format.mjs";

let CACHE = null;

export function loadSeibun() {
  if (CACHE) return CACHE;
  const p = path.join(PIPELINE_DIR, "data", "mext-seibun.json");
  const data = loadJson(p, null);
  if (!data) {
    throw new Error(
      "data/mext-seibun.json がありません。先に `node scripts/food-pipeline/setup-mext.mjs <成分表Excel>` を実行してください。"
    );
  }
  CACHE = data.map((r) => ({ ...r, _norm: normalize(r.name) }));
  return CACHE;
}

// 照合用の正規化: NFKC・小文字・括弧/記号/空白除去。
export function normalize(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[＜＞<>［］\[\]（）()【】「」『』、,.。・､･\s]/g, "")
    .trim();
}

function bigrams(s) {
  const set = new Set();
  if (s.length === 1) set.add(s);
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function dice(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// 「生」を含む基本形・短い名前を優先するための微小ボーナス。
function tiebreakBonus(rec, qNorm) {
  let b = 0;
  if (rec._norm.includes("生")) b += 0.02;
  if (rec._norm.startsWith(qNorm)) b += 0.05;
  b -= rec._norm.length * 0.0005; // 長い（＝加工が多い）名前をわずかに減点
  return b;
}

/**
 * 食材名に最も近い成分表レコードを返す。
 * @returns { rec, score } | null（閾値未満）
 */
export function matchIngredient(query, { threshold = 0.34, seibun = loadSeibun() } = {}) {
  const top = topMatches(query, { k: 1, seibun });
  if (!top.length || top[0].score < threshold) return null;
  return { rec: top[0].rec, score: top[0].score };
}

/**
 * 食材名に近い成分表レコードを上位k件返す（AIによる最終選択のショートリスト用）。
 * @returns [{ rec, score }]（スコア降順）
 */
export function topMatches(query, { k = 12, seibun = loadSeibun() } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const scored = seibun.map((rec) => ({
    rec,
    score: Math.round((dice(q, rec._norm) + tiebreakBonus(rec, q)) * 100) / 100,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** 成分表の食品名（正確一致）でレコードを引く（AIが選んだ名前の確定用）。 */
export function findByExactName(name, seibun = loadSeibun()) {
  const n = normalize(name);
  return seibun.find((r) => r._norm === n) ?? null;
}
