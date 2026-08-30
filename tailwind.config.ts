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
        // LuxePass Design System - Light Theme
        "blush-1": "var(--bg-blush-1, #F8EAE1)",
        "blush-2": "var(--bg-blush-2, #FCF4EE)",
        "ink-900": "var(--ink-900, #221A14)",
        "ink-700": "var(--ink-700, #55483D)",
        "ink-400": "var(--ink-400, #9C8D80)",
        "gold-500": "var(--gold-500, #C9A876)",
        "gold-600": "var(--gold-600, #AD8A5C)",
        "gold-100": "var(--gold-100, #F1E3D0)",
        "border-color": "var(--border, #E7D9C9)",
        // Dark Theme
        "panel-black": "var(--panel-black, #15110D)",
        "dark-ink-100": "var(--dark-ink-100, #F1E3D0)",
        "dark-ink-300": "var(--dark-ink-300, #C9BDAF)",
        "dark-ink-500": "var(--dark-ink-500, #8A7C6C)",
        "dark-border": "var(--dark-border, #3A322A)",
        "dark-card": "var(--dark-card, #1E1813)",
        "dark-hover": "var(--dark-hover, #241D17)",
        // Map Colors
        "map-land": "var(--map-land, #EFE7DE)",
        "map-street": "var(--map-street, #FFFFFF)",
        "map-block": "var(--map-block, #E6DCD0)",
        "map-park": "var(--map-park, #E3E8D6)",
        "map-water": "var(--map-water, #DCE6E6)",
      },
      fontFamily: {
        "display": ["Bodoni Moda", "Georgia", "Times New Roman", "serif"],
        "sans": ["Manrope", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        "eyebrow": ["12px", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "700" }],
      },
      borderRadius: {
        "lg": "24px",
        "md": "18px",
        "sm": "12px",
        "xs": "10px",
      },
      boxShadow: {
        "card": "0 30px 60px -20px rgba(34, 26, 20, 0.18)",
        "card-content": "0 10px 30px -14px rgba(34, 26, 20, 0.14)",
        "card-hover": "0 24px 50px -18px rgba(34, 26, 20, 0.22)",
        "dark-card": "0 30px 60px -20px rgba(0, 0, 0, 0.32)",
        "dark-toast": "0 24px 50px -18px rgba(0, 0, 0, 0.7)",
      },
      transitionDuration: {
        "default": "150ms",
      },
      transitionTimingFunction: {
        "default": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    },
  },
  plugins: [],
};

export default config;
