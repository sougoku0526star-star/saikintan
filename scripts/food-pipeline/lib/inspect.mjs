// 自動検品（QC）。候補の栄養値に「怪しさ」の警告フラグ(_warnings)を立てる。
// ※ あくまで人間レビューの高速化補助。警告があっても自動却下はしない（目視の注意喚起のみ）。
import { REPO_ROOT, REGION_DICT, loadJson } from "./format.mjs";
import path from "node:path";

const ESSENTIAL = ["energy_kcal", "protein_g", "fat_g", "carb_g"];

// エネルギー密度（kcal/100g）。serving_g が無効なら null。
function densityKcalPer100g(e) {
  const g = Number(e.serving_g);
  const kcal = Number(e.energy_kcal);
  if (!g || g <= 0 || !kcal) return null;
  return (kcal / g) * 100;
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// 地域の公式辞書から、同カテゴリの既存エントリを返す（比較の母集団）。
function sameCategoryExisting(region, category) {
  const rel = REGION_DICT[region];
  if (!rel) return [];
  const dict = loadJson(path.join(REPO_ROOT, rel), []) ?? [];
  return dict.filter((d) => d.category === category);
}

/**
 * 候補1件を検品し、警告文字列の配列を返す（問題なければ空配列）。
 * - 必須栄養素(energy/P/F/C)の欠損・ゼロ
 * - serving_g が無効
 * - PFCから計算したカロリーと energy_kcal の乖離（Atwater整合性 >30%）
 * - 同カテゴリ既存品とのエネルギー密度が2倍超/半分未満の外れ値
 */
export function inspectEntry(entry, region) {
  const warnings = [];

  // 1) 必須栄養素の欠損・ゼロ
  for (const f of ESSENTIAL) {
    const v = Number(entry[f]);
    if (entry[f] === undefined || entry[f] === null || Number.isNaN(v)) {
      warnings.push(`必須栄養素 ${f} が欠損`);
    } else if (f === "energy_kcal" && v <= 0) {
      warnings.push(`energy_kcal が 0 以下`);
    }
  }

  // 2) serving_g
  const g = Number(entry.serving_g);
  if (!g || g <= 0) warnings.push(`serving_g が無効（${entry.serving_g}）`);

  // 3) Atwater整合性（4P + 4C + 9F ≈ energy_kcal）
  const p = Number(entry.protein_g) || 0;
  const f_ = Number(entry.fat_g) || 0;
  const c = Number(entry.carb_g) || 0;
  const kcal = Number(entry.energy_kcal) || 0;
  if (kcal > 0) {
    const atwater = 4 * p + 4 * c + 9 * f_;
    const diff = Math.abs(atwater - kcal) / kcal;
    if (diff > 0.3) {
      warnings.push(
        `PFCとカロリーの不整合（P/F/Cから約${Math.round(atwater)}kcal vs 記載${Math.round(
          kcal
        )}kcal・乖離${Math.round(diff * 100)}%）`
      );
    }
  }

  // 4) 同カテゴリ既存品とのエネルギー密度の外れ値
  const dens = densityKcalPer100g(entry);
  if (dens != null) {
    const peers = sameCategoryExisting(region, entry.category)
      .map(densityKcalPer100g)
      .filter((x) => x != null);
    const med = median(peers);
    if (med && peers.length >= 3) {
      const ratio = dens / med;
      if (ratio >= 2 || ratio <= 0.5) {
        warnings.push(
          `同カテゴリ「${entry.category}」の中央値(${Math.round(
            med
          )}kcal/100g)に対し${Math.round(dens)}kcal/100g（${ratio.toFixed(1)}倍）の外れ値`
        );
      }
    }
  }

  return warnings;
}
