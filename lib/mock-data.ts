// MVP用のモックデータ。
// 「写真を1枚アップロードするだけで、裏側でAIがこれらを生成した」という前提のダミー。
// 本番ではこの構造のデータを画像解析APIから受け取る想定。
import type { CurrencyCode } from "./currency";

export type MacroLevel = "low" | "mid" | "high";

export interface NutritionTag {
  /** バッジに出す短いラベル（例: 高タンパク） */
  label: string;
  /** ざっくり評価。色分けに使う */
  tone: "good" | "watch" | "neutral";
}

/** 栄養素マスターから計算した実数値（kcal/g/mg）。 */
export interface NutritionDetail {
  calories: number; // kcal
  protein: number; // g
  fat: number; // g
  carb: number; // g
  sodium: number; // mg
  portions: number; // 分量倍率
  /** true なら「写真からAIが直接推定した概算」（辞書ヒットではない） */
  estimated?: boolean;
}

export interface MealEntry {
  id: string;
  dishName: string; // 料理名（英語）
  dishNameJa: string; // 料理名（日本語の読み・補足）
  /** AIが生成したエモい日記風キャプション */
  caption: string;
  photo: string;
  /** 任意の思い出写真（友人・風景など）。AI解析対象外の純粋なログ。1枚のみ。 */
  memoryPhoto?: string;
  location: string;
  /** 地図表示用の座標（あれば） */
  coords?: { lat: number; lng: number };
  /** ISO日付 */
  date: string;
  timeLabel: string; // 表示用（例: 12:40 Lunch）
  spend: {
    amount: number; // 支払った金額（currency建て）
    currency: CurrencyCode; // 支払い通貨
    jpy: number; // 円換算（記録時のレートで確定・集計の基準）
  };
  macros: {
    protein: MacroLevel;
    fat: MacroLevel;
    carb: MacroLevel;
  };
  /** AIが付けた栄養の総評タグ */
  nutritionTags: NutritionTag[];
  /** 栄養素マスターから計算した実数値（あれば表示。複数品目のときは items の合算） */
  nutrition?: NutritionDetail;
  /** 品目内訳（定食＝主菜/ご飯/味噌汁/小鉢…）。1写真に複数品ある場合に各品を保持。
   *  トップレベルの nutrition / macros / nutritionTags はこの items の合算。
   *  ※ 後方互換: 既存の単品レコードは items 未設定。getMealItems() で1要素として扱える。 */
  items?: MealItem[];
  /** AIの料理判定の自信度 0.0〜1.0（あれば。低いとき注意表示） */
  confidence?: number;
  /** 栄養値の出典・地域メモ（外食チェーン等。例: マクドナルド公式(日本) を参照した推定） */
  source?: string;
  /** 「思い出にする」フラグ（指示書の is_memory 相当）。
   *  ※ memoryPhoto（思い出写真1枚）や photobook の kind:"memory"（写真の種別）とは別概念。
   *  こちらは「この食事を思い出として残し、ごはんくんが手紙を書く」ためのフラグ。 */
  isMemory?: boolean;
  /** ごはんくんが綴った思い出レター（指示書の letter_greeting/body/sign/edited をまとめて保持）。
   *  DBは meal_records.data の JSON blob なので、専用カラムでなくこのオブジェクトで永続化する。 */
  memoryLetter?: MemoryLetter;
  /** ユーザーが記録時に申告した料理名（複数可・最大8品）。公式辞書に無ければユーザー辞書へ学習する。 */
  hintNames?: string[];
}

/** 1食に含まれる1品目（定食の主菜・ご飯・味噌汁・小鉢など）。 */
export interface MealItem {
  /** 辞書slug（該当あれば）。AI推定のみの品目は未設定。 */
  slug?: string;
  dishName: string; // 品目名（英語）
  dishNameJa: string; // 品目名（日本語）
  /** この品目の栄養（分量込み。estimated=true はAI推定） */
  nutrition: NutritionDetail;
  /** 出典・地域メモ（辞書名／AI推定／チェーン地域補正など） */
  source?: string;
  /** この品目の栄養タグ（任意） */
  tags?: NutritionTag[];
  /** ユーザーが手動で名付けた品目（辞書ヒットせず）。保存時にユーザー辞書へ学習する。 */
  userNamed?: boolean;
}

/** ごはんくんの思い出レター。「思い出にする」ONで生成され、ユーザーが書き換えられる。 */
export interface MemoryLetter {
  greeting: string;
  body: string[]; // 段落配列（指示書の letter_body。JSON blob なので配列のまま格納）
  sign: string;
  edited: boolean; // ユーザーが書き換えたら true（再生成で上書き禁止＝指示書の letter_edited）
}

export const meals: MealEntry[] = [
  {
    id: "chicken-rice",
    dishName: "Hainanese Chicken Rice",
    dishNameJa: "海南チキンライス",
    caption:
      "キャンパス近くのホーカーで遅めのランチ。生姜とパンダンの香るご飯に、しっとり蒸し鶏。チリソースをひと匙足したら、午後の蒸し暑さも味方になった気がした。",
    photo:
      "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=80",
    location: "Maxwell Food Centre · Tanjong Pagar",
    coords: { lat: 1.2807, lng: 103.8443 },
    date: "2026-06-14",
    timeLabel: "12:40 · Lunch",
    spend: { amount: 5.5, currency: "SGD", jpy: 638 },
    macros: { protein: "high", fat: "mid", carb: "high" },
    nutritionTags: [
      { label: "高タンパク", tone: "good" },
      { label: "炭水化物 多め", tone: "watch" },
    ],
    nutrition: { calories: 666, protein: 31.2, fat: 23.4, carb: 78.2, sodium: 1250, portions: 1 },
  },
  {
    id: "laksa",
    dishName: "Katong Laksa",
    dishNameJa: "カトン・ラクサ",
    caption:
      "夕立のあと、湯気の立つラクサで一息。ココナッツの甘さとサンバルの辛さがせめぎ合って、スプーンが止まらない。雨上がりの匂いまでご馳走だった。",
    photo:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    location: "328 Katong Laksa · East Coast",
    coords: { lat: 1.3069, lng: 103.9039 },
    date: "2026-06-13",
    timeLabel: "18:20 · Dinner",
    spend: { amount: 6.8, currency: "SGD", jpy: 789 },
    macros: { protein: "mid", fat: "high", carb: "high" },
    nutritionTags: [
      { label: "脂質 多め", tone: "watch" },
      { label: "満足度 高", tone: "neutral" },
    ],
    nutrition: { calories: 591, protein: 22.4, fat: 31.7, carb: 52.3, sodium: 1580, portions: 1 },
  },
  {
    id: "kaya-toast",
    dishName: "Kaya Toast Set",
    dishNameJa: "カヤトースト・セット",
    caption:
      "朝いちのコピティアム。香ばしいトーストにとろりとカヤジャム、半熟卵に醤油をひと垂らし。コピ・オーの苦さで、ようやく目が覚めた。",
    photo:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    location: "Ya Kun Kaya Toast · Far East Square",
    coords: { lat: 1.2849, lng: 103.8480 },
    date: "2026-06-13",
    timeLabel: "08:10 · Breakfast",
    spend: { amount: 4.2, currency: "SGD", jpy: 487 },
    macros: { protein: "mid", fat: "mid", carb: "high" },
    nutritionTags: [
      { label: "朝食向き", tone: "neutral" },
      { label: "糖質 多め", tone: "watch" },
    ],
    nutrition: { calories: 447, protein: 12.5, fat: 19, carb: 55, sodium: 680, portions: 1 },
  },
  {
    id: "poke-bowl",
    dishName: "Salmon Poke Bowl",
    dishNameJa: "サーモン・ポキボウル",
    caption:
      "ジムの帰りに玄米のポキボウル。アボカドとサーモン、枝豆の彩りがきれい。体に効いてる、と素直に思える一皿。",
    photo:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    location: "The Daily Cut · Tanjong Pagar",
    coords: { lat: 1.2766, lng: 103.8456 },
    date: "2026-06-12",
    timeLabel: "13:05 · Lunch",
    spend: { amount: 13.9, currency: "SGD", jpy: 1612 },
    macros: { protein: "high", fat: "mid", carb: "mid" },
    nutritionTags: [
      { label: "高タンパク", tone: "good" },
      { label: "野菜たっぷり", tone: "good" },
    ],
    nutrition: { calories: 480, protein: 30, fat: 18, carb: 45, sodium: 700, portions: 1 },
  },
  {
    id: "chili-crab",
    dishName: "Chili Crab",
    dishNameJa: "チリクラブ",
    caption:
      "週末のご褒美。マントウを甘辛いソースにくぐらせて頬張る、この瞬間のためにシンガポールに来たのかもしれない。手も心もべたべたの幸せ。",
    photo:
      "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=900&q=80",
    location: "Jumbo Seafood · Riverside Point",
    coords: { lat: 1.2895, lng: 103.8348 },
    date: "2026-06-11",
    timeLabel: "19:40 · Dinner",
    spend: { amount: 28.0, currency: "SGD", jpy: 3248 },
    macros: { protein: "high", fat: "high", carb: "mid" },
    nutritionTags: [
      { label: "高タンパク", tone: "good" },
      { label: "贅沢メモリー", tone: "neutral" },
    ],
    nutrition: { calories: 700, protein: 45, fat: 40, carb: 30, sodium: 1800, portions: 1 },
  },
  {
    id: "roti-prata",
    dishName: "Roti Prata",
    dishNameJa: "ロティ・プラタ",
    caption:
      "夜更けの腹ごしらえ。焼きたてのプラタはサクッ、ふわっ。カレーに浸して、留学仲間と他愛もない話。こういう夜が、留学の記憶になる。",
    photo:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    location: "The Roti Prata House · Upper Thomson",
    coords: { lat: 1.3543, lng: 103.8320 },
    date: "2026-06-10",
    timeLabel: "22:15 · Late",
    spend: { amount: 3.6, currency: "SGD", jpy: 418 },
    macros: { protein: "low", fat: "high", carb: "high" },
    nutritionTags: [
      { label: "夜遅め", tone: "watch" },
      { label: "炭水化物 多め", tone: "watch" },
    ],
    nutrition: { calories: 418, protein: 9, fat: 15.6, carb: 58.6, sodium: 560, portions: 1 },
  },
];

export function getMeal(id: string): MealEntry | undefined {
  return meals.find((m) => m.id === id);
}

// 今週のサマリー（ダッシュボード用のモック集計）
export const weeklySummary = {
  weekLabel: "6月8日 – 6月14日",
  totalJpy: meals.reduce((s, m) => s + m.spend.jpy, 0),
  mealsCount: meals.length,
  // 栄養バランスのざっくり指数（0-100）
  balance: {
    protein: 78,
    fat: 64,
    carb: 82,
  },
  // AIからのパーソナルレター
  letter: {
    greeting: "今週もおつかれさま。",
    body: [
      "今週は6食を記録、食費は $62.0（約 ¥7,192）。予算 $80 にきちんと収まっていて、とてもいいペースです。",
      "タンパク質はしっかり摂れていました（ポキボウルとチキンライスが効いていますね）。一方で、炭水化物がやや多めの一週間。ラクサやプラタの夜が続いたのが理由かも。",
      "週末は、野菜の多い一皿や、軽めの蒸し料理を一度はさんでみませんか。チリクラブのような“ご褒美メモリー”は、ちゃんと残してOK。我慢ではなく、彩りを足す感覚で。",
    ],
    sign: "— あなたの彩金譚より",
  },
};
