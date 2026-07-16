// 入口B: ユーザー辞書からの昇格。
//
// **重要な方針**: ユーザー辞書の栄養値は昇格させない。
//   「何を追加すべきか（料理名）」＝ユーザーデータ由来 / 「栄養値」＝政府DB由来。
//   → demand-ranking.json の料理名だけを取り出し、入口A（政府DBアダプタ）で栄養値を作り直す。
//   → 政府DBで生成できない料理のみ、ユーザー辞書の値を _warnings 付きの参考値として載せ、人間が判断。
//
// 使い方:
//   node --env-file=.env.local scripts/food-pipeline/promote.mjs --region jp --limit 10
import path from "node:path";
import {
  PIPELINE_DIR,
  loadPending,
  savePending,
  loadJson,
  dictPathForRegion,
  dedupKeys,
  normalizeName,
  round2,
} from "./lib/format.mjs";
import { fetchUserFoods } from "./lib/db.mjs";
import { inspectEntry } from "./lib/inspect.mjs";

function parseArgs(argv) {
  const a = { region: "jp", limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region") a.region = argv[++i];
    else if (argv[i] === "--limit") a.limit = Math.max(1, parseInt(argv[++i], 10) || 10);
  }
  return a;
}

// 政府DBで作れなかった料理だけ、ユーザー辞書の値を「参考値」として載せる（要精査）。
function referenceFromUserFood(row, region, demand) {
  const sodium = Number(row.sodium) || 0;
  const entry = {
    dish: (row.name_ja || row.name || "").trim(),
    category: row.category || "主菜",
    confidence: "C", // 参考値＝低
    serving: "1食（ユーザー登録値）",
    serving_g: null, // ユーザー辞書に分量が無い → 検品で警告が立つ
    energy_kcal: round2(Number(row.calories) || 0),
    protein_g: round2(Number(row.protein) || 0),
    fat_g: round2(Number(row.fat) || 0),
    carb_g: round2(Number(row.carb) || 0),
    salt_g: round2((sodium * 2.54) / 1000),
    sodium_mg: round2(sodium),
    note: "政府DBで生成できなかったため、ユーザー登録値を参考掲載",
    recipe: "",
    incomplete: "ユーザー登録値（未検証）",
    source: "ユーザー辞書の登録値（参考・未検証／政府DB未収載）",
    _origin: "user-promotion",
    _region: region,
    _sourceDetail: { method: "user-reference", demand },
  };
  entry._warnings = [
    "⚠️ 政府DBで生成できず、ユーザー辞書の値を参考値として掲載（栄養値は未検証・要精査）",
    ...inspectEntry(entry, region),
  ];
  return entry;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ranking = loadJson(path.join(PIPELINE_DIR, "demand-ranking.json"), null);
  if (!ranking || !ranking.length) {
    console.error("demand-ranking.json がありません（または空）。先に demand.mjs を実行してください。");
    process.exit(1);
  }

  let adapter;
  try {
    adapter = await import(`./adapters/${args.region}.mjs`);
  } catch (e) {
    console.error(`地域 ${args.region} のアダプタが読み込めません: ${e.message}`);
    process.exit(1);
  }

  // フォールバック用に user_foods を取得（失敗しても続行＝参考値が使えないだけ）
  let userRows = [];
  try {
    userRows = (await fetchUserFoods()).rows;
  } catch (e) {
    console.log(`（user_foods を取得できず、参考値フォールバックは無効: ${e.message}）`);
  }
  const userByName = new Map();
  for (const r of userRows) {
    const key = normalizeName(r.name_ja || r.name || "");
    const prev = userByName.get(key);
    if (!prev || (Number(r.uses) || 0) > (Number(prev.uses) || 0)) userByName.set(key, r);
  }

  const pending = loadPending();
  const dict = loadJson(dictPathForRegion(args.region), []) ?? [];
  const seen = new Set();
  for (const d of [...dict, ...pending]) for (const k of dedupKeys(d)) seen.add(k);

  let gov = 0;
  let ref = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of ranking.slice(0, args.limit)) {
    const dish = row.dish || row.name;
    if (!dish) continue;
    if (seen.has(normalizeName(dish))) {
      console.log(`- スキップ（既存/重複）: ${dish}`);
      skipped++;
      continue;
    }
    const demand = { users: row.users ?? 0, uses: row.uses ?? 0 };
    process.stdout.write(`- 昇格候補: ${dish} … 政府DBで再生成中 … `);

    let entry = null;
    try {
      entry = await adapter.generateEntry(dish);
    } catch (e) {
      entry = { error: e.message };
    }

    if (entry && !entry.error) {
      // 料理名はユーザー由来 / 栄養値は政府DB由来
      entry._origin = "user-promotion";
      entry._sourceDetail = { ...(entry._sourceDetail ?? {}), demand };
      pending.push(entry);
      for (const k of dedupKeys(entry)) seen.add(k);
      gov++;
      console.log(`OK（政府DB値）${entry.energy_kcal}kcal`);
      continue;
    }

    // 政府DBで作れない → ユーザー辞書の値を参考値として（人間が判断）
    const urow = userByName.get(normalizeName(dish));
    if (urow) {
      const r = referenceFromUserFood(urow, args.region, demand);
      pending.push(r);
      for (const k of dedupKeys(r)) seen.add(k);
      ref++;
      console.log(`政府DB不可 → ユーザー参考値で掲載（要精査）`);
    } else {
      failed++;
      console.log(`失敗（${entry?.error ?? "不明"}・参考値も無し）`);
    }
  }

  savePending(pending);
  console.log("");
  console.log(
    `政府DB再生成 ${gov} 件 / ユーザー参考値 ${ref} 件 / スキップ ${skipped} 件 / 失敗 ${failed} 件  → pending 計 ${pending.length} 件`
  );
  console.log("次: node scripts/food-pipeline/review.mjs で目視 → apply.mjs で承認");
}

main().catch((e) => {
  console.error("エラー:", e.message);
  process.exit(1);
});
