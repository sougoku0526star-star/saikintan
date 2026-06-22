#!/usr/bin/env node
// ローカルDB(.data)を「ブランチ」のように退避・復元するツール。
//
// .data は SQLite の実体（ユーザー/記録/フレンド/メッセージ/画像）。git管理外なので、
// このスクリプトで名前付きスナップショットとして保存し、いつでも切り替えられる。
// 名前を省略すると、現在のGitブランチ名を使う（＝コードのブランチとデータが揃う）。
//
// 使い方:
//   node scripts/data.mjs save  [name]   現在の .data を保存
//   node scripts/data.mjs load  [name]   保存済みデータを .data に復元
//   node scripts/data.mjs list           スナップショット一覧
//   node scripts/data.mjs delete <name>  スナップショットを削除
//   node scripts/data.mjs reset          .data を空にする（次回起動でデモ再シード）
//
// 注意: 開発サーバーはDB接続をキャッシュするため、load/reset の後は再起動すること。

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, ".data");
const STORE = path.join(ROOT, ".data-snapshots");

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

// スナップショット名を安全なディレクトリ名へ（feature/x → feature-x）
function safeName(name) {
  return name.replace(/[^\w.-]+/g, "-");
}

function resolveName(arg) {
  const name = arg || currentBranch();
  if (!name) {
    console.error(
      C.red("名前を指定してください（Gitブランチも検出できませんでした）。")
    );
    process.exit(1);
  }
  return safeName(name);
}

function dirSize(p) {
  let total = 0;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    total += e.isDirectory() ? dirSize(fp) : statSync(fp).size;
  }
  return total;
}
const human = (n) =>
  n < 1024 ? `${n}B` : n < 1048576 ? `${(n / 1024).toFixed(0)}KB` : `${(n / 1048576).toFixed(1)}MB`;

function save(arg) {
  if (!existsSync(DATA)) {
    console.error(C.red(".data がありません（まだ何も保存されていません）。"));
    process.exit(1);
  }
  const name = resolveName(arg);
  const dest = path.join(STORE, name);
  mkdirSync(STORE, { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(DATA, dest, { recursive: true });
  console.log(
    `${C.green("✓ 保存しました")}  ${C.bold(name)} ${C.dim(`(${human(dirSize(dest))})`)}`
  );
}

function load(arg) {
  const name = resolveName(arg);
  const src = path.join(STORE, name);
  if (!existsSync(src)) {
    console.error(C.red(`スナップショット "${name}" が見つかりません。`));
    console.error(C.dim("`node scripts/data.mjs list` で一覧を確認できます。"));
    process.exit(1);
  }
  // 直前の .data を _prev に退避（誤操作からの復帰用）
  if (existsSync(DATA)) {
    const prev = path.join(STORE, "_prev");
    rmSync(prev, { recursive: true, force: true });
    cpSync(DATA, prev, { recursive: true });
  }
  rmSync(DATA, { recursive: true, force: true });
  cpSync(src, DATA, { recursive: true });
  console.log(`${C.green("✓ 復元しました")}  ${C.bold(name)} → .data`);
  console.log(C.dim("（直前のデータは _prev に退避済み）"));
  console.log(C.cyan("→ 開発サーバーを再起動してください（DB接続キャッシュのため）。"));
}

function list() {
  if (!existsSync(STORE) || readdirSync(STORE).length === 0) {
    console.log(C.dim("スナップショットはまだありません。"));
    return;
  }
  const branch = currentBranch();
  const rows = readdirSync(STORE, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const fp = path.join(STORE, e.name);
      return { name: e.name, size: human(dirSize(fp)), mtime: statSync(fp).mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  console.log(C.bold("スナップショット一覧:"));
  for (const r of rows) {
    const here = r.name === branch ? C.green("  ← 現在のブランチ") : "";
    const mark = r.name === "_prev" ? C.dim("（自動退避）") : "";
    const when = r.mtime.toLocaleString("ja-JP");
    console.log(
      `  ${C.cyan(r.name.padEnd(20))} ${String(r.size).padStart(7)}  ${C.dim(when)} ${mark}${here}`
    );
  }
}

function del(arg) {
  if (!arg) {
    console.error(C.red("削除する名前を指定してください。"));
    process.exit(1);
  }
  const name = safeName(arg);
  const target = path.join(STORE, name);
  if (!existsSync(target)) {
    console.error(C.red(`スナップショット "${name}" が見つかりません。`));
    process.exit(1);
  }
  rmSync(target, { recursive: true, force: true });
  console.log(`${C.green("✓ 削除しました")}  ${name}`);
}

function reset() {
  rmSync(DATA, { recursive: true, force: true });
  console.log(`${C.green("✓ .data を空にしました")}`);
  console.log(C.cyan("→ サーバーを再起動すると、デモデータが再シードされます。"));
}

const [cmd, arg] = process.argv.slice(2);
switch (cmd) {
  case "save":
    save(arg);
    break;
  case "load":
    load(arg);
    break;
  case "list":
    list();
    break;
  case "delete":
  case "rm":
    del(arg);
    break;
  case "reset":
    reset();
    break;
  default:
    console.log(
      [
        C.bold("データのブランチ管理 (.data)"),
        "",
        "  node scripts/data.mjs save  [name]   現在の .data を保存（省略時=Gitブランチ名）",
        "  node scripts/data.mjs load  [name]   保存済みデータを .data に復元",
        "  node scripts/data.mjs list           一覧",
        "  node scripts/data.mjs delete <name>  削除",
        "  node scripts/data.mjs reset          空にする（デモ再シード）",
        "",
        C.dim("npm 経由: npm run data save / load / list（引数は `--` の後ろ）"),
      ].join("\n")
    );
}
