// 入口A（政府DBからの新規生成）のメイン。対象料理を地域アダプタに通して pending へ追記する。
// 実行（型1=日本はAIを使うので env が必要）:
//   node --env-file=.env.local scripts/food-pipeline/generate.mjs --region jp --dishes "よだれ鶏,生姜焼き定食"
//   node --env-file=.env.local scripts/food-pipeline/generate.mjs --region jp --from demand --limit 20
//
// 引数:
//   --region jp|sg|au         対象地域（必須）
//   --dishes "A,B,C"          料理名を直接指定
//   --from demand             demand-ranking.json の上位から取る
//   --limit N                 1実行の処理上限（既定20・API原価管理）
import path from "node:path";
import {
  PIPELINE_DIR,
  loadPending,
  savePending,
  loadJson,
  dictPathForRegion,
  dedupKeys,
  normalizeName,
} from "./lib/format.mjs";

function parseArgs(argv) {
  const a = { region: null, dishes: [], from: null, limit: 20 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--region") a.region = argv[++i];
    else if (k === "--dishes") a.dishes = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--from") a.from = argv[++i];
    else if (k === "--limit") a.limit = Math.max(1, parseInt(argv[++i], 10) || 20);
  }
  return a;
}

function targetsFromDemand(region, limit) {
  const p = path.join(PIPELINE_DIR, "demand-ranking.json");
  const ranking = loadJson(p, null);
  if (!ranking) {
    throw new Error(
      "demand-ranking.json がありません。先に demand.mjs を実行するか、--dishes で料理名を指定してください。"
    );
  }
  const rows = Array.isArray(ranking) ? ranking : ranking[region] ?? [];
  return rows.slice(0, limit).map((r) => r.dish || r.name || r);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.region) {
    console.error("--region jp|sg|au を指定してください。");
    process.exit(1);
  }

  let targets = args.dishes;
  if (!targets.length && args.from === "demand") targets = targetsFromDemand(args.region, args.limit);
  if (!targets.length) {
    console.error("対象料理がありません。--dishes \"A,B\" か --from demand を指定してください。");
    process.exit(1);
  }
  targets = targets.slice(0, args.limit);

  // アダプタを読み込み
  let adapter;
  try {
    adapter = await import(`./adapters/${args.region}.mjs`);
  } catch (e) {
    console.error(`地域 ${args.region} のアダプタが読み込めません: ${e.message}`);
    process.exit(1);
  }

  const pending = loadPending();
  const dict = loadJson(dictPathForRegion(args.region), []) ?? [];
  // 既存（辞書＋pending）の重複キー集合
  const seen = new Set();
  for (const d of [...dict, ...pending]) for (const k of dedupKeys(d)) seen.add(k);

  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const dish of targets) {
    if (seen.has(normalizeName(dish))) {
      console.log(`- スキップ（既存/重複）: ${dish}`);
      skipped++;
      continue;
    }
    process.stdout.write(`- 生成中: ${dish} … `);
    let entry;
    try {
      entry = await adapter.generateEntry(dish);
    } catch (e) {
      console.log(`失敗（${e.message}）`);
      failed++;
      continue;
    }
    if (entry?.error) {
      console.log(`失敗（${entry.error}）`);
      failed++;
      continue;
    }
    pending.push(entry);
    for (const k of dedupKeys(entry)) seen.add(k);
    added++;
    const w = (entry._warnings ?? []).length;
    console.log(`OK  ${entry.energy_kcal}kcal / ${entry.serving_g}g${w ? `  ⚠️${w}` : ""}`);
  }

  savePending(pending);
  console.log("");
  console.log(`追加 ${added} 件 / スキップ ${skipped} 件 / 失敗 ${failed} 件  → pending 計 ${pending.length} 件`);
  console.log(`次: node scripts/food-pipeline/review.mjs で目視 → apply.mjs で承認・反映`);
}

main().catch((e) => {
  console.error("エラー:", e.message);
  process.exit(1);
});
