# 彩金譚 (Saikintan)

海外で暮らす日本人のための、写真1枚で食事を記録するモバイルファーストなWebアプリケーション。
Next.js (App Router) + TypeScript。

## セットアップ（ローカル開発）

```bash
npm install
cp .env.example .env.local   # 値を埋める（DBは未設定でOK・下記参照）
npm run dev
```

`http://localhost:3000` で起動。写真解析（Claude）を使うには `ANTHROPIC_API_KEY` が必要。

## データベース（libSQL / Turso）

DBは **libSQL**（SQLite互換）を使い、接続先を環境変数で自動的に切り替える。

| 環境 | 接続先 | 条件 |
| --- | --- | --- |
| ローカル開発 | ファイル `.data/saikintan.db`（SQLite） | `TURSO_*` が未設定のとき（デフォルト） |
| 本番 / Vercel | Turso | `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` の両方が設定されているとき |

- **ローカルは設定不要**。従来どおりファイルベースのSQLiteとして動作する（`.data/` はgit管理外）。
- スキーマ（テーブル定義・不足カラムのALTER）は初回アクセス時に自動適用される。マイグレーションの手動実行は不要。
- libSQLはSQLite互換なので、ローカルファイルでもTursoでも同じスキーマ・同じSQLがそのまま動く。

> なぜファイルSQLiteではダメか: Vercelのサーバーレス関数はデプロイ済みコード（`/var/task`）が
> 読み取り専用のため、`mkdir '/var/task/.data'` に失敗する（`ENOENT`）。書き込み可能な
> マネージドDBが必要になるため、本番だけTursoへ逃がす。

### 本番（Turso）への移行手順

1. **アカウント作成**: https://turso.tech でサインアップ（GitHubログイン可）。無料枠あり。

2. **Turso CLI をインストール**
   ```bash
   # macOS / Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   # (Homebrew) brew install tursodatabase/tap/turso
   ```

3. **ログイン**
   ```bash
   turso auth login
   ```

4. **DBを作成**
   ```bash
   turso db create saikintan
   ```

5. **接続URLを取得**（`libsql://...` 形式）
   ```bash
   turso db show saikintan --url
   ```

6. **認証トークンを発行**
   ```bash
   turso db tokens create saikintan
   ```

7. **環境変数を設定**
   - ローカルで本番DBに繋いで確認したい場合は `.env.local` に:
     ```
     TURSO_DATABASE_URL=libsql://saikintan-<org>.turso.io
     TURSO_AUTH_TOKEN=<発行したトークン>
     ```
   - Vercel では **Project → Settings → Environment Variables** に同じ2つを登録
     （Production / Preview に付与）。

8. **デプロイ**。初回リクエストでスキーマが自動作成される。マイグレーションコマンドの実行は不要。

> ローカルに戻すときは `.env.local` の `TURSO_*` をコメントアウト/削除するだけで、
> 自動的に `.data/saikintan.db` へフォールバックする。

## 環境変数

`.env.example` を参照。主なもの:

- `ANTHROPIC_API_KEY` — 写真解析・文章生成（Claude）
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — 本番DB（未設定ならローカルファイル）
- `NEXT_PUBLIC_MAPBOX_TOKEN` — 地図表示
- `EXCHANGERATE_API_KEY` — 為替レート取得
- `LETTER_MODEL` / `ANALYZE_MODEL` — 使用モデルの上書き（任意）

## ビルド

```bash
npm run build
```
