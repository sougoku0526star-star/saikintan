import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 絵本のように温かい生成り背景＋手書き線のような優しい差し色
        paper: "#FAF8F5", // 生成り（ページ背景）
        cream: "#FFFCF6", // ふんわり浮く面（カード・ナビ・吹き出し）
        ink: "#3D312A", // 手書き線のような優しいダークブラウン
        clay: "#D2795A", // テラコッタ（差し色・少しやわらかく）
        sage: "#7C8B6F", // 栄養（ヘルシー）
        gold: "#C49A4A", // 支出（金・少し明るく）
        dusk: "#5A6B7B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      // すべての要素を大きめに丸める（絵本のようなやわらかさ）
      borderRadius: {
        lg: "0.95rem",
        xl: "1.2rem",
        "2xl": "1.6rem",
        "3xl": "2.2rem",
      },
      boxShadow: {
        // 薄く、少しポテッとした温かみのある影（ブラウン寄り）
        polaroid: "0 14px 34px -14px rgba(61,49,42,0.28)",
        card: "0 8px 22px -10px rgba(61,49,42,0.16)",
        soft: "0 4px 16px -6px rgba(61,49,42,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%": { transform: "translateY(-130%)" },
          "100%": { transform: "translateY(130%)" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        // 歌っているような軽い横ゆれ
        sway: {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        scan: "scan 1.7s ease-in-out infinite",
        pop: "pop 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        twinkle: "twinkle 1.4s ease-in-out infinite",
        sway: "sway 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
