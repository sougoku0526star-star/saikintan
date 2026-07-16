// パイプライン用のDB接続（読み取り専用の想定）。アプリの lib/server/pg.ts と同じ切り替え規則:
//   TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が両方あれば Turso、無ければローカル file:.data/saikintan.db
// 実行例: node --env-file=.env.local scripts/food-pipeline/demand.mjs
import path from "node:path";
import { REPO_ROOT } from "./format.mjs";

let cached = null;

export async function getDb() {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    const { createClient } = await import("@libsql/client/web");
    cached = { client: createClient({ url, authToken }), target: `Turso (${url.slice(0, 28)}…)` };
  } else {
    const { createClient } = await import("@libsql/client");
    const file = path.join(REPO_ROOT, ".data", "saikintan.db");
    cached = { client: createClient({ url: `file:${file}` }), target: `ローカル (${path.relative(REPO_ROOT, file)})` };
  }
  return cached;
}

/** user_foods から「ユーザー登録（slug が user- 始まり）」のエントリを全件取得。 */
export async function fetchUserFoods() {
  const { client, target } = await getDb();
  const res = await client.execute({
    sql: `SELECT user_id, slug, name, name_ja, category, calories, protein, fat, carb, sodium, uses
          FROM user_foods WHERE slug LIKE 'user-%'`,
    args: [],
  });
  return { rows: res.rows, target };
}
