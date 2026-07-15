// 承認された候補（_approved:true）を公式辞書JSONへマージする。
// 使い方:
//   node scripts/food-pipeline/apply.mjs                      … _approved:true を全て適用
//   node scripts/food-pipeline/apply.mjs --approve "A,B"      … 料理名 A,B を承認扱いにして適用
//   node scripts/food-pipeline/apply.mjs --approve-all        … pending 全件を承認扱い（テスト用）
//   node scripts/food-pipeline/apply.mjs --dry-run            … 変更せず結果だけ表示
//
// 安全策:
//   - _approved:true のものだけを適用（自動昇格しない）
//   - 重複（dish/dish_en の正規化一致）はスキップ
//   - source（出典表記）が無いエントリは適用しない（出典義務）
//   - 適用/スキップした承認済みエントリは pending から除去
import {
  loadPending,
  savePending,
  dictPathForRegion,
  loadJson,
  saveJson,
  toOfficialEntry,
  dedupKeys,
  normalizeName,
} from "./lib/format.mjs";

function parseArgs(argv) {
  const a = { approve: [], approveAll: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--approve") a.approve = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === "--approve-all") a.approveAll = true;
    else if (argv[i] === "--dry-run") a.dryRun = true;
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const pending = loadPending();
  if (pending.length === 0) {
    console.log("pending-foods.json は空です。適用対象はありません。");
    return;
  }

  // --approve / --approve-all で承認マークを付ける
  const approveSet = new Set(args.approve.map(normalizeName));
  for (const e of pending) {
    if (args.approveAll) e._approved = true;
    else if (approveSet.has(normalizeName(e.dish)) || (e.dish_en && approveSet.has(normalizeName(e.dish_en)))) {
      e._approved = true;
    }
  }

  const approved = pending.filter((e) => e._approved === true);
  if (approved.length === 0) {
    console.log("承認済み（_approved:true）の候補がありません。");
    console.log("  → pending に \"_approved\": true を付けるか、--approve \"料理名\" / --approve-all を使ってください。");
    return;
  }

  // 地域ごとにまとめて適用
  const byRegion = new Map();
  for (const e of approved) {
    const r = e._region;
    if (!byRegion.has(r)) byRegion.set(r, []);
    byRegion.get(r).push(e);
  }

  const processedKeys = new Set(); // pending から除去する承認済みエントリの識別
  let appliedTotal = 0;
  let skippedTotal = 0;
  const report = [];

  for (const [region, entries] of byRegion) {
    let dict;
    try {
      dict = loadJson(dictPathForRegion(region), []) ?? [];
    } catch (err) {
      report.push(`  [${region}] 辞書パス解決エラー: ${err.message}（スキップ）`);
      continue;
    }
    // 既存 + これから追加する分の重複キー集合
    const seen = new Set();
    for (const d of dict) for (const k of dedupKeys(d)) seen.add(k);

    const toAppend = [];
    for (const e of entries) {
      const idKey = `${region}:${normalizeName(e.dish)}`;
      const keys = dedupKeys(e);
      if (!e.source || !String(e.source).trim()) {
        report.push(`  [${region}] "${e.dish}" は source（出典）が無いため適用せず保留`);
        continue; // pendingに残す（除去しない）
      }
      if (keys.some((k) => seen.has(k))) {
        report.push(`  [${region}] "${e.dish}" は既存と重複 → スキップ`);
        processedKeys.add(idKey);
        skippedTotal++;
        continue;
      }
      toAppend.push(toOfficialEntry(e));
      for (const k of keys) seen.add(k);
      processedKeys.add(idKey);
      appliedTotal++;
      report.push(`  [${region}] + "${e.dish}" を追加`);
    }

    if (toAppend.length && !args.dryRun) {
      saveJson(dictPathForRegion(region), [...dict, ...toAppend]);
    }
  }

  // 適用/スキップ済みの承認エントリを pending から除去（source無しは残す）
  const remaining = pending.filter(
    (e) => !(e._approved === true && processedKeys.has(`${e._region}:${normalizeName(e.dish)}`))
  );
  if (!args.dryRun) savePending(remaining);

  console.log(report.join("\n") || "（適用対象なし）");
  console.log("");
  console.log(
    `${args.dryRun ? "[DRY-RUN] " : ""}追加 ${appliedTotal} 件 / 重複スキップ ${skippedTotal} 件 / pending残 ${
      args.dryRun ? pending.length : remaining.length
    } 件`
  );
}

main();
