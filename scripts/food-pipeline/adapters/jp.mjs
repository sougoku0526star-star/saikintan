// 日本アダプタ（型1・食材ベース / compose）。
// 料理名 → AIで構成食材＋グラム推定 → 成分表(mext-seibun.json)で各食材を照合 →
// グラム換算して合算 → 公式フォーマットで返す。栄養値は必ず成分表由来（AIは同定の補助のみ）。
import { topMatches, findByExactName, matchIngredient, loadSeibun } from "../lib/match.mjs";
import { estimateComposition, chooseMatches } from "../lib/ai.mjs";
import { inspectEntry } from "../lib/inspect.mjs";
import { round2 } from "../lib/format.mjs";

export const REGION = "jp";
const SOURCE = "日本食品標準成分表（八訂）増補2023年から引用";
const CONFIDENT = 0.72; // これ以上のスコアなら fuzzy top1 を採用（AI再確認を省略）

const today = () => new Date().toISOString().slice(0, 10);

// 成分表レコード（可食部100gあたり）× グラム → 実量。
function scale(rec, grams) {
  const f = grams / 100;
  const v = (x) => (x == null ? 0 : x * f);
  return {
    kcal: v(rec.kcal),
    protein: v(rec.protein),
    fat: v(rec.fat),
    carb: v(rec.carb),
    fiber: v(rec.fiber),
    salt: v(rec.salt),
    sodium: v(rec.sodium),
    potassium: v(rec.potassium),
    calcium: v(rec.calcium),
    iron: v(rec.iron),
    vitc: v(rec.vitc),
    alcohol: v(rec.alcohol),
  };
}

/**
 * 料理名 → PendingFood（公式フォーマット＋メタ）。
 * 失敗時は { error } を返す。
 */
export async function generateEntry(dishName) {
  const seibun = loadSeibun();
  const warnings = [];

  // 1) 構成食材の推定
  let comp;
  try {
    comp = await estimateComposition(dishName);
  } catch (e) {
    return { error: `構成食材の推定に失敗: ${e.message}` };
  }
  const ingredients = (comp.ingredients ?? []).filter((x) => x?.name && x.grams > 0);
  if (!ingredients.length) return { error: "構成食材を推定できませんでした" };

  // 2) 各食材を成分表へ照合（fuzzy top1が高信頼ならそれ、曖昧なものはAIに選ばせる）
  const resolved = new Map(); // name -> rec | null
  const ambiguous = [];
  for (const ing of ingredients) {
    const tops = topMatches(ing.mext_name || ing.name, { k: 12, seibun });
    if (tops[0] && tops[0].score >= CONFIDENT) {
      resolved.set(ing.name, tops[0].rec);
    } else {
      ambiguous.push({ ing, candidates: tops.map((t) => t.rec.name) });
    }
  }
  if (ambiguous.length) {
    let chosen;
    try {
      chosen = await chooseMatches(
        dishName,
        ambiguous.map((a) => ({ name: a.ing.name, candidates: a.candidates }))
      );
    } catch (e) {
      warnings.push(`AIによる食材同定に失敗: ${e.message}`);
      chosen = new Map();
    }
    for (const a of ambiguous) {
      const mextName = chosen.get(a.ing.name);
      let rec = mextName ? findByExactName(mextName, seibun) : null;
      // AIが候補名を微妙に変えた場合のフォールバック（候補内fuzzy）
      if (!rec && mextName) rec = matchIngredient(mextName, { threshold: 0.6, seibun })?.rec ?? null;
      resolved.set(a.ing.name, rec ?? null);
    }
  }

  // 3) 合算
  const total = {
    kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0,
    sodium: 0, potassium: 0, calcium: 0, iron: 0, vitc: 0, alcohol: 0,
  };
  let servingG = 0;
  const recipeParts = [];
  for (const ing of ingredients) {
    const rec = resolved.get(ing.name);
    recipeParts.push(`${ing.name}${Math.round(ing.grams)}g`);
    if (!rec) {
      warnings.push(`食材「${ing.name}」を成分表で照合できず、合算から除外`);
      continue;
    }
    const s = scale(rec, ing.grams);
    for (const k of Object.keys(total)) total[k] += s[k];
    servingG += ing.grams;
  }
  if (servingG <= 0) return { error: "照合できた食材が無く、栄養を合算できませんでした" };

  // 4) 公式フォーマットへ
  const sugar = Math.max(0, total.carb - total.fiber);
  const entry = {
    dish: dishName,
    category: comp.category || "主菜",
    confidence: "B", // compose = 中
    serving: comp.serving || "1人前",
    serving_g: round2(servingG),
    energy_kcal: round2(total.kcal),
    protein_g: round2(total.protein),
    fat_g: round2(total.fat),
    carb_g: round2(total.carb),
    fiber_g: round2(total.fiber),
    sugar_g: round2(sugar),
    salt_g: round2(total.salt),
    sodium_mg: round2(total.sodium),
    potassium_mg: round2(total.potassium),
    calcium_mg: round2(total.calcium),
    iron_mg: round2(total.iron),
    vitamin_c_mg: round2(total.vitc),
    alcohol_g: round2(total.alcohol),
    note: "",
    recipe: recipeParts.join("+"),
    incomplete: warnings.length ? "一部食材が未照合" : "",
    source: SOURCE,
    _origin: "gov",
    _region: REGION,
    _sourceDetail: { source: SOURCE, retrievedOn: today(), method: "compose" },
  };
  entry._warnings = [...warnings, ...inspectEntry(entry, REGION)];
  return entry;
}
