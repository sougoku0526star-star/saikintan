import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fallbackLetter, type PeriodStats, type WeeklyLetter } from "@/lib/weekly";
import { getAuthUser } from "@/lib/server/user";
import { gohankunSystemPrompt, gohankunYou } from "@/lib/server/gohankun-persona";

export const runtime = "nodejs";

const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";

const SCHEMA = {
  type: "object",
  properties: {
    greeting: { type: "string", description: "ごはんくんからの一文の挨拶" },
    body: {
      type: "array",
      items: { type: "string" },
      description: "ごはんくんからの本文（2〜3段落）",
    },
    sign: { type: "string", description: "署名（必ず「— ごはんくんより」）" },
  },
  required: ["greeting", "body", "sign"],
  additionalProperties: false,
} as const;

export async function POST(req: Request) {
  let stats: PeriodStats;
  try {
    stats = (await req.json()) as PeriodStats;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || stats.mealsCount === 0) {
    return NextResponse.json({ letter: fallbackLetter(stats), source: "fallback" });
  }

  try {
    const client = new Anthropic();
    const me = getAuthUser();
    const userName = me?.nickname ?? me?.username ?? null;
    const you = gohankunYou(userName);
    const term = stats.kind === "week" ? "今週" : "今月";
    const prompt = `${you}の${term}の食事記録の集計だよ。これをもとに、ごはんくんから
${you}へ、あたたかく前向きな短い手紙を日本語で書いてください。

# ルール
- 具体的な数値（食費・予算・栄養傾向）に、ごはんくんらしく自然に触れる
- 責めない。サボり気味・栄養が偏っていても、怒らず「寂しがる・心配する」寄り添いトーンで、軽い提案を1つ
- 海外でがんばる${you}に寄り添うあたたかい一言を必ず添える
- body は2〜3段落、各60〜120字程度。署名は必ず「— ごはんくんより」

# ${term}の集計
- 期間: ${stats.label}
- 記録数: ${stats.mealsCount}食
- 食費: S$${stats.totalSgd}（約¥${stats.totalJpy}） / 予算 S$${stats.budgetSgd}（${stats.budgetPct}%）
- 総カロリー: ${stats.calories}kcal
- PFCカロリー比: タンパク質${stats.pfcPct.protein}% / 脂質${stats.pfcPct.fat}% / 炭水化物${stats.pfcPct.carb}%
- 塩分合計: ${stats.sodium}mg
- 食べたもの: ${stats.dishes.slice(0, 12).join("、")}`;

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: gohankunSystemPrompt(userName),
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = msg.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const json = JSON.parse(raw);
    const letter: WeeklyLetter = {
      greeting: String(json.greeting ?? ""),
      body: Array.isArray(json.body) ? json.body.map(String) : [],
      sign: String(json.sign ?? "— ごはんくんより"),
    };
    if (!letter.greeting || letter.body.length === 0) throw new Error("empty letter");
    return NextResponse.json({ letter, source: "ai" });
  } catch (e) {
    console.error("weekly-letter failed:", e);
    return NextResponse.json({ letter: fallbackLetter(stats), source: "fallback" });
  }
}
