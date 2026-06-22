"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchRecords,
  updateRecord,
  deleteRecord,
  type CreatedEntry,
} from "@/lib/created-store";
import type { MealEntry } from "@/lib/mock-data";
import JournalContent from "./JournalContent";
import GohankunWidget from "./GohankunWidget";

// サーバー(DB)から記録を解決して描画。編集・削除に対応。id はレコード固有ID。
export default function DynamicJournal({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<CreatedEntry | null | undefined>(undefined);

  useEffect(() => {
    fetchRecords().then((list) => {
      setRecord(list.find((r) => r.id === id) ?? null);
    });
  }, [id]);

  if (record === undefined) {
    return <div className="px-5 pt-24 text-center text-[13px] text-ink/40">読み込み中…</div>;
  }

  if (record === null) {
    return (
      <div className="px-5 pt-24 text-center">
        <div className="mb-4 flex justify-center">
          <GohankunWidget state="sad" size="lg" bubble={false} />
        </div>
        <p className="font-serif text-lg text-ink/70">この記録は見つかりませんでした</p>
        <p className="mt-2 text-[12px] text-ink/45">削除された可能性があります。</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-clay px-5 py-2.5 text-[13px] text-cream"
        >
          アルバムへ戻る
        </Link>
      </div>
    );
  }

  const handleChange = (updatedMeal: MealEntry) => {
    const updated = { ...record, meal: updatedMeal };
    setRecord(updated);
    updateRecord(updated);
  };

  const handleDelete = () => {
    deleteRecord(record.id);
    router.push("/");
  };

  return (
    <JournalContent
      meal={record.meal}
      onChange={handleChange}
      onDelete={handleDelete}
      recordId={record.id}
    />
  );
}
