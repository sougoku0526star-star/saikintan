// サーバー側のユーザー辞書リポジトリ。
// いまは Node 24 組み込みの SQLite（node:sqlite）を使用。
// この層の関数シグネチャを保てば、後で Postgres / Prisma 等へ差し替え可能。
// ※ サーバー専用。クライアントから import しないこと。

import { getDb as db } from "./sqlite";

export interface ServerUserFood {
  slug: string;
  name: string;
  nameJa: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  addedAt: number;
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `user-${s || "dish"}`;
}

interface Row {
  slug: string;
  name: string;
  name_ja: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
  added_at: number;
}

function toFood(r: Row): ServerUserFood {
  return {
    slug: r.slug,
    name: r.name,
    nameJa: r.name_ja,
    category: r.category,
    calories: r.calories,
    protein: r.protein,
    fat: r.fat,
    carb: r.carb,
    sodium: r.sodium,
    addedAt: r.added_at,
  };
}

export function listFoods(userId: string): ServerUserFood[] {
  const rows = db()
    .prepare(
      `SELECT slug,name,name_ja,category,calories,protein,fat,carb,sodium,added_at
       FROM user_foods WHERE user_id = ? ORDER BY added_at DESC`
    )
    .all(userId) as unknown as Row[];
  return rows.map(toFood);
}

export interface UpsertInput {
  slug?: string;
  name: string;
  nameJa: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  sodium: number;
}

export function upsertFood(userId: string, input: UpsertInput): ServerUserFood {
  const slug = input.slug || slugify(input.name || input.nameJa);
  const addedAt = Date.now();
  db()
    .prepare(
      `INSERT INTO user_foods
         (user_id,slug,name,name_ja,category,calories,protein,fat,carb,sodium,added_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id,slug) DO UPDATE SET
         name=excluded.name, name_ja=excluded.name_ja, category=excluded.category,
         calories=excluded.calories, protein=excluded.protein, fat=excluded.fat,
         carb=excluded.carb, sodium=excluded.sodium`
    )
    .run(
      userId,
      slug,
      input.name,
      input.nameJa,
      input.category,
      input.calories,
      input.protein,
      input.fat,
      input.carb,
      input.sodium,
      addedAt
    );
  return {
    slug,
    name: input.name,
    nameJa: input.nameJa,
    category: input.category,
    calories: input.calories,
    protein: input.protein,
    fat: input.fat,
    carb: input.carb,
    sodium: input.sodium,
    addedAt,
  };
}

export function deleteFood(userId: string, slug: string): void {
  db().prepare(`DELETE FROM user_foods WHERE user_id = ? AND slug = ?`).run(userId, slug);
}
