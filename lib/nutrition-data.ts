// シンガポール・ローカルフードの栄養素マスター（収集データ 100件 / 1食あたり）。
// 読み取り専用の参照データ。画像解析の結果をこの表に突き合わせて栄養・カロリーを計算する。
// 出典CSV: gemini-code-1781533469919.csv ／ 日本語名(nameJa)は手動付与。

import type { RegionCode } from "./region";

export type FoodCategory =
  | "Dessert"
  | "Drink"
  | "Noodles"
  | "Rice"
  | "Salad"
  | "Seafood"
  | "Snack"
  | "Soup"
  | "Vegetable"
  // 外食チェーン用
  | "Burger"
  | "Sandwich"
  | "SideDish"
  | "Breakfast"
  | "Sweets"
  | "MainDish";

export interface FoodNutrition {
  /** 元データの連番ID */
  id: number;
  /** 安定キー（照合・ルーティング用） */
  slug: string;
  /** 料理名（英語） */
  name: string;
  /** 料理名（日本語・表示用） */
  nameJa: string;
  category: FoodCategory;
  /** 1食あたり */
  calories: number; // kcal
  protein: number; // g
  fat: number; // g
  carb: number; // g
  sodium: number; // mg
  /** この栄養値が属する地域（外食チェーン等）。未指定は地域非依存のローカル料理。 */
  region?: RegionCode;
  /** 外食チェーン名（あれば） */
  chain?: string;
  /** 出典（あれば） */
  source?: string;
}

export const foods: FoodNutrition[] = [
  { id: 1, slug: "hainanese-chicken-rice-steamed", name: "Hainanese Chicken Rice (Steamed)", nameJa: "海南チキンライス（蒸し鶏）", category: "Rice", calories: 666, protein: 31.2, fat: 23.4, carb: 78.2, sodium: 1250 },
  { id: 2, slug: "hainanese-chicken-rice-roasted", name: "Hainanese Chicken Rice (Roasted)", nameJa: "海南チキンライス（焼き鶏）", category: "Rice", calories: 690, protein: 32.5, fat: 26.1, carb: 77.5, sodium: 1310 },
  { id: 3, slug: "laksa", name: "Laksa", nameJa: "ラクサ", category: "Noodles", calories: 591, protein: 22.4, fat: 31.7, carb: 52.3, sodium: 1580 },
  { id: 4, slug: "bak-kut-teh-pork-rib-soup-with-rice", name: "Bak Kut Teh (Pork Rib Soup with Rice)", nameJa: "バクテー（肉骨茶・ご飯付き）", category: "Soup", calories: 490, protein: 28.5, fat: 18.2, carb: 51.0, sodium: 1820 },
  { id: 5, slug: "char-kway-teow", name: "Char Kway Teow", nameJa: "チャークウェイティオウ", category: "Noodles", calories: 745, protein: 21.8, fat: 38.4, carb: 76.1, sodium: 1420 },
  { id: 6, slug: "nasi-lemak-with-fried-chicken-egg", name: "Nasi Lemak (with Fried Chicken & Egg)", nameJa: "ナシレマ（フライドチキン＆卵）", category: "Rice", calories: 657, protein: 23.0, fat: 27.5, carb: 78.0, sodium: 1150 },
  { id: 7, slug: "kaya-toast-with-butter-2-slices", name: "Kaya Toast with Butter (2 slices)", nameJa: "カヤトースト（バター・2枚）", category: "Snack", calories: 297, protein: 5.8, fat: 12.4, carb: 39.5, sodium: 340 },
  { id: 8, slug: "soft-boiled-eggs-2-eggs", name: "Soft Boiled Eggs (2 eggs)", nameJa: "半熟卵（2個）", category: "Snack", calories: 147, protein: 12.6, fat: 9.9, carb: 1.2, sodium: 140 },
  { id: 9, slug: "mee-rebus", name: "Mee Rebus", nameJa: "ミー・レブス", category: "Noodles", calories: 559, protein: 19.5, fat: 16.2, carb: 82.4, sodium: 2130 },
  { id: 10, slug: "mee-siam", name: "Mee Siam", nameJa: "ミー・シャム", category: "Noodles", calories: 521, protein: 16.3, fat: 13.8, carb: 81.2, sodium: 2610 },
  { id: 11, slug: "hokkien-mee", name: "Hokkien Mee", nameJa: "ホッケンミー（福建炒め麺）", category: "Noodles", calories: 522, protein: 23.4, fat: 19.1, carb: 62.8, sodium: 1390 },
  { id: 12, slug: "wanton-mee-dry", name: "Wanton Mee (Dry)", nameJa: "ワンタンメン（汁なし）", category: "Noodles", calories: 411, protein: 18.9, fat: 11.3, carb: 57.1, sodium: 1480 },
  { id: 13, slug: "fish-ball-noodles-dry", name: "Fish Ball Noodles (Dry)", nameJa: "フィッシュボール麺（汁なし）", category: "Noodles", calories: 368, protein: 16.5, fat: 8.4, carb: 55.3, sodium: 1630 },
  { id: 14, slug: "roti-prata-plain-1-piece", name: "Roti Prata (Plain, 1 piece)", nameJa: "ロティ・プラタ（プレーン・1枚）", category: "Snack", calories: 209, protein: 4.5, fat: 7.8, carb: 29.3, sodium: 280 },
  { id: 15, slug: "roti-prata-with-egg-1-piece", name: "Roti Prata (with Egg, 1 piece)", nameJa: "ロティ・プラタ（卵入り・1枚）", category: "Snack", calories: 288, protein: 9.2, fat: 12.5, carb: 33.1, sodium: 390 },
  { id: 16, slug: "murtabak-chicken", name: "Murtabak (Chicken)", nameJa: "ムルタバ（チキン）", category: "Snack", calories: 578, protein: 28.4, fat: 22.1, carb: 64.2, sodium: 1120 },
  { id: 17, slug: "satay-chicken-5-sticks-with-sauce", name: "Satay (Chicken, 5 sticks with Sauce)", nameJa: "サテー（チキン・5本／ソース付き）", category: "Snack", calories: 363, protein: 20.2, fat: 17.5, carb: 25.1, sodium: 680 },
  { id: 18, slug: "gado-gado", name: "Gado Gado", nameJa: "ガドガド", category: "Salad", calories: 547, protein: 18.2, fat: 28.4, carb: 53.2, sodium: 1090 },
  { id: 19, slug: "bee-hoon-economic-fried-with-egg-luncheon-meat", name: "Bee Hoon (Economic Fried with Egg & Luncheon Meat)", nameJa: "ビーフン炒め（卵＆ランチョンミート）", category: "Noodles", calories: 560, protein: 15.2, fat: 24.8, carb: 67.5, sodium: 1210 },
  { id: 20, slug: "chwee-kueh-4-pieces-with-chye-poh", name: "Chwee Kueh (4 pieces with Chye Poh)", nameJa: "チウェイクエ（4個・チャイポー添え）", category: "Snack", calories: 344, protein: 5.1, fat: 14.2, carb: 47.8, sodium: 820 },
  { id: 21, slug: "carrot-cake-black-with-sweet-sauce", name: "Carrot Cake (Black with Sweet Sauce)", nameJa: "大根餅（ブラック・甘辛ソース）", category: "Snack", calories: 566, protein: 11.4, fat: 26.3, carb: 69.5, sodium: 1240 },
  { id: 22, slug: "carrot-cake-white", name: "Carrot Cake (White)", nameJa: "大根餅（ホワイト）", category: "Snack", calories: 493, protein: 12.8, fat: 24.1, carb: 54.2, sodium: 1110 },
  { id: 23, slug: "biryani-chicken", name: "Biryani (Chicken)", nameJa: "ビリヤニ（チキン）", category: "Rice", calories: 752, protein: 34.2, fat: 28.9, carb: 86.4, sodium: 1460 },
  { id: 24, slug: "economy-rice-cai-fan-1-meat-2-veg-with-rice", name: "Economy Rice (Cai Fan: 1 Meat, 2 Veg with Rice)", nameJa: "経済飯（おかず肉1・野菜2＋ご飯）", category: "Rice", calories: 580, protein: 22.5, fat: 18.4, carb: 79.1, sodium: 1180 },
  { id: 25, slug: "minced-pork-noodles-bak-chor-mee-dry", name: "Minced Pork Noodles (Bak Chor Mee - Dry)", nameJa: "バクチョーミー（肉そぼろ麺・汁なし）", category: "Noodles", calories: 511, protein: 24.1, fat: 19.8, carb: 57.5, sodium: 1520 },
  { id: 26, slug: "beef-rendang-with-rice", name: "Beef Rendang (with Rice)", nameJa: "ビーフルンダン（ご飯付き）", category: "Rice", calories: 685, protein: 29.4, fat: 24.5, carb: 85.1, sodium: 1290 },
  { id: 27, slug: "ayam-penyet-with-rice", name: "Ayam Penyet (with Rice)", nameJa: "アヤム・ペネッ（ご飯付き）", category: "Rice", calories: 720, protein: 35.1, fat: 29.4, carb: 76.8, sodium: 1350 },
  { id: 28, slug: "sambal-kang-kong", name: "Sambal Kang Kong", nameJa: "サンバル空芯菜炒め", category: "Vegetable", calories: 124, protein: 3.8, fat: 7.9, carb: 9.2, sodium: 740 },
  { id: 29, slug: "ice-kachang", name: "Ice Kachang", nameJa: "アイスカチャン", category: "Dessert", calories: 257, protein: 2.1, fat: 1.5, carb: 58.2, sodium: 75 },
  { id: 30, slug: "cendol", name: "Cendol", nameJa: "チェンドル", category: "Dessert", calories: 386, protein: 3.4, fat: 15.2, carb: 57.4, sodium: 165 },
  { id: 31, slug: "duck-rice-yam-rice", name: "Duck Rice (Yam Rice)", nameJa: "鴨ご飯（ヤムライス）", category: "Rice", calories: 672, protein: 28.5, fat: 21.8, carb: 82.4, sodium: 1410 },
  { id: 32, slug: "ipoh-hor-fun", name: "Ipoh Hor Fun", nameJa: "イポー・ホーファン", category: "Noodles", calories: 402, protein: 19.1, fat: 7.2, carb: 62.5, sodium: 1330 },
  { id: 33, slug: "prawn-mee-soup", name: "Prawn Mee (Soup)", nameJa: "プラウンミー（海老麺・スープ）", category: "Noodles", calories: 293, protein: 18.4, fat: 4.9, carb: 41.2, sodium: 1490 },
  { id: 34, slug: "prawn-mee-dry", name: "Prawn Mee (Dry)", nameJa: "プラウンミー（海老麺・汁なし）", category: "Noodles", calories: 465, protein: 20.1, fat: 14.8, carb: 60.2, sodium: 1380 },
  { id: 35, slug: "ban-mian-soup", name: "Ban Mian (Soup)", nameJa: "バンミー（板麺・スープ）", category: "Noodles", calories: 475, protein: 22.1, fat: 12.4, carb: 65.8, sodium: 1620 },
  { id: 36, slug: "fish-soup-bee-hoon-with-milk", name: "Fish Soup Bee Hoon (with Milk)", nameJa: "フィッシュスープビーフン（ミルク入り）", category: "Soup", calories: 540, protein: 24.8, fat: 16.5, carb: 69.2, sodium: 1510 },
  { id: 37, slug: "fish-soup-sliced-fish-clear", name: "Fish Soup (Sliced Fish - Clear)", nameJa: "フィッシュスープ（白身魚・クリア）", category: "Soup", calories: 178, protein: 21.2, fat: 2.8, carb: 15.1, sodium: 1280 },
  { id: 38, slug: "yong-tau-foo-7-pieces-with-sweet-sauce-soup", name: "Yong Tau Foo (7 pieces with Sweet Sauce & Soup)", nameJa: "ヨントーフー（7品・甘ソース＆スープ）", category: "Soup", calories: 295, protein: 18.2, fat: 11.4, carb: 28.5, sodium: 1420 },
  { id: 39, slug: "lor-mee", name: "Lor Mee", nameJa: "ローミー", category: "Noodles", calories: 383, protein: 16.8, fat: 8.9, carb: 56.4, sodium: 1690 },
  { id: 40, slug: "claypot-rice-chicken", name: "Claypot Rice (Chicken)", nameJa: "クレイポットライス（土鍋ご飯・チキン）", category: "Rice", calories: 796, protein: 35.4, fat: 24.8, carb: 103.5, sodium: 1540 },
  { id: 41, slug: "mee-goreng", name: "Mee Goreng", nameJa: "ミーゴレン", category: "Noodles", calories: 613, protein: 17.2, fat: 22.4, carb: 83.1, sodium: 1850 },
  { id: 42, slug: "nasi-goreng-with-fried-egg", name: "Nasi Goreng (with Fried Egg)", nameJa: "ナシゴレン（目玉焼き付き）", category: "Rice", calories: 631, protein: 16.8, fat: 24.1, carb: 84.5, sodium: 1620 },
  { id: 43, slug: "rojak-chinese-style", name: "Rojak (Chinese Style)", nameJa: "ロジャ（中華スタイル）", category: "Salad", calories: 443, protein: 9.5, fat: 20.1, carb: 54.8, sodium: 1110 },
  { id: 44, slug: "satay-bee-hoon", name: "Satay Bee Hoon", nameJa: "サテービーフン", category: "Noodles", calories: 698, protein: 22.5, fat: 33.4, carb: 75.1, sodium: 1280 },
  { id: 45, slug: "century-egg-pork-congee", name: "Century Egg & Pork Congee", nameJa: "ピータンと豚肉のお粥", category: "Soup", calories: 224, protein: 12.8, fat: 4.5, carb: 31.2, sodium: 980 },
  { id: 46, slug: "chee-cheong-fun-2-rolls-with-sauce", name: "Chee Cheong Fun (2 rolls with Sauce)", nameJa: "チーチョンファン（腸粉・2本・ソース付き）", category: "Snack", calories: 238, protein: 4.1, fat: 5.2, carb: 42.1, sodium: 640 },
  { id: 47, slug: "soon-kueh-3-pieces", name: "Soon Kueh (3 pieces)", nameJa: "スンクエ（3個）", category: "Snack", calories: 264, protein: 6.2, fat: 6.8, carb: 43.2, sodium: 590 },
  { id: 48, slug: "oyster-omelette-orh-luak", name: "Oyster Omelette (Orh Luak)", nameJa: "オイスターオムレツ（オーラック）", category: "Snack", calories: 645, protein: 21.4, fat: 49.2, carb: 28.1, sodium: 1290 },
  { id: 49, slug: "fried-carrot-cake-white-with-prawn", name: "Fried Carrot Cake (White with Prawn)", nameJa: "大根餅炒め（ホワイト・海老入り）", category: "Snack", calories: 540, protein: 15.2, fat: 28.4, carb: 54.1, sodium: 1220 },
  { id: 50, slug: "mutton-soup-kambing", name: "Mutton Soup (Kambing)", nameJa: "マトンスープ（カンビン）", category: "Soup", calories: 412, protein: 32.4, fat: 27.5, carb: 6.2, sodium: 1480 },
  { id: 51, slug: "tandoori-chicken-1-piece-with-naan", name: "Tandoori Chicken (1 piece with Naan)", nameJa: "タンドリーチキン（1ピース・ナン付き）", category: "Snack", calories: 440, protein: 36.5, fat: 11.2, carb: 45.8, sodium: 920 },
  { id: 52, slug: "garlic-naan-1-piece", name: "Garlic Naan (1 piece)", nameJa: "ガーリックナン（1枚）", category: "Snack", calories: 303, protein: 8.4, fat: 7.5, carb: 49.5, sodium: 420 },
  { id: 53, slug: "roti-john-chicken", name: "Roti John (Chicken)", nameJa: "ロティ・ジョン（チキン）", category: "Snack", calories: 542, protein: 26.4, fat: 23.8, carb: 54.2, sodium: 1250 },
  { id: 54, slug: "sambal-stingray-200g", name: "Sambal Stingray (200g)", nameJa: "サンバル・スティングレイ（エイのサンバル焼き・200g）", category: "Seafood", calories: 320, protein: 38.2, fat: 16.4, carb: 4.5, sodium: 980 },
  { id: 55, slug: "chilli-crab-with-2-mantou", name: "Chilli Crab (with 2 Mantou)", nameJa: "チリクラブ（マントウ2個付き）", category: "Seafood", calories: 460, protein: 28.4, fat: 14.2, carb: 52.1, sodium: 1410 },
  { id: 56, slug: "black-pepper-crab-300g", name: "Black Pepper Crab (300g)", nameJa: "ブラックペッパークラブ（300g）", category: "Seafood", calories: 340, protein: 32.1, fat: 12.4, carb: 18.2, sodium: 1180 },
  { id: 57, slug: "cereal-prawns-4-pieces", name: "Cereal Prawns (4 pieces)", nameJa: "シリアルプラウン（4尾）", category: "Seafood", calories: 413, protein: 22.4, fat: 23.5, carb: 26.4, sodium: 890 },
  { id: 58, slug: "sweet-sour-pork-with-rice", name: "Sweet & Sour Pork (with Rice)", nameJa: "酢豚（ご飯付き）", category: "Rice", calories: 735, protein: 24.2, fat: 26.8, carb: 95.4, sodium: 1240 },
  { id: 59, slug: "ma-po-tofu-with-rice", name: "Ma Po Tofu (with Rice)", nameJa: "麻婆豆腐（ご飯付き）", category: "Rice", calories: 520, protein: 18.5, fat: 16.2, carb: 73.1, sodium: 1350 },
  { id: 60, slug: "gong-bao-chicken-with-rice", name: "Gong Bao Chicken (with Rice)", nameJa: "宮保鶏丁（ご飯付き）", category: "Rice", calories: 610, protein: 29.1, fat: 18.4, carb: 78.5, sodium: 1420 },
  { id: 61, slug: "ginger-onion-fish-with-rice", name: "Ginger Onion Fish (with Rice)", nameJa: "白身魚の生姜ねぎ炒め（ご飯付き）", category: "Rice", calories: 515, protein: 25.4, fat: 11.2, carb: 74.8, sodium: 1190 },
  { id: 62, slug: "braised-pork-rice-lu-rou-fan", name: "Braised Pork Rice (Lu Rou Fan)", nameJa: "魯肉飯（ルーロウファン）", category: "Rice", calories: 620, protein: 22.1, fat: 28.4, carb: 66.2, sodium: 950 },
  { id: 63, slug: "kway-chap-set-for-1-with-rice-broth", name: "Kway Chap (Set for 1 with Rice Broth)", nameJa: "クエチャップ（1人前・ご飯＆スープ）", category: "Noodles", calories: 585, protein: 31.4, fat: 24.2, carb: 57.1, sodium: 1710 },
  { id: 64, slug: "thunder-tea-rice-lei-cha-fan", name: "Thunder Tea Rice (Lei Cha Fan)", nameJa: "雷茶飯（レイチャーファン）", category: "Rice", calories: 425, protein: 12.4, fat: 14.1, carb: 61.2, sodium: 520 },
  { id: 65, slug: "vegetarian-bee-hoon-with-mock-meat-veg", name: "Vegetarian Bee Hoon (with Mock Meat & Veg)", nameJa: "ベジタリアンビーフン（もどき肉＆野菜）", category: "Noodles", calories: 480, protein: 11.2, fat: 16.4, carb: 70.5, sodium: 1340 },
  { id: 66, slug: "soto-ayam", name: "Soto Ayam", nameJa: "ソト・アヤム", category: "Soup", calories: 312, protein: 18.4, fat: 9.2, carb: 37.5, sodium: 1560 },
  { id: 67, slug: "nasi-padang-1-beef-rendang-1-sayur-lodeh-rice", name: "Nasi Padang (1 Beef Rendang, 1 Sayur Lodeh, Rice)", nameJa: "ナシパダン（ルンダン・サユルロデ・ご飯）", category: "Rice", calories: 740, protein: 28.2, fat: 31.4, carb: 82.4, sodium: 1490 },
  { id: 68, slug: "sayur-lodeh", name: "Sayur Lodeh", nameJa: "サユルロデ", category: "Vegetable", calories: 262, protein: 4.8, fat: 21.5, carb: 14.2, sodium: 890 },
  { id: 69, slug: "tahu-goreng", name: "Tahu Goreng", nameJa: "タフゴレン（揚げ豆腐）", category: "Snack", calories: 380, protein: 14.2, fat: 20.1, carb: 34.5, sodium: 610 },
  { id: 70, slug: "maggi-goreng", name: "Maggi Goreng", nameJa: "マギーゴレン", category: "Noodles", calories: 635, protein: 14.8, fat: 26.4, carb: 82.1, sodium: 1920 },
  { id: 71, slug: "paper-dosa-plain-masala-dosa", name: "Paper Dosa (Plain Masala Dosa)", nameJa: "ペーパードーサ（マサラドーサ）", category: "Snack", calories: 345, protein: 7.2, fat: 12.4, carb: 51.2, sodium: 710 },
  { id: 72, slug: "idli-2-pieces-with-sambar", name: "Idli (2 pieces with Sambar)", nameJa: "イドリ（2個・サンバル付き）", category: "Snack", calories: 210, protein: 6.8, fat: 2.1, carb: 41.2, sodium: 620 },
  { id: 73, slug: "vada-2-pieces", name: "Vada (2 pieces)", nameJa: "ワダ（2個）", category: "Snack", calories: 270, protein: 5.4, fat: 16.2, carb: 26.4, sodium: 540 },
  { id: 74, slug: "chapati-2-pieces-with-dhal", name: "Chapati (2 pieces with Dhal)", nameJa: "チャパティ（2枚・ダル付き）", category: "Snack", calories: 310, protein: 11.2, fat: 6.4, carb: 51.8, sodium: 480 },
  { id: 75, slug: "samosa-potato-2-pieces", name: "Samosa (Potato, 2 pieces)", nameJa: "サモサ（ポテト・2個）", category: "Snack", calories: 240, protein: 3.8, fat: 11.5, carb: 30.2, sodium: 380 },
  { id: 76, slug: "spring-roll-popiah-fried-2-pieces", name: "Spring Roll (Popiah - Fried, 2 pieces)", nameJa: "揚げ春巻き（ポピア・2本）", category: "Snack", calories: 260, protein: 4.2, fat: 13.1, carb: 31.4, sodium: 460 },
  { id: 77, slug: "popiah-fresh-nonya-style-1-roll", name: "Popiah (Fresh Nonya Style, 1 roll)", nameJa: "ポピア（生・ニョニャ風・1本）", category: "Snack", calories: 188, protein: 5.4, fat: 6.8, carb: 25.2, sodium: 490 },
  { id: 78, slug: "otah-otah-2-leaves", name: "Otah Otah (2 leaves)", nameJa: "オタオタ（2枚）", category: "Snack", calories: 128, protein: 11.2, fat: 7.8, carb: 3.1, sodium: 420 },
  { id: 79, slug: "sup-tulang-mutton-bone-marrow-soup", name: "Sup Tulang (Mutton Bone Marrow Soup)", nameJa: "スップ・トゥラン（マトン骨髄スープ）", category: "Soup", calories: 510, protein: 26.4, fat: 41.2, carb: 8.5, sodium: 1550 },
  { id: 80, slug: "tau-huay-soya-beanstalk-pudding-traditional", name: "Tau Huay (Soya Beanstalk Pudding - Traditional)", nameJa: "豆花（トウファ・伝統）", category: "Dessert", calories: 182, protein: 7.2, fat: 4.1, carb: 29.1, sodium: 35 },
  { id: 81, slug: "grass-jelly-with-longan", name: "Grass Jelly (with Longan)", nameJa: "仙草ゼリー（龍眼入り）", category: "Dessert", calories: 124, protein: 0.8, fat: 0.1, carb: 30.2, sodium: 25 },
  { id: 82, slug: "mango-sago", name: "Mango Sago", nameJa: "マンゴーサゴ", category: "Dessert", calories: 288, protein: 3.2, fat: 6.5, carb: 54.1, sodium: 45 },
  { id: 83, slug: "pulut-hitam", name: "Pulut Hitam", nameJa: "プルッヒタム（黒もち米ぜんざい）", category: "Dessert", calories: 290, protein: 4.2, fat: 8.4, carb: 49.2, sodium: 110 },
  { id: 84, slug: "bubur-cha-cha", name: "Bubur Cha Cha", nameJa: "ブブルチャチャ", category: "Dessert", calories: 345, protein: 3.1, fat: 13.8, carb: 51.8, sodium: 130 },
  { id: 85, slug: "pisang-goreng-fried-banana-2-pieces", name: "Pisang Goreng (Fried Banana, 2 pieces)", nameJa: "ピサンゴレン（揚げバナナ・2個）", category: "Snack", calories: 315, protein: 2.4, fat: 14.2, carb: 44.1, sodium: 180 },
  { id: 86, slug: "kueh-lapis-1-piece", name: "Kueh Lapis (1 piece)", nameJa: "クエラピス（1切れ）", category: "Dessert", calories: 158, protein: 1.4, fat: 7.2, carb: 21.8, sodium: 65 },
  { id: 87, slug: "ondeh-ondeh-3-pieces", name: "Ondeh Ondeh (3 pieces)", nameJa: "オンデオンデ（3個）", category: "Dessert", calories: 210, protein: 2.1, fat: 6.8, carb: 35.1, sodium: 80 },
  { id: 88, slug: "muah-chee", name: "Muah Chee", nameJa: "ムアチー", category: "Dessert", calories: 320, protein: 6.5, fat: 14.1, carb: 41.8, sodium: 190 },
  { id: 89, slug: "cheng-tng-bowl", name: "Cheng Tng (Bowl)", nameJa: "チェンタン（清湯・1杯）", category: "Dessert", calories: 142, protein: 1.1, fat: 0.2, carb: 34.0, sodium: 20 },
  { id: 90, slug: "kopi-with-condensed-milk", name: "Kopi (with Condensed Milk)", nameJa: "コピ（練乳入りコーヒー）", category: "Drink", calories: 115, protein: 2.1, fat: 2.9, carb: 20.1, sodium: 55 },
  { id: 91, slug: "kopi-c-with-evaporated-milk-sugar", name: "Kopi C (with Evaporated Milk & Sugar)", nameJa: "コピC（エバミルク＆砂糖）", category: "Drink", calories: 90, protein: 1.8, fat: 1.5, carb: 17.2, sodium: 45 },
  { id: 92, slug: "kopi-o-with-sugar", name: "Kopi O (with Sugar)", nameJa: "コピO（砂糖入り・ブラック）", category: "Drink", calories: 60, protein: 0.4, fat: 0.0, carb: 14.6, sodium: 15 },
  { id: 93, slug: "kopi-o-kosong-black-coffee-no-sugar", name: "Kopi O Kosong (Black Coffee, No Sugar)", nameJa: "コピOコソン（無糖ブラック）", category: "Drink", calories: 4, protein: 0.2, fat: 0.0, carb: 0.8, sodium: 5 },
  { id: 94, slug: "teh-teh-tarik-with-condensed-milk", name: "Teh (Teh Tarik with Condensed Milk)", nameJa: "テー（テタレ・練乳入り）", category: "Drink", calories: 124, protein: 2.2, fat: 3.1, carb: 21.8, sodium: 60 },
  { id: 95, slug: "teh-c", name: "Teh C", nameJa: "テーC（エバミルク＆砂糖）", category: "Drink", calories: 98, protein: 1.9, fat: 1.6, carb: 18.9, sodium: 50 },
  { id: 96, slug: "teh-o", name: "Teh O", nameJa: "テーO（砂糖入り紅茶）", category: "Drink", calories: 65, protein: 0.3, fat: 0.0, carb: 15.8, sodium: 15 },
  { id: 97, slug: "teh-o-kosong", name: "Teh O Kosong", nameJa: "テーOコソン（無糖紅茶）", category: "Drink", calories: 2, protein: 0.1, fat: 0.0, carb: 0.4, sodium: 5 },
  { id: 98, slug: "milo-dinosaur", name: "Milo Dinosaur", nameJa: "ミロ・ダイナソー", category: "Drink", calories: 310, protein: 8.5, fat: 8.2, carb: 50.5, sodium: 160 },
  { id: 99, slug: "bandung-rose-syrup-with-milk", name: "Bandung (Rose Syrup with Milk)", nameJa: "バンドン（ローズシロップミルク）", category: "Drink", calories: 155, protein: 2.4, fat: 2.8, carb: 30.1, sodium: 70 },
  { id: 100, slug: "sugarcane-juice-with-lemon", name: "Sugarcane Juice (with Lemon)", nameJa: "サトウキビジュース（レモン入り）", category: "Drink", calories: 160, protein: 0.5, fat: 0.1, carb: 39.2, sodium: 10 },
];

/** slug -> 食品 の索引（O(1)ルックアップ用） */
export const foodsBySlug: Record<string, FoodNutrition> = Object.fromEntries(
  foods.map((f) => [f.slug, f])
);

/** id -> 食品 */
export const foodsById: Record<number, FoodNutrition> = Object.fromEntries(
  foods.map((f) => [f.id, f])
);
