# 開発ワークフロー（コードのブランチ ＋ データのブランチ）

アプリの修正・改善を、**コード**も**データ（ローカルDB）**も安全に行き来できるようにしています。

## コード（git）

- `main` … 安定版（リリース相当）
- `dev` … 作業ブランチ（ふだんの修正・改善はここ）

```sh
git switch -c feature/xxx   # 新しい作業ブランチを切る
git add -A && git commit -m "…"   # 区切りでコミット
git switch dev && git merge feature/xxx   # 取り込み
```

> `.data`（SQLite）・`.next`・`node_modules`・`.env*` は `.gitignore` 済み（コミットされない）。

## データ（.data のスナップショット）

`.data` はユーザー/記録/フレンド/メッセージ/画像の実体。git管理外なので、
専用ツールで**名前付きスナップショット**として保存・復元します。
名前を省略すると **現在のGitブランチ名** を使うので、コードとデータを揃えられます。

```sh
node scripts/data.mjs save        # 今の .data を保存（名前=現在のブランチ）
node scripts/data.mjs save 名前    # 名前を指定して保存
node scripts/data.mjs load 名前    # 保存済みデータを .data に復元
node scripts/data.mjs list        # 一覧
node scripts/data.mjs delete 名前  # 削除
node scripts/data.mjs reset       # .data を空に（次回起動でデモ再シード）
```

`npm run data save` のように npm 経由でも可（引数は `npm run data -- save 名前`）。

### 典型的な流れ

```sh
# 実験を始める前に、今の状態を退避
node scripts/data.mjs save

# 壊しても OK な実験 … もし戻したくなったら
node scripts/data.mjs load        # 退避した状態へ復元 → サーバー再起動

# まっさらなデモから試したいとき
node scripts/data.mjs reset       # → サーバー再起動でデモ再シード
```

> ⚠️ 開発サーバーはDB接続をキャッシュします。`load`/`reset` の後は **サーバーを再起動** してください。
> `load` 実行時、直前の `.data` は自動で `_prev` に退避されるので、誤操作も戻せます。

## 保存済みスナップショット（初期）

- `baseline` … クリーンなデモ初期状態
- `dev` … dev ブランチ用

## トラブルシュート

### 白画面に文字だけ／`Cannot find module './XXXX.js'`
Next.js dev の `.next` ビルドキャッシュ破損が原因（コードのバグではない）。
よくある引き金:
- **dev サーバー稼働中に `npm run build` を実行**（本番成果物が同じ `.next` を上書きし、dev のチャンクと食い違う）← 最頻
- 長時間の稼働・HMRの繰り返し
- `tailwind.config` の変更

```sh
# 開発サーバーを止めてから
rm -rf .next
npm run dev   # またはプレビューを再起動（クリーンビルド）
```

> ⚠️ **`npm run build` は dev/プレビューを止めてから実行する**（並行実行で `.next` が壊れる）。
> 型だけ確認したいときは `npx tsc --noEmit` で十分。ビルド検証が必要なときは
> 「プレビュー停止 → `npm run build` → プレビュー再開」の順で。
> `tailwind.config.ts` を変更したときも、確実に反映するにはサーバー再起動が安全。
