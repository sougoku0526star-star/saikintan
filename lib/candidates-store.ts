// 「辞書化候補」ストア。
// vision_estimate（辞書に無くAIが推定した料理）を記録し、
// 次にデータベースへ追加すべき料理を一覧できるようにする。
// MVPなので sessionStorage を利用（本番ではAPI/DBへ）。

import type { MealEntry } from "./mock-data";

export interface CandidateEntry {
  id: string; // meal.id（est-スラッグ）
  name: string; // 英語名
  nameJa: string; // 日本語名
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  photo: string;
  count: number; // 何回アップロードされたか（=収集の優先度）
  confidence: number; // 直近のAI自信度
  lastSeen: number;
}

const KEY = "saikintan:candidates";
export const CANDIDATES_UPDATED = "saikintan:candidates-updated";

export function getCandidates(): CandidateEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** 候補を削除（辞書へ昇格したときなどに使う）。 */
export function removeCandidate(id: string): void {
  if (typeof window === "undefined") return;
  const list = getCandidates().filter((c) => c.id !== id);
  sessionStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CANDIDATES_UPDATED));
}

/** vision_estimate の食事を候補として記録（同じ料理は件数を加算）。 */
export function recordCandidate(meal: MealEntry, confidence = 0): void {
  if (typeof window === "undefined" || !meal.nutrition) return;
  const list = getCandidates();
  const existing = list.find((c) => c.id === meal.id);
  if (existing) {
    existing.count += 1;
    existing.confidence = confidence;
    existing.lastSeen = Date.now();
    existing.photo = meal.photo || existing.photo;
  } else {
    list.push({
      id: meal.id,
      name: meal.dishName,
      nameJa: meal.dishNameJa,
      calories: meal.nutrition.calories,
      protein: meal.nutrition.protein,
      fat: meal.nutrition.fat,
      carb: meal.nutrition.carb,
      sodium: meal.nutrition.sodium,
      photo: meal.photo,
      count: 1,
      confidence,
      lastSeen: Date.now(),
    });
  }
  // 件数の多い順 → 同数なら新しい順
  list.sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
  sessionStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CANDIDATES_UPDATED));
}
