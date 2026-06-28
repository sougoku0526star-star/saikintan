"use client";

import { useEffect, useState } from "react";

// イメージキャラクター「ごはんくん」。状態に応じて画像とセリフが切り替わる。
// 画像は public/gohankun/gohankun-<state>.png を参照。未配置でも
// インラインSVGのフォールバックで表示が崩れないようにしている。

export type GohankunState =
  // アプリ状態に対応するセマンティックな状態（推奨）
  | "welcome" // ホーム（歌う：ピョコピョコ跳ねる）
  | "loading" // AI解析中（寝る：呼吸のように点滅）
  | "warning" // サボり気味・エラー（しょんぼり：ブルブル震える）
  // 表情ベースの状態
  | "happy"
  | "thinking"
  | "proud"
  | "eating"
  | "explaining"
  | "sing"
  | "sleep"
  | "sad";

// 状態ごとの画像パスと、タップで巡回するセリフ候補（先頭が既定）
const PRESET: Record<GohankunState, { img: string; lines: string[] }> = {
  welcome: {
    img: "/gohankun/gohankun-sing.png",
    lines: [
      "今日のごはんはなーに？思い出に残そう！",
      "ラ〜ラ〜♪ いい一日にしよ！",
      "写真を1枚、ぼくに見せて！",
    ],
  },
  loading: {
    img: "/gohankun/gohankun-sleep.png",
    lines: [
      "くんくん…料理の匂いを嗅いで思い出を整理してるよ…",
      "むにゃ…もうちょっとで分かりそう…",
      "Zzz…おいしそうな夢を見てる…",
    ],
  },
  warning: {
    img: "/gohankun/gohankun-sad.png",
    lines: [
      "最近ごはんの写真がなくて寂しいな…元気にしてる？",
      "また一緒に記録、はじめよ？",
      "きみのごはん、見せてほしいな…",
    ],
  },
  happy: {
    img: "/gohankun/gohankun-happy.png",
    lines: ["今日も美味しそうだね！", "なに食べたの？教えて！", "記録、えらい！", "おなかすいてきた…"],
  },
  thinking: {
    img: "/gohankun/gohankun-thinking.png",
    lines: ["今、料理をじっと見つめてるよ…", "うーん、これは何かな…", "もうちょっとで分かりそう！"],
  },
  proud: {
    img: "/gohankun/gohankun-proud.png",
    lines: ["今週もよくがんばったね！来週も楽しもう！", "いい調子だよ！", "きみの食、いい感じ！"],
  },
  eating: {
    img: "/gohankun/gohankun-eating.png",
    lines: ["いただきます！", "もぐもぐ…", "やっぱりごはんは最高だね！"],
  },
  explaining: {
    img: "/gohankun/gohankun-explaining.png",
    lines: ["ふむふむ、振り返ってみよう。", "今週の食を見てみたよ。", "メモしておいたよ！"],
  },
  sing: {
    img: "/gohankun/gohankun-sing.png",
    lines: ["ラ〜ラ〜♪ 今日もいい日！", "鼻歌ごきげん〜♪", "さあ、はじめよう！"],
  },
  sleep: {
    img: "/gohankun/gohankun-sleep.png",
    lines: ["すぅ…すぅ…（解析中）", "むにゃ…もう少し待っててね", "Zzz…"],
  },
  sad: {
    img: "/gohankun/gohankun-sad.png",
    lines: ["あれ、ここはまだ空っぽみたい…", "しょんぼり…", "また一緒にがんばろ？"],
  },
};

// 状態に応じた「待機アニメーション」（Duolingo風に静止画を動かす）
const IDLE: Partial<Record<GohankunState, string>> = {
  welcome: "animate-bounce", // ピョコピョコ跳ねる
  loading: "animate-pulse [animation-duration:2.4s]", // 呼吸のように点滅
  warning: "animate-shake", // 寂しそうに震える
  // 表情ベース状態の待機
  sing: "animate-sway",
  sleep: "animate-pulse [animation-duration:2.4s]",
  sad: "animate-shake",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export default function GohankunWidget({
  state = "happy",
  message,
  size = "md",
  bubble = true,
  bubblePosition = "right",
  className = "",
}: {
  state?: GohankunState;
  /** セリフを固定したいとき（省略時は状態の既定セリフ＋タップで巡回） */
  message?: string;
  size?: "sm" | "md" | "lg";
  bubble?: boolean;
  bubblePosition?: "right" | "left" | "top";
  className?: string;
}) {
  const preset = PRESET[state];
  const [idx, setIdx] = useState(0);
  // 画像の有無を事前読み込みで判定（SSRのonError取りこぼしを回避）。
  // 確認できるまで・無い場合はSVGフォールバックを表示。
  const [imgOk, setImgOk] = useState(false);

  // 状態が変わったらセリフをリセットし、画像を再判定
  useEffect(() => {
    setIdx(0);
    setImgOk(false);
    const im = new window.Image();
    im.onload = () => setImgOk(true);
    im.onerror = () => setImgOk(false);
    im.src = preset.img;
    return () => {
      im.onload = null;
      im.onerror = null;
    };
  }, [state, preset.img]);

  const text = message ?? preset.lines[idx];

  // タップ：セリフを巡回（押した感触は active:scale-95 で表現）
  const onTap = () => {
    if (!message) setIdx((i) => (i + 1) % preset.lines.length);
  };

  const character = (
    <button
      type="button"
      onClick={onTap}
      aria-label="ごはんくん"
      className={`${SIZE[size]} shrink-0 origin-bottom select-none transition-transform duration-100 hover:scale-105 active:scale-95 ${
        IDLE[state] ?? "animate-pop"
      }`}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preset.img}
          alt="ごはんくん"
          className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(43,39,34,0.15)]"
        />
      ) : (
        <GohankunFace state={state} />
      )}
    </button>
  );

  if (!bubble) {
    return <div className={`inline-flex ${className}`}>{character}</div>;
  }

  const isTop = bubblePosition === "top";
  const isLeft = bubblePosition === "left";

  return (
    <div
      className={`inline-flex ${
        isTop ? "flex-col items-center gap-2" : "items-center gap-2.5"
      } ${isLeft ? "flex-row-reverse" : ""} ${className}`}
    >
      {character}
      <SpeechBubble position={bubblePosition} key={text}>
        {text}
      </SpeechBubble>
    </div>
  );
}

function SpeechBubble({
  children,
  position,
}: {
  children: React.ReactNode;
  position: "right" | "left" | "top";
}) {
  // 吹き出しの「しっぽ」を回転した正方形で表現
  const tail =
    position === "top"
      ? "left-1/2 top-[-4px] -translate-x-1/2"
      : position === "left"
        ? "right-[-4px] top-1/2 -translate-y-1/2"
        : "left-[-4px] top-1/2 -translate-y-1/2";

  return (
    <div className="relative max-w-[200px] animate-fade-up">
      <div className="rounded-2xl bg-white px-3.5 py-2 text-[13px] leading-snug text-ink shadow-card ring-1 ring-black/[0.05]">
        {children}
      </div>
      <span className={`absolute h-2 w-2 rotate-45 bg-white ring-1 ring-black/[0.05] ${tail}`} />
    </div>
  );
}

// PNG未配置時のフォールバック（簡易SVGのごはんくん）。状態で表情が変わる。
function GohankunFace({ state }: { state: GohankunState }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_6px_10px_rgba(43,39,34,0.15)]">
      {/* 葉っぱ */}
      <path d="M30 34 Q22 22 14 26 Q20 34 30 38 Z" fill="#7C8B6F" />
      <path d="M37 32 Q32 18 24 20 Q28 30 37 35 Z" fill="#8C9B7F" />
      {/* ごはん */}
      <path
        d="M28 40 Q50 18 72 40 Q72 44 50 44 Q28 44 28 40 Z"
        fill="#FBF8F2"
        stroke="#5A4632"
        strokeWidth="1.6"
      />
      <circle cx="44" cy="34" r="1" fill="#B68A3E" />
      <circle cx="55" cy="31" r="1" fill="#B68A3E" />
      <circle cx="60" cy="37" r="1" fill="#B68A3E" />
      <circle cx="49" cy="38" r="1" fill="#B68A3E" />
      {/* 茶碗 */}
      <path
        d="M26 42 Q50 46 74 42 L68 66 Q50 74 32 66 Z"
        fill="#F1EAD9"
        stroke="#5A4632"
        strokeWidth="1.8"
      />
      {/* 緑の帯 */}
      <path d="M27 44 Q50 48 73 44 L71 52 Q50 56 29 52 Z" fill="#7C8B6F" />
      {/* 高台 */}
      <path d="M40 70 L60 70 L57 76 L43 76 Z" fill="#B68A3E" />
      {/* 表情 */}
      <Face state={state} />
    </svg>
  );
}

function Face({ state }: { state: GohankunState }) {
  const cheeks = (
    <>
      <ellipse cx="37" cy="62" rx="3" ry="2" fill="#E8A088" opacity="0.7" />
      <ellipse cx="63" cy="62" rx="3" ry="2" fill="#E8A088" opacity="0.7" />
    </>
  );
  const eye = (cx: number) => (
    <>
      <circle cx={cx} cy="59" r="2.6" fill="#3D312A" />
      <circle cx={cx - 0.8} cy="58.2" r="0.8" fill="#fff" />
    </>
  );

  switch (state) {
    case "thinking":
      return (
        <>
          {/* 怒り気味の眉 */}
          <path d="M40 54 L47 56" stroke="#3D312A" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M60 54 L53 56" stroke="#3D312A" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="43" cy="60" r="2.3" fill="#3D312A" />
          <circle cx="57" cy="60" r="2.3" fill="#3D312A" />
          <path d="M46 66 Q50 64 54 66" stroke="#3D312A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* 湯気 */}
          <path d="M68 36 Q72 33 69 30 Q66 28 69 25" stroke="#C9C3B6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      );
    case "eating":
      // ウインク
      return (
        <>
          {cheeks}
          {eye(43)}
          <path d="M55 59 Q57 57 59 59" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M45 65 Q50 70 55 65 Q50 67 45 65 Z" fill="#C96E4A" />
        </>
      );
    case "explaining":
      // メガネ
      return (
        <>
          <circle cx="43" cy="60" r="4.2" fill="none" stroke="#B68A3E" strokeWidth="1.4" />
          <circle cx="57" cy="60" r="4.2" fill="none" stroke="#B68A3E" strokeWidth="1.4" />
          <path d="M47.2 60 L52.8 60" stroke="#B68A3E" strokeWidth="1.4" />
          <circle cx="43" cy="60" r="2" fill="#3D312A" />
          <circle cx="57" cy="60" r="2" fill="#3D312A" />
          <path d="M46 66 Q50 68 54 66" stroke="#3D312A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      );
    case "proud":
      return (
        <>
          {cheeks}
          {eye(43)}
          {eye(57)}
          <path d="M45 64 Q50 70 55 64 Q50 66 45 64 Z" fill="#C96E4A" />
          {/* キラッ */}
          <path d="M70 50 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2 Z" fill="#B68A3E" />
        </>
      );
    case "sing":
      // 目を閉じてごきげんに歌う＋音符
      return (
        <>
          {cheeks}
          <path d="M40 60 Q43 57 46 60" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M54 60 Q57 57 60 60" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="66" rx="3.2" ry="4" fill="#C96E4A" />
          {/* 音符 */}
          <g stroke="#7C8B6F" strokeWidth="1.4" fill="#7C8B6F">
            <circle cx="69" cy="44" r="2" />
            <path d="M71 44 L71 34" fill="none" />
            <path d="M71 34 q4 1 4 4" fill="none" />
          </g>
        </>
      );
    case "sleep":
      // 目を閉じてZzz
      return (
        <>
          <path d="M40 60 Q43 63 46 60" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M54 60 Q57 63 60 60" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="66" rx="1.6" ry="1.2" fill="#3D312A" opacity="0.5" />
          {/* Zzz */}
          <text x="64" y="40" fontSize="9" fill="#9AA38C" fontFamily="sans-serif" fontWeight="700">z</text>
          <text x="70" y="33" fontSize="11" fill="#7C8B6F" fontFamily="sans-serif" fontWeight="700">Z</text>
        </>
      );
    case "sad":
      // しょんぼり（垂れ目＋への字口＋汗）
      return (
        <>
          <ellipse cx="37" cy="63" rx="3" ry="1.8" fill="#E8A088" opacity="0.6" />
          <ellipse cx="63" cy="63" rx="3" ry="1.8" fill="#E8A088" opacity="0.6" />
          <path d="M40 58 L46 61" stroke="#3D312A" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M60 58 L54 61" stroke="#3D312A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="43" cy="61" r="2.2" fill="#3D312A" />
          <circle cx="57" cy="61" r="2.2" fill="#3D312A" />
          <path d="M46 67 Q50 64 54 67" stroke="#3D312A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* 汗 */}
          <path d="M64 55 q2 3 0 5 q-2 -2 0 -5 Z" fill="#8FB8D8" />
        </>
      );
    case "happy":
    default:
      return (
        <>
          {cheeks}
          {eye(43)}
          {eye(57)}
          <path d="M45 64 Q50 69 55 64" stroke="#3D312A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      );
  }
}
