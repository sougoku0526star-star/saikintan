# 食品辞書 拡充パイプライン

公式辞書（`lib/japanese-dishes.json` 等）のヒット率を上げ、AI推定への依存とAPI原価を下げるための、
半自動の辞書拡充パイプライン。**開発者のローカル手動実行のみ**（本番Vercelには乗せない）。

```
[入口A] 政府DBからの新規生成 ─┐
                              ├→ [承認キュー pending-foods.json] → (人間が全件目視) → 公式辞書JSON
[入口B] ユーザー辞書からの昇格 ─┘
```

## 大原則

- **政府DBが主軸**。ユーザー辞書からは「何を追加すべきか（料理名）」だけを取り、栄養値は政府DBで作り直す。
- **承認は全件、人間（開発者）が目視**。自動昇格は一切しない（誤った栄養値を全ユーザーに配る事故を防ぐ）。
- 入口は地域・ソース種別ごとの別アダプタ、出口（承認・昇格）は共通。
- 出典表記の義務を守る（`source` フィールド必須。source が無い候補は apply が適用しない）。

## ソースの2類型

| 型 | 説明 | 例 | AI利用 |
|---|---|---|---|
| 型1: 食材ベース（compose） | 食材の成分表しかない。料理→構成食材推定→照合→合算 | 日本（文科省 成分表） | LETTER_MODEL で構成食材を推定 |
| 型2: 料理ベース（直引き） | 料理単位の栄養データが既にある。検索して直引き | SG(HPB)、AU(AFCD) | 名寄せの補助のみ（ほぼ不要） |

## ディレクトリ

```
scripts/food-pipeline/
  pending-foods.json     承認待ちキュー（公式フォーマット＋メタ _origin/_region/_warnings/_sourceDetail/_approved）
  review.mjs             pending → レビュー用 review.md を生成（目視用）
  apply.mjs              _approved:true の候補を公式辞書へマージ（重複skip・pendingから除去）
  lib/
    format.mjs           フォーマット定義・I/O・名寄せ・地域→辞書パス
    inspect.mjs          自動検品（QC）→ _warnings を立てる
  adapters/              地域アダプタ（jp.mjs / sg.mjs / au.mjs / TEMPLATE.mjs）※順次追加
  data/                  政府DBのローカルJSON（mext-seibun.json 等）※.gitignore・setupで再生成
```

## 使い方（出口・承認フロー）

```bash
# 1) 候補を生成（入口A/B。詳細は各タスクのスクリプト）→ pending-foods.json に溜まる
# 2) レビュー用Markdownを生成して全件を目視
node scripts/food-pipeline/review.mjs        # → scripts/food-pipeline/review.md

# 3) 採用するものを承認（どちらか）
#    a. pending-foods.json の該当エントリに "_approved": true を付ける
#    b. CLIで料理名指定
node scripts/food-pipeline/apply.mjs --approve "よだれ鶏,生姜焼き定食"

# 4) 反映（_approved:true のみ公式辞書へマージ。重複はスキップ）
node scripts/food-pipeline/apply.mjs
node scripts/food-pipeline/apply.mjs --dry-run   # 変更せず結果だけ確認
```

## 自動検品（_warnings）

候補生成時に以下を検査し、怪しいものへ警告を立てる（**自動却下はしない・目視の注意喚起のみ**）:

- 必須栄養素（energy/P/F/C）の欠損・ゼロ、`serving_g` が無効
- PFCから計算したカロリーと `energy_kcal` の乖離（Atwater整合性 > 30%）
- 同カテゴリ既存品とのエネルギー密度が2倍超/半分未満の外れ値

## 承認済みガード（安全策）

`apply.mjs` は次を保証する:
- `_approved:true` のものだけを適用（自動昇格しない）
- `dish` / `dish_en` の正規化一致で重複をスキップ
- `source`（出典表記）が無いエントリは適用しない
- 適用/スキップした承認エントリは pending から除去（source無しは保留）
