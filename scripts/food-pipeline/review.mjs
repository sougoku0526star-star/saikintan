// レビュー用Markdown生成。pending-foods.json の全候補を人間が目視できる形にする。
// 使い方: node scripts/food-pipeline/review.mjs [--out review.md]
// 出力: scripts/food-pipeline/review.md（および要約を標準出力）。
//
// 承認は必ず人間が行う。承認するには pending-foods.json の該当エントリに
// "_approved": true を付けるか、apply.mjs --approve "料理名,..." を使う。
import path from "node:path";
import { writeFileSync } from "node:fs";
import { PIPELINE_DIR, loadPending } from "./lib/format.mjs";

function num(v, unit = "") {
  if (v === undefined || v === null || v === "") return "—";
  return `${v}${unit}`;
}

function methodLabel(e) {
  if (e._origin === "gov") return "政府DB由来（新規生成）";
  if (e._origin === "user-promotion") return "ユーザー辞書からの昇格";
  return e._origin ?? "不明";
}

function candidateMd(e, i) {
  const title = e.dish_en ? `${e.dish}（${e.dish_en}）` : e.dish;
  const warn = Array.isArray(e._warnings) ? e._warnings : [];
  const lines = [];
  lines.push(`## ${i + 1}. ${title}  \`${e._region ?? "?"}\` / ${e.category ?? "?"}`);
  lines.push("");
  lines.push(
    `- 承認状態: ${e._approved ? "✅ 採用マーク済み" : "⬜ 未承認"}  ｜ confidence: **${
      e.confidence ?? "?"
    }** ｜ 生成手段: ${methodLabel(e)}`
  );
  if (warn.length) {
    lines.push(`- ⚠️ **警告（${warn.length}件・要目視）**:`);
    for (const w of warn) lines.push(`    - ${w}`);
  } else {
    lines.push(`- 警告: なし`);
  }
  lines.push("");
  lines.push(`| 項目 | 値 | | 項目 | 値 |`);
  lines.push(`|---|---|---|---|---|`);
  lines.push(
    `| 分量 | ${num(e.serving)} (${num(e.serving_g, "g")}) | | 食物繊維 | ${num(e.fiber_g, "g")} |`
  );
  lines.push(
    `| エネルギー | **${num(e.energy_kcal, "kcal")}** | | 糖質 | ${num(e.sugar_g, "g")} |`
  );
  lines.push(
    `| たんぱく質 | ${num(e.protein_g, "g")} | | 食塩相当量 | ${num(e.salt_g, "g")} |`
  );
  lines.push(`| 脂質 | ${num(e.fat_g, "g")} | | ナトリウム | ${num(e.sodium_mg, "mg")} |`);
  lines.push(
    `| 炭水化物 | ${num(e.carb_g, "g")} | | カリウム | ${num(e.potassium_mg, "mg")} |`
  );
  lines.push(
    `| カルシウム | ${num(e.calcium_mg, "mg")} | | 鉄 | ${num(e.iron_mg, "mg")} |`
  );
  lines.push(
    `| ビタミンC | ${num(e.vitamin_c_mg, "mg")} | | ${
      e.caffeine_mg != null ? "カフェイン" : "—"
    } | ${e.caffeine_mg != null ? num(e.caffeine_mg, "mg") : "—"} |`
  );
  lines.push("");
  if (e.recipe) lines.push(`- 構成/レシピ: \`${e.recipe}\``);
  lines.push(`- 出典: ${e.source ?? "（未設定・要確認）"}`);
  if (e._sourceDetail) {
    lines.push(`- 出典詳細: \`${JSON.stringify(e._sourceDetail)}\``);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outPath =
    outIdx >= 0 && args[outIdx + 1]
      ? path.resolve(args[outIdx + 1])
      : path.join(PIPELINE_DIR, "review.md");

  const pending = loadPending();
  const warned = pending.filter((e) => (e._warnings ?? []).length > 0).length;
  const approved = pending.filter((e) => e._approved).length;

  const header = [
    `# 承認レビュー — 承認待ち ${pending.length} 件`,
    "",
    `- ⚠️ 警告あり: **${warned}** 件 ／ ✅ 採用マーク済み: **${approved}** 件`,
    "- **全件、人間が目視して承認すること。自動昇格はしない。**",
    "- 承認: pending-foods.json の該当エントリに `\"_approved\": true` を付ける、または",
    "  `node scripts/food-pipeline/apply.mjs --approve \"料理名1,料理名2\"` を実行。",
    "- 反映: `node scripts/food-pipeline/apply.mjs`（`_approved:true` のみ公式辞書へマージ）。",
    "",
    "---",
    "",
  ].join("\n");

  const body = pending.map((e, i) => candidateMd(e, i)).join("\n");
  writeFileSync(outPath, header + body, "utf8");

  console.log(`レビューMarkdownを生成: ${path.relative(process.cwd(), outPath)}`);
  console.log(`  承認待ち ${pending.length} 件（警告 ${warned} / 採用マーク ${approved}）`);
  if (pending.length === 0) console.log("  （pending-foods.json は空です）");
}

main();
