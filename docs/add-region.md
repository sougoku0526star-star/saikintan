# 新しい地域を辞書拡充パイプラインに追加する手順

対象: `scripts/food-pipeline/`（食品辞書 拡充パイプライン）。
**データは需要が見えてから作る**。この文書は「手順だけ」先に用意しておくためのもの。

> 大原則（全地域共通）
> - **政府DB（公的な食品成分データ）が主軸**。ユーザー辞書の栄養値は昇格させない。
> - **承認は全件、人間が目視**。自動昇格はしない。
> - **出典表記の義務を守る**（`source` フィールド必須。ライセンス条件を必ず確認）。

---

## ① その国の一次ソースが【型1】か【型2】かを判定する

| 型 | 判定基準 | 生成方法 | AI利用 | confidence |
|---|---|---|---|---|
| **型1: 食材ベース** | ソースが「**食材**」の成分表（料理の完成品データが無い） | compose：料理→構成食材＋g推定→照合→合算 | LETTER_MODEL（構成推定・同定補助） | `B`（中） |
| **型2: 料理ベース** | ソースに「**料理**」単位の栄養データがある | 直引き：料理名で検索して変換 | ほぼ不要（原価ゼロ） | `A`（高） |

判定に迷ったら「その国の一般的な外食メニュー名（例: 牛丼 / Fish and Chips）が、ソースにそのまま載っているか」で判断する。
載っていれば型2、食材（鶏むね肉・米）しか無ければ型1。

## ② 対応する既存アダプタを雛形にコピー

- 型2 → `adapters/TEMPLATE.mjs`（既定が型2）または `adapters/au.mjs` をコピー。`lib/type2.mjs` を共用するので実装は薄い。
- 型1 → `adapters/jp.mjs` をコピーし、成分表の読み込み・プロンプトの言語/食文化を差し替える。

## ③ 一次ソースの確認事項（**着手前に必ず埋める**）

| 確認項目 | メモ |
|---|---|
| 公開URL | |
| フォーマット | Excel / CSV / API / PDF（PDFのみなら要検討） |
| ライセンス | |
| **二次利用の可否** | 商用利用・再配布の条件 |
| **出典表記の義務** | 必要な文言（例: 日本＝「日本食品標準成分表（八訂）増補2023年から引用」） |
| 更新頻度・版 | 版番号と取得日を `_sourceDetail.retrievedOn` に記録 |

**二次利用の可否が確認できない場合は、ここで停止して報告する**（データを作らない）。

## ④ セットアップスクリプトでローカルJSON化

- `setup-<region>.mjs` を用意し、一次ソース → `data/<region>-source.json`（型2）または
  `data/<region>-seibun.json`（型1）に変換する。
- `data/` は `.gitignore` 済み。**サイズが大きいのでコミットせず、スクリプトで再生成可能**にする。
- 参考実装: `setup-mext.mjs`（日本・Excel→JSON。成分識別子で列を特定し、`(x)`推定値/`Tr`/`-` を正規化）。

## ⑤ generate.mjs に region を追加

1. `lib/format.mjs` の `REGION_DICT` に `<region>: "lib/<region>-dishes.json"` を追加
   （出口の `apply.mjs` がこの辞書へマージする）。
2. `adapters/<region>.mjs` を置く（`generate.mjs` が動的importする）。
3. 動作確認:
   ```bash
   node --env-file=.env.local scripts/food-pipeline/generate.mjs --region <region> --dishes "料理名"
   node scripts/food-pipeline/review.mjs      # 目視
   node scripts/food-pipeline/apply.mjs --approve "料理名"
   ```
4. アプリ側で辞書を読ませる場合は `lib/<region>-data.ts` ローダを追加し、`lib/nutrition.ts` の
   `allFoods` / `foodTaxonomy` に組み込む（既存の `australia-data.ts` を参照）。

---

## 横展開の候補（分類のみ・実データは未着手）

需要（`demand-ranking.json`）で必要性が見えた地域から着手する。

| 地域 | 一次ソース | 想定される型 | 備考 |
|---|---|---|---|
| 🇺🇸 米 | USDA FoodData Central | **型2寄り** | Survey (FNDDS) に料理単位あり。API/CSV公開。要ライセンス確認 |
| 🇬🇧 英 | CoFID (Composition of Foods Integrated Dataset) | **型1寄り** | 食材中心。OGL系だが要確認 |
| 🇫🇷 仏 | Ciqual (ANSES) | **型1寄り** | 食材中心。**仏語**なので名寄せ・プロンプトの言語対応が必要 |
| 🇨🇦 加 | Canadian Nutrient File (CNF) | 型1寄り | 食材中心。英仏バイリンガル |

> いずれも**着手時に③の確認表を必ず埋める**こと。公開形態は変わることがある。
