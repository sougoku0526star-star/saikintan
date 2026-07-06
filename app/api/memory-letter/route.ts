import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserId, getAuthUser } from "@/lib/server/user";
import { getRecord, upsertRecord } from "@/lib/server/records-db";
import {
  gohankunSystemPrompt,
  gohankunYou,
  violatesGohankunRules,
} from "@/lib/server/gohankun-persona";
import type { MemoryLetter } from "@/lib/mock-data";

export const runtime = "nodejs";

// レター・コメント生成用モデル（P0-3）。既定はコスト最適化のためSonnet。
const MODEL = process.env.LETTER_MODEL || "claude-sonnet-5";

const SCHEMA = {
  type: "object",
  properties: {
    greeting: { type: "string", description: "ごはんくんからの一文の挨拶" },
    body: {
      type: "array",
      items: { type: "string" },
      description: "思い出の手紙の本文（1〜2段落）",
    },
    sign: { type: "string", description: "署名（必ず「— ごはんくんより」）" },
  },
  required: ["greeting", "body", "sign"],
  additionalProperties: false,
} as const;

// ISO日付（2026-07-06）→「7月6日」
function jaDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return m && d ? `${m}月${d}日` : iso;
}

// AI失敗時／キー無し時の定型レター（純粋に思い出に寄り添う1段落）。
function fallbackMemoryLetter(you: string): MemoryLetter {
  return {
    greeting: `${you}、この日のごはんのこと、僕もちゃんと覚えてるよ。`,
    body: [
      "こうして思い出に残してくれて、僕もうれしいなー。よかったら、この日どんな気持ちだったか、君の言葉で書き足してね！ふたりの交換日記みたいに、少しずつ増やしていこうね。",
    ],
    sign: "— ごはんくんより",
    edited: false,
  };
}

export async function POST(req: Request) {
  const uid = getUserId();
  let body: { recordId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  const rec = getRecord(uid, body.recordId);
  if (!rec) {
    return NextResponse.json({ error: "record not found" }, { status: 404 });
  }

  const me = getAuthUser();
  const you = gohankunYou(me?.nickname ?? me?.username ?? null);

  // ユーザーが書き換え済みのレターは、再生成で絶対に上書きしない（APIレベルのガード）
  if (rec.meal.memoryLetter?.edited) {
    return NextResponse.json({
      letter: rec.meal.memoryLetter,
      source: "existing",
    });
  }

  const save = (letter: MemoryLetter, source: string) => {
    rec.meal.isMemory = true;
    rec.meal.memoryLetter = letter;
    upsertRecord(uid, rec);
    return NextResponse.json({ letter, source });
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return save(fallbackMemoryLetter(you), "fallback");
  }

  try {
    const client = new Anthropic();
    const m = rec.meal;
    // record に実在する事実だけを渡す。友達・同席者の情報は持たないので触れさせない。
    const facts = [
      `料理: ${m.dishNameJa}${m.dishName ? `（${m.dishName}）` : ""}`,
      `場所: ${m.location || "（記録なし）"}`,
      `日付: ${jaDate(m.date)}`,
      m.timeLabel ? `時間帯: ${m.timeLabel}` : "",
      m.memoryPhoto ? "この日は思い出の写真も残している" : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `${you}が「思い出」として残した、ある一食の記録だよ。
これをもとに、ごはんくんから${you}へ、その日の食事にそっと寄り添う短い手紙を日本語で書いてください。

# ルール
- 下の「記録された事実」に書かれていないことは創作しない。特に、同席者（友達・恋人・家族）の記載は無いので、誰かと一緒だったとは書かない
- 栄養や支出（お金・予算・カロリー・数値）の話はしない。これは純粋に“思い出”の手紙。その日の情景・気持ち・${you}へのねぎらいだけを綴る
- 責めない。あたたかく、少し詩的に。海外でがんばる${you}にそっと寄り添う
- body は1〜2段落、各60〜100字程度。重すぎない、やさしい手紙に。署名は必ず「— ごはんくんより」

# 記録された事実
${facts}`;

    const msg = await client.messages.create({
      model: MODEL,
      // Sonnet 5の新トークナイザーは日本語で約+30%。切れ防止に 500→800
      max_tokens: 800,
      system: gohankunSystemPrompt(me?.nickname ?? me?.username ?? null),
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = msg.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const json = JSON.parse(raw);
    const letter: MemoryLetter = {
      greeting: String(json.greeting ?? ""),
      body: Array.isArray(json.body) ? json.body.map(String) : [],
      sign: String(json.sign ?? "— ごはんくんより"),
      edited: false,
    };
    if (!letter.greeting || letter.body.length === 0) throw new Error("empty letter");
    // 出力側の機械チェック：禁止ワード/栄養の生数値が混じったら fallback に落とす
    if ([letter.greeting, ...letter.body, letter.sign].some(violatesGohankunRules)) {
      throw new Error("memory letter violates gohankun rules");
    }
    return save(letter, "ai");
  } catch (e) {
    console.error("memory-letter failed:", e);
    return save(fallbackMemoryLetter(you), "fallback");
  }
}
