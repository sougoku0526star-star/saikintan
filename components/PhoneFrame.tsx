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
    <div className="flex min-h-screen w-full justify-center bg-[#ece6db] sm:py-8">
      <div className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-paper paper-grain shadow-[0_30px_80px_-30px_rgba(43,39,34,0.5)] sm:h-[860px] sm:rounded-[2.4rem] sm:ring-1 sm:ring-black/5">
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
