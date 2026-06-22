import BottomNav from "./BottomNav";
import UploadFlow from "./UploadFlow";

// デスクトップで見たときも「スマホアプリ」に見えるよう、中央に1枚のフレームを置く。
// モバイルでは画面いっぱいに広がる。
export default function PhoneFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-[#ebe3d6] sm:py-8">
      <div className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-paper paper-grain shadow-[0_30px_80px_-30px_rgba(61,49,42,0.45)] sm:h-[860px] sm:rounded-[2.8rem] sm:ring-1 sm:ring-ink/5">
        {/* スクロール領域。下のナビ分の余白を確保 */}
        <main className="no-scrollbar flex-1 overflow-y-auto pb-28">
          {children}
        </main>
        <BottomNav />
        <UploadFlow />
      </div>
    </div>
  );
}
