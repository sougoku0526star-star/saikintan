import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserId } from "@/lib/server/user";
import { listRecords } from "@/lib/server/records-db";
import { getSettings } from "@/lib/server/settings-db";
import { getRatesToJpy } from "@/lib/server/fx-db";
import {
  SUGGESTION_RULES,
  buildSuggestionContext,
} from "@/lib/server/suggestion-context";
import { gohankunSystemPrompt, violatesGohankunRules } from "@/lib/server/gohankun-persona";
import { consumeToday, remainingToday } from "@/lib/server/rate-limit-db";
import {
  aggregatePeriod,
  weekStartISO,
  toNutritionTrend,
  nutritionTrendLabels,
} from "@/lib/weekly";
import { weeklyFromMonthly } from "@/lib/settings";
import { formatMoney, FALLBACK_RATES_TO_JPY } from "@/lib/currency";

export const runtime = "nodejs";

const MODEL = process.env.LETTER_MODEL || "claude-sonnet-5";
const ACTION = "suggest";
const DAILY_LIMIT = 3;

// 回数超過時・生成失敗時の定型フォールバック。
const OVER_LIMIT = "今日はもうたくさん相談したね！明日また聞いて🍚";
const FALLBACK = "まずは今日のごはんに、彩りの野菜を一品そえてみるのはどう？無理のない範囲でね🍚";

const SCHEMA = {
  type: "object",
  properties: {
    suggestion: {
      type: "string",
      description: "今日の提案。80字以内。どこで・何をまで具体的に",
    },
    reason: { type: "string", description: "なぜそれ？を40字以内で一言" },
  },
  required: ["suggestion", "reason"],
  additionalProperties: false,
} as const;

function timeBand(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "朝";
  if (h >= 11 && h < 16) return "昼";
  return "夜";
}

// 残り回数だけ返す（UIの初期表示用・消費しない）。
export async function GET() {
  const uid = getUserId();
  return NextResponse.json({ remaining: remainingToday(uid, ACTION, DAILY_LIMIT), limit: DAILY_LIMIT });
}

// ワンタップ提案（入力パラメータなし）。
export async function POST() {
  const uid = getUserId();

  // レート制限：上限到達なら AI を呼ばず定型を返す
  const gate = consumeToday(uid, ACTION, DAILY_LIMIT);
  if (!gate.allowed) {
    return NextResponse.json({ suggestion: OVER_LIMIT, reason: "", remaining: 0, source: "limit" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestion: FALLBACK, reason: "", remaining: gate.remaining, source: "fallback" });
  }

  try {
    // 今週の方向感＋予算ステータスをサーバー側で集計
    const records = listRecords(uid);
    const settings = getSettings(uid);
    let rateMain = FALLBACK_RATES_TO_JPY[settings.mainCurrency] ?? 1;
    try {
      const fx = await getRatesToJpy();
      rateMain = fx.rates[settings.mainCurrency] ?? rateMain;
    } catch {
      /* フォールバックレートで続行 */
    }
    const todayISO = new Date().toISOString().slice(0, 10);
    const weeklyBudget = weeklyFromMonthly(settings.monthlyBudget);
    const stats = aggregatePeriod(
      records,
      "week",
      weekStartISO(todayISO),
      weeklyBudget,
      settings.mainCurrency,
      rateMain
    );
    const trendLabels = nutritionTrendLabels(toNutritionTrend(stats));
    const ctx = buildSuggestionContext(uid);

    const prompt = `${timeBand()}の時間帯だよ。今の${
      ctx.city || "この街"
    }での「今日これ食べたら？」を、ご飯君として1つだけ提案してね。

# 今週の状況
- 栄養の方向感（数値ではなく傾向。この言葉だけで語る）: ${trendLabels}
- 今週の食費: ${formatMoney(stats.totalMain, stats.mainCurrency)} / 週予算 ${formatMoney(stats.budgetMain, stats.mainCurrency)}（${stats.budgetPct}%）※支出は数値OK
- いまの時間帯: ${timeBand()}

${SUGGESTION_RULES}

${ctx.profileBlock}

# 出力
- suggestion: 80字以内。「どこで・何を」まで具体的に。栄養の数値（g/kcal/%/mg）は書かない
- reason: 40字以内。なぜそれ？を一言（方向感や予算にやさしく触れる）`;

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: gohankunSystemPrompt(null),
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = msg.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const json = JSON.parse(raw);
    const suggestion = String(json.suggestion ?? "").trim();
    const reason = String(json.reason ?? "").trim();
    if (!suggestion) throw new Error("empty suggestion");
    if (violatesGohankunRules(suggestion) || violatesGohankunRules(reason)) {
      throw new Error("suggestion violates gohankun rules");
    }
    return NextResponse.json({ suggestion, reason, remaining: gate.remaining, source: "ai" });
  } catch (e) {
    console.error("suggest failed:", e);
    return NextResponse.json({ suggestion: FALLBACK, reason: "", remaining: gate.remaining, source: "fallback" });
  }
}
