import DynamicJournal from "@/components/DynamicJournal";

// すべての記録（デモ含む）はクライアントストアで解決し、編集・削除に対応する。
export default function JournalPage({ params }: { params: { id: string } }) {
  return <DynamicJournal id={params.id} />;
}
