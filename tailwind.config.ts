import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 余白の効いた「紙」のような背景と、温かみのある差し色
        paper: "#F7F3EC",
        cream: "#FBF8F2",
        ink: "#2B2722",
        clay: "#C96E4A", // テラコッタ（差し色）
        sage: "#7C8B6F", // 栄養（ヘルシー）
        gold: "#B68A3E", // 支出（金）
        dusk: "#5A6B7B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        polaroid: "0 10px 30px -10px rgba(43,39,34,0.35)",
        card: "0 4px 20px -8px rgba(43,39,34,0.18)",
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
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        scan: "scan 1.7s ease-in-out infinite",
        pop: "pop 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        twinkle: "twinkle 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
