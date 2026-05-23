import type { Config } from "tailwindcss";

// Tokens lifted from the landing page (NOT Material defaults).
// These are authoritative — every screen must resolve through them.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Landing-page palette
        bg: "#0A0A18",
        surface: "#0F0F22",
        "surface-2": "#14142E",
        card: "#111128",
        "card-2": "#16162E",
        muted: "#8888A8",
        // Accent system
        accent: "#FF6B00",
        "accent-bright": "#FF8C33",
        "accent-dim": "rgba(255,107,0,0.15)",
        "accent-glow": "rgba(255,107,0,0.35)",
        "accent-border": "rgba(255,107,0,0.12)",

        // Compatibility aliases for Stitch markup that uses Material token names.
        // Mapped to the landing palette so unedited Stitch HTML still renders correctly.
        background: "#0A0A18",
        "on-background": "#FFFFFF",
        "on-surface": "#FFFFFF",
        "on-surface-variant": "#8888A8",
        "primary-container": "#FF6B00",
        primary: "#FF8C33",
        "secondary-fixed-dim": "#8888A8",
        "surface-container": "#111128",
        "surface-container-low": "#0F0F22",
        "surface-container-high": "#14142E",
        "surface-container-highest": "#16162E",
        "outline-variant": "rgba(255,255,255,0.12)",
        outline: "rgba(255,255,255,0.2)",
      },
      borderRadius: {
        DEFAULT: "0.25rem", // 4px — buttons / industrial edge
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      spacing: {
        base: "4px",
        xs: "8px",
        sm: "16px",
        md: "24px",
        lg: "48px",
        xl: "80px",
        grid_unit: "60px",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        ui: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      fontSize: {
        "display-xl": [
          "120px",
          { lineHeight: "0.9", letterSpacing: "-0.02em", fontWeight: "400" },
        ],
        "display-lg": [
          "80px",
          { lineHeight: "0.95", letterSpacing: "0em", fontWeight: "400" },
        ],
        h1: [
          "48px",
          { lineHeight: "1.0", letterSpacing: "0.02em", fontWeight: "400" },
        ],
        h2: [
          "32px",
          { lineHeight: "1.1", letterSpacing: "0.02em", fontWeight: "400" },
        ],
        "ui-label-lg": [
          "16px",
          { lineHeight: "1.2", letterSpacing: "0.2em", fontWeight: "700" },
        ],
        "ui-label-sm": [
          "12px",
          { lineHeight: "1.2", letterSpacing: "0.15em", fontWeight: "600" },
        ],
        "body-lg": [
          "18px",
          { lineHeight: "1.7", letterSpacing: "0em", fontWeight: "400" },
        ],
        "body-md": [
          "16px",
          { lineHeight: "1.7", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        "body-sm": [
          "14px",
          { lineHeight: "1.6", letterSpacing: "0.01em", fontWeight: "300" },
        ],
      },
      boxShadow: {
        glow: "0 8px 24px rgba(255,107,0,0.35)",
        "glow-lg": "0 12px 32px rgba(255,107,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
