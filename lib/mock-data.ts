// MVP用のモックデータ。
// 「写真を1枚アップロードするだけで、裏側でAIがこれらを生成した」という前提のダミー。
// 本番ではこの構造のデータを画像解析APIから受け取る想定。

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
  location: string;
  /** 地図表示用の座標（あれば） */
  coords?: { lat: number; lng: number };
  /** ISO日付 */
  date: string;
  timeLabel: string; // 表示用（例: 12:40 Lunch）
  spend: {
    sgd: number;
    jpy: number;
    rate: number; // 1 SGD = ? JPY
  };
  macros: {
    protein: MacroLevel;
    fat: MacroLevel;
    carb: MacroLevel;
  };
  /** AIが付けた栄養の総評タグ */
  nutritionTags: NutritionTag[];
  /** 栄養素マスターから計算した実数値（あれば表示） */
  nutrition?: NutritionDetail;
  /** AIの料理判定の自信度 0.0〜1.0（あれば。低いとき注意表示） */
  confidence?: number;
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
    spend: { sgd: 5.5, jpy: 638, rate: 116 },
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
    spend: { sgd: 6.8, jpy: 789, rate: 116 },
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
    spend: { sgd: 4.2, jpy: 487, rate: 116 },
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
    spend: { sgd: 13.9, jpy: 1612, rate: 116 },
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
    spend: { sgd: 28.0, jpy: 3248, rate: 116 },
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
    spend: { sgd: 3.6, jpy: 418, rate: 116 },
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
  totalSgd: meals.reduce((s, m) => s + m.spend.sgd, 0),
  totalJpy: meals.reduce((s, m) => s + m.spend.jpy, 0),
  budgetSgd: 80,
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
