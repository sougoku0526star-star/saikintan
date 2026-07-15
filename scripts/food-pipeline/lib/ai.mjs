// パイプライン用のAIヘルパー（型1 compose のみ使用）。LETTER_MODEL を使う。
// 実行時は環境変数が必要: `node --env-file=.env.local scripts/food-pipeline/generate.mjs ...`
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.LETTER_MODEL || "claude-sonnet-5";

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。`node --env-file=.env.local scripts/food-pipeline/generate.mjs ...` で実行してください。"
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

async function structured(prompt, schema, maxTokens = 1500) {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    output_config: { format: { type: "json_schema", schema } },
  });
  const block = msg.content.find((b) => b.type === "text");
  const raw = block && "text" in block ? block.text : "{}";
  return JSON.parse(raw);
}

// カテゴリ候補（既存の japanese-dishes.json の語彙に合わせる）。
export const JP_CATEGORIES = [
  "主菜",
  "主菜・肉",
  "主菜・魚",
  "主菜・卵",
  "主菜・豆腐",
  "主菜・中華",
  "主菜・洋",
  "副菜",
  "汁物",
  "主食",
  "丼",
  "おつまみ",
  "お菓子",
  "飲み物・酒",
  "おかず・自炊",
];

const COMPOSITION_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: JP_CATEGORIES },
    serving: { type: "string", description: "標準的な1食の分量表現（例: 1人前 / 小鉢1杯）" },
    ingredients: {
      type: "array",
      description: "標準的な1食を構成する主要な食材と、その可食部グラム数",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "食材名（一般的な呼び方）" },
          grams: { type: "number", description: "この料理1食あたりのグラム数（可食部）" },
          mext_name: {
            type: "string",
            description:
              "日本食品標準成分表(八訂)の食品名に近い表記（例: 若鶏肉 むね 皮なし ゆで / こいくちしょうゆ / 根深ねぎ 葉 軟白 生）",
          },
        },
        required: ["name", "grams", "mext_name"],
        additionalProperties: false,
      },
    },
  },
  required: ["category", "serving", "ingredients"],
  additionalProperties: false,
};

/** 料理名 → 標準的な構成食材とグラム数（compose の第1段）。 */
export async function estimateComposition(dishName) {
  const prompt = `「${dishName}」の、日本の家庭・飲食店で一般的な「標準的な1食分」の構成を、
プロの栄養士として推定してください。主要な食材を、可食部グラム数つきで列挙します。
調味料（しょうゆ・油・砂糖等）も栄養に効くものは含めてください（微量の香辛料は省略可）。
各食材には、日本食品標準成分表(八訂)で照合しやすい mext_name（成分表の食品名に近い表記）も付けてください。
料理名: ${dishName}`;
  return structured(prompt, COMPOSITION_SCHEMA);
}

const CHOOSE_SCHEMA = {
  type: "object",
  properties: {
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "対象の食材名（入力のnameをそのまま返す）" },
          mext_name: {
            type: "string",
            description: "候補リストから最も適切な成分表の食品名を1つ。適切な候補が無ければ空文字",
          },
        },
        required: ["name", "mext_name"],
        additionalProperties: false,
      },
    },
  },
  required: ["choices"],
  additionalProperties: false,
};

/**
 * 曖昧な食材について、成分表の候補リストから最適な食品名を選ばせる（compose の第2段・グラウンディング）。
 * @param items [{ name, candidates: string[] }]
 * @returns Map<name, mext_name|"">
 */
export async function chooseMatches(dishName, items) {
  if (!items.length) return new Map();
  const listText = items
    .map(
      (it, i) =>
        `${i + 1}. 食材「${it.name}」\n   候補:\n${it.candidates
          .map((c, j) => `     ${j + 1}) ${c}`)
          .join("\n")}`
    )
    .join("\n");
  const prompt = `料理「${dishName}」の構成食材について、それぞれ日本食品標準成分表(八訂)の候補から
最も適切な食品名を1つ選んでください。生/ゆで/焼き等の状態や部位が料理に合うものを選ぶこと。
適切な候補が無ければ mext_name は空文字にしてください（推測で選ばない）。

${listText}`;
  const res = await structured(prompt, CHOOSE_SCHEMA, 1200);
  const map = new Map();
  for (const c of res.choices ?? []) map.set(c.name, (c.mext_name ?? "").trim());
  return map;
}
