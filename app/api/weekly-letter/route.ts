import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  fallbackLetter,
  toNutritionTrend,
  nutritionTrendLabels,
  type PeriodStats,
  type WeeklyLetter,
} from "@/lib/weekly";
import { getAuthUser } from "@/lib/server/user";
import {
  gohankunSystemPrompt,
  gohankunYou,
  violatesGohankunRules,
} from "@/lib/server/gohankun-persona";
import { formatMoney } from "@/lib/currency";

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
    const trendLabels = nutritionTrendLabels(toNutritionTrend(stats));
    const prompt = `${you}の${term}の食事記録の集計だよ。これをもとに、ごはんくんから
${you}へ、あたたかく前向きな短い手紙を日本語で書いてください。

# ルール
- 支出（食費・予算・%）は具体的な数値に自然に触れてよい（支出は精密）
- 栄養について数値（g・kcal・%・mg）は絶対に使わない。方向感の言葉（「少なめ」「いい感じ」「多め」）だけで語る
- 責めない。サボり気味・栄養が偏っていても、怒らず「寂しがる・心配する」寄り添いトーンで、軽い提案を1つだけ
- 海外でがんばる${you}に寄り添うあたたかい一言を必ず添える
- body は2〜3段落、各60〜120字程度。署名は必ず「— ごはんくんより」

# ${term}の集計
- 期間: ${stats.label}
- 記録数: ${stats.mealsCount}食
- 食費: ${formatMoney(stats.totalMain, stats.mainCurrency)}${stats.mainCurrency === "JPY" ? "" : `（約¥${stats.totalJpy}）`} / 予算 ${formatMoney(stats.budgetMain, stats.mainCurrency)}（${stats.budgetPct}%）
- 栄養の方向感（数値ではなく傾向。この言葉だけで語ること）: ${trendLabels}
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
    // 出力側の機械チェック：禁止ワード/栄養の生数値が混じったら fallback に落とす
    if (
      [letter.greeting, ...letter.body, letter.sign].some(violatesGohankunRules)
    ) {
      throw new Error("letter violates gohankun rules");
    }
    return NextResponse.json({ letter, source: "ai" });
  } catch (e) {
    console.error("weekly-letter failed:", e);
    return NextResponse.json({ letter: fallbackLetter(stats), source: "fallback" });
  }
}
