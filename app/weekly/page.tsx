import WeeklyDashboard from "@/components/WeeklyDashboard";
import CandidatesSection from "@/components/CandidatesSection";
import UserDictionarySection from "@/components/UserDictionarySection";

export default function WeeklyPage() {
  return (
    <div className="px-5 pt-14">
      {/* 実記録から集計するダッシュボード＋AIの手紙 */}
      <WeeklyDashboard />

      {/* 辞書へ昇格済みの料理 */}
      <UserDictionarySection />

      {/* 辞書化候補（AI推定でデータに無かった料理） */}
      <CandidatesSection />

      <div className="h-6" />
    </div>
  );
}
