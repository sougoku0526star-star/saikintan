// 日本食品標準成分表（八訂）増補2023年 の Excel を、アダプタが使うローカルJSONに変換する。
// 一次ソース: 文部科学省 食品成分データベース / 成分表（Excel公開・二次利用可・出典表記要）
//   https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html
//
// 使い方:
//   node scripts/food-pipeline/setup-mext.mjs "<成分表Excelのパス>.xlsx"
//   → scripts/food-pipeline/data/mext-seibun.json を生成（可食部100gあたりの値）
//
// ※ data/ は .gitignore 済み。サイズが大きいのでコミットせず、このスクリプトで再生成する。
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PIPELINE_DIR, saveJson } from "./lib/format.mjs";

const SHEET = "表全体";
const ID_ROW = 12; // 成分識別子の行
const NAME_COL = 4; // 食品名の列
const DATA_START = 13;

// 欲しい成分（識別子 → 出力キー）。可食部100gあたり。
const WANT = {
  ENERC_KCAL: "kcal",
  "PROT-": "protein", // たんぱく質
  "FAT-": "fat", // 脂質
  "CHOCDF-": "carb", // 炭水化物
  "FIB-": "fiber", // 食物繊維総量
  NACL_EQ: "salt", // 食塩相当量(g)
  NA: "sodium",
  K: "potassium",
  CA: "calcium",
  FE: "iron",
  VITC: "vitc",
  ALC: "alcohol",
};

// セル値をプレーンテキストに（richText / 数値 / 文字列を吸収）。
function cellText(v) {
  if (v == null) return null;
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (typeof v.text === "string") return v.text;
    if (typeof v.result !== "undefined") return String(v.result);
    return null;
  }
  return String(v);
}

// 成分表の数値表記を数値へ。 (x)=推定値→数値, Tr=微量→0, -/空=null。
function parseNum(v) {
  let s = cellText(v);
  if (s == null) return null;
  s = s.trim();
  if (s === "" || s === "-") return null;
  if (/^\(?Tr\)?$/i.test(s)) return 0;
  s = s.replace(/[()（）*]/g, "").trim();
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const src = process.argv[2];
  if (!src) {
    console.error("使い方: node scripts/food-pipeline/setup-mext.mjs <成分表Excel.xlsx>");
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(src);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) {
    console.error(`シート「${SHEET}」が見つかりません。シート: ${wb.worksheets.map((w) => w.name).join(", ")}`);
    process.exit(1);
  }

  // 識別子(R12) → 列番号 のマップを作る
  const idRow = ws.getRow(ID_ROW);
  const idToCol = {};
  for (let c = 1; c <= ws.columnCount; c++) {
    const id = cellText(idRow.getCell(c).value);
    if (id) idToCol[id.trim()] = c;
  }
  const missing = Object.keys(WANT).filter((id) => !idToCol[id]);
  if (missing.length) {
    console.error(`識別子が見つかりません: ${missing.join(", ")}（R${ID_ROW}の列レイアウトを確認）`);
    process.exit(1);
  }

  const out = [];
  for (let r = DATA_START; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = cellText(row.getCell(NAME_COL).value);
    if (!name || !name.trim()) continue;
    const rec = { name: name.replace(/\s+/g, " ").trim() };
    for (const [id, key] of Object.entries(WANT)) {
      rec[key] = parseNum(row.getCell(idToCol[id]).value);
    }
    // エネルギーが無い行（区分見出し等）は除外
    if (rec.kcal == null) continue;
    out.push(rec);
  }

  const dataDir = path.join(PIPELINE_DIR, "data");
  mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, "mext-seibun.json");
  saveJson(outPath, out);
  console.log(`生成: ${path.relative(process.cwd(), outPath)}  （食品 ${out.length} 件・可食部100gあたり）`);
  console.log(`例: ${out[0].name} = ${out[0].kcal}kcal / P${out[0].protein} F${out[0].fat} C${out[0].carb}`);
}

main().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});
