import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#111118",
        "night-deep": "#0a0a12",
        glass: "rgba(255,255,255,0.08)",
        "glass-border": "rgba(255,255,255,0.14)",
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(167, 139, 250, 0.45)",
        "glow-pink": "0 0 50px -10px rgba(244, 114, 182, 0.4)",
        "glow-gold": "0 0 45px -10px rgba(251, 191, 36, 0.35)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        mesh:
          "radial-gradient(at 20% 20%, rgba(139, 92, 246, 0.35) 0px, transparent 50%), radial-gradient(at 80% 10%, rgba(236, 72, 153, 0.25) 0px, transparent 45%), radial-gradient(at 50% 80%, rgba(34, 211, 238, 0.2) 0px, transparent 50%), radial-gradient(at 90% 70%, rgba(251, 191, 36, 0.12) 0px, transparent 40%)",
      },
      animation: {
        shimmer: "shimmer 2.5s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
