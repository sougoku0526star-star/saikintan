// 需要リスト生成（入口Bの前段）。user_foods（＝公式辞書に無くユーザーが登録した料理）を
// 集計し、「次に公式辞書へ追加すべき料理」の優先順位を demand-ranking.json に出力する。
//
// 使い方:
//   node --env-file=.env.local scripts/food-pipeline/demand.mjs            … Turso/ローカルDBから集計
//   node scripts/food-pipeline/demand.mjs --dishes "よだれ鶏,油淋鶏"        … 手動リスト（テストラン前用）
//   node --env-file=.env.local scripts/food-pipeline/demand.mjs --limit 50
//
// 出力: scripts/food-pipeline/demand-ranking.json
//   [{ dish, users, uses, samples }] … 登録ユーザー数 → 累計uses の順で降順
import path from "node:path";
import { PIPELINE_DIR, saveJson, normalizeName } from "./lib/format.mjs";
import { fetchUserFoods } from "./lib/db.mjs";

const OUT = path.join(PIPELINE_DIR, "demand-ranking.json");

function parseArgs(argv) {
  const a = { dishes: [], limit: 100 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dishes") a.dishes = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === "--limit") a.limit = Math.max(1, parseInt(argv[++i], 10) || 100);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // フォールバック: 手動で料理名を指定（テストラン開始前は user_foods がほぼ空のため）
  if (args.dishes.length) {
    const ranking = args.dishes.map((dish) => ({ dish, users: 0, uses: 0, samples: [], manual: true }));
    saveJson(OUT, ranking);
    console.log(`手動リストから生成: ${path.relative(process.cwd(), OUT)}（${ranking.length}件）`);
    for (const r of ranking) console.log(`  - ${r.dish}`);
    return;
  }

  const { rows, target } = await fetchUserFoods();
  console.log(`接続先: ${target}`);
  console.log(`user_foods（user-始まり）: ${rows.length} 行`);

  // 料理名で名寄せ（正規化キー）して、登録ユーザー数・累計uses を集計
  const agg = new Map();
  for (const r of rows) {
    const label = (r.name_ja || r.name || "").trim();
    if (!label) continue;
    const key = normalizeName(label);
    if (!key) continue;
    if (!agg.has(key)) agg.set(key, { dish: label, userSet: new Set(), uses: 0, samples: new Set() });
    const a = agg.get(key);
    a.userSet.add(r.user_id);
    a.uses += Number(r.uses) || 0;
    a.samples.add(label); // 表記ゆれの実例
  }

  const ranking = Array.from(agg.values())
    .map((a) => ({
      dish: a.dish,
      users: a.userSet.size,
      uses: a.uses,
      samples: Array.from(a.samples).slice(0, 5),
    }))
    .sort((x, y) => y.users - x.users || y.uses - x.uses)
    .slice(0, args.limit);

  saveJson(OUT, ranking);
  console.log(`生成: ${path.relative(process.cwd(), OUT)}（${ranking.length}件）`);
  if (!ranking.length) {
    console.log("  （まだユーザー登録の料理がありません。--dishes \"A,B\" で手動指定できます）");
  }
  for (const r of ranking.slice(0, 15)) {
    console.log(`  ${String(r.users).padStart(3)}人 / uses${String(r.uses).padStart(4)}  ${r.dish}`);
  }
  console.log("");
  console.log("次: generate.mjs --from demand（入口A）／ promote.mjs（入口B）");
}

main().catch((e) => {
  console.error("エラー:", e.message);
  process.exit(1);
});
