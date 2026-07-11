import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  fallbackLetter,
  pickNotice,
  toNutritionTrend,
  nutritionTrendLabels,
  aggregatePeriod,
  evaluatePromise,
  shiftWeek,
  ACTION_KINDS,
  type ActionKind,
  type PeriodStats,
  type PromiseOutcome,
  type WeeklyAction,
  type WeeklyLetter,
} from "@/lib/weekly";
import { getAuthUser, getUserId } from "@/lib/server/user";
import { saveWeeklyAction, getWeeklyAction } from "@/lib/server/letters-db";
import { listRecords } from "@/lib/server/records-db";
import {
  SUGGESTION_RULES,
  buildSuggestionContext,
} from "@/lib/server/suggestion-context";
import {
  gohankunSystemPrompt,
  gohankunYou,
  violatesGohankunRules,
} from "@/lib/server/gohankun-persona";
import { formatMoney, FALLBACK_RATES_TO_JPY } from "@/lib/currency";

// 先週の約束（提案）に対する達成度を、集計比較で機械判定する（AIは判定しない）。
// unknown（判定不能）は null にして、レターで触れさせない。
async function lastWeekPromise(
  uid: string,
  stats: PeriodStats
): Promise<{ text: string; outcome: Exclude<PromiseOutcome, "unknown"> } | null> {
  if (stats.kind !== "week") return null;
  const prevWeekStart = shiftWeek(stats.start, -1);
  const prev = await getWeeklyAction(uid, prevWeekStart);
  if (!prev) return null;
  // 今週(stats)と同じ換算レートで先週を集計する
  const rateMain =
    stats.totalMain > 0
      ? stats.totalJpy / stats.totalMain
      : FALLBACK_RATES_TO_JPY[stats.mainCurrency] ?? 1;
  const prevStats = aggregatePeriod(
    await listRecords(uid),
    "week",
    prevWeekStart,
    stats.budgetMain,
    stats.mainCurrency,
    rateMain
  );
  const outcome = evaluatePromise(prev.kind, prevStats, stats);
  if (outcome === "unknown") return null;
  return { text: prev.text, outcome };
}

const OUTCOME_GUIDANCE: Record<Exclude<PromiseOutcome, "unknown">, string> = {
  kept: "kept（達成）→ 冒頭で具体的に、心から喜ぶ。「ちゃんと見てたよ！」の温度で。",
  partial: "partial（あと一歩）→ 前向きに認めてねぎらう。できた部分をちゃんと拾う。",
  not_yet: "not_yet（まだ）→ 絶対に責めない。「またいつでもいいよ！」と軽く受け流す。",
};

export const runtime = "nodejs";

// レター・コメント生成用モデル。広告+Exitモデルの原価設計に合わせ既定はSonnet。
const MODEL = process.env.LETTER_MODEL || "claude-sonnet-5";

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
    action: {
      type: "object",
      description: "この手紙でした提案を機械可読に。翌週「先週の約束」として提示する",
      properties: {
        text: { type: "string", description: "提案を簡潔に1つ（例: 次の食事に青菜を1品）" },
        kind: { type: "string", enum: [...ACTION_KINDS], description: "提案の分類" },
      },
      required: ["text", "kind"],
      additionalProperties: false,
    },
  },
  required: ["greeting", "body", "sign", "action"],
  additionalProperties: false,
} as const;

function parseAction(raw: unknown): WeeklyAction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { text?: unknown; kind?: unknown };
  if (typeof o.text !== "string" || !o.text.trim()) return null;
  const kind = ACTION_KINDS.includes(o.kind as ActionKind) ? (o.kind as ActionKind) : "other";
  return { text: o.text.trim(), kind };
}

export async function POST(req: Request) {
  let stats: PeriodStats;
  try {
    stats = (await req.json()) as PeriodStats;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const uid = await getUserId();
  // 週の提案を保存（約束ループP1）。週かつ記録ありのときだけ。
  const persistWeek = async (letter: WeeklyLetter) => {
    if (stats.kind === "week" && stats.mealsCount > 0 && letter.action) {
      try {
        await saveWeeklyAction(uid, stats.start, letter.action);
      } catch (e) {
        console.error("saveWeeklyAction failed:", e);
      }
    }
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || stats.mealsCount === 0) {
    const letter = fallbackLetter(stats);
    await persistWeek(letter);
    return NextResponse.json({ letter, source: "fallback" });
  }

  try {
    const client = new Anthropic();
    const me = await getAuthUser();
    const userName = me?.nickname ?? me?.username ?? null;
    const you = gohankunYou(userName);
    const term = stats.kind === "week" ? "今週" : "今月";
    const trendLabels = nutritionTrendLabels(toNutritionTrend(stats));
    const suggestionCtx = await buildSuggestionContext(uid);
    const promise = await lastWeekPromise(uid, stats);
    const promiseBlock = promise
      ? `

# 先週の約束（この結果に必ず自然に触れること）
先週の提案: 「${promise.text}」
結果: ${OUTCOME_GUIDANCE[promise.outcome]}`
      : "";
    const prompt = `${you}の${term}の食事記録の集計だよ。これをもとに、ごはんくんから
${you}へ、あたたかく前向きな短い手紙を日本語で書いてください。

# ルール
- 支出（食費・予算・%）は具体的な数値に自然に触れてよい（支出は精密）
- 栄養について数値（g・kcal・%・mg）は絶対に使わない。方向感の言葉（「少なめ」「いい感じ」「多め」）だけで語る
- 責めない。サボり気味・栄養が偏っていても、怒らず「寂しがる・心配する」寄り添いトーンで、軽い提案を1つだけ
- その提案は本文（body）の中で「どこで・何を」まで具体的に述べる（下の「提案のルール」に従う）。action はそれを簡潔に言い直したもの
- 海外でがんばる${you}に寄り添うあたたかい一言を必ず添える
- body は2〜3段落、各60〜120字程度。署名は必ず「— ごはんくんより」
- 最後に action として、この手紙でした提案を1つだけ簡潔に書き出し、kind で分類する
  （veg_up=野菜 / protein_up=たんぱく質 / self_cook=自炊 / eating_out_down=外食を減らす / budget_pace=予算ペース / other=その他）

${SUGGESTION_RULES}${promiseBlock}

${suggestionCtx.profileBlock}

# ${term}の集計
- 期間: ${stats.label}
- 記録数: ${stats.mealsCount}食
- 食費: ${formatMoney(stats.totalMain, stats.mainCurrency)}${stats.mainCurrency === "JPY" ? "" : `（約¥${stats.totalJpy}）`} / 予算 ${formatMoney(stats.budgetMain, stats.mainCurrency)}（${stats.budgetPct}%）
- 栄養の方向感（数値ではなく傾向。この言葉だけで語ること）: ${trendLabels}
- 食べたもの: ${stats.dishes.slice(0, 12).join("、")}`;

    const msg = await client.messages.create({
      model: MODEL,
      // Sonnet 5の新トークナイザーは日本語で約+30%。action＋約束で長めなので 1000→1300
      max_tokens: 1300,
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
      // AIが分類した提案。欠落/不正なら方向感から機械的に導く
      action: parseAction(json.action) ?? pickNotice(stats).action,
    };
    if (!letter.greeting || letter.body.length === 0) throw new Error("empty letter");
    // 出力側の機械チェック：禁止ワード/栄養の生数値が混じったら fallback に落とす
    if (
      [letter.greeting, ...letter.body, letter.sign].some(violatesGohankunRules)
    ) {
      throw new Error("letter violates gohankun rules");
    }
    await persistWeek(letter);
    return NextResponse.json({ letter, source: "ai" });
  } catch (e) {
    console.error("weekly-letter failed:", e);
    const letter = fallbackLetter(stats);
    await persistWeek(letter);
    return NextResponse.json({ letter, source: "fallback" });
  }
}
