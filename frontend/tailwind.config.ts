import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { colors } from "./src/utils/colors";
import { withAccountKitUi, createColorSet } from "@account-kit/react/tailwind";

const beforeGradientBorder = plugin(({ addUtilities }) => {
  addUtilities({
    ".before-gradient-border": {
      position: "relative",
      zIndex: "0",
    },
    ".before-gradient-border::before": {
      content: '""',
      position: "absolute",
      inset: "0",
      padding: "1px",
      borderRadius: "inherit",
      background: "linear-gradient(180deg, #162559 0%, #1B46E0 100%)",
      pointerEvents: "none",
      zIndex: "-1",
      maskComposite: "exclude",
      WebkitMask:
        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      WebkitMaskComposite: "xor",
    },
  });
});
const menuItemHover = plugin(function ({ addUtilities }) {
  addUtilities({
    ".menu-item-hover": {
      background:
        "linear-gradient(159deg, #14171f 0%, #14171f 60%, rgba(27, 70, 224, 0.3) 80%, rgba(27, 70, 224, 0.5) 100%) !important",
    },
  });
});
const sidebarShadow = plugin(({ addUtilities }) => {
  addUtilities({
    ".sidebar-shadow": {
      boxShadow: "0 2px 2px 0 rgba(0, 0, 0, 0.1)",
    },
  });
});

const config: Config = withAccountKitUi({
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/containers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/actions/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      "3xl": "1536px",
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "deep-blue-gradient":
          "linear-gradient(90deg, rgba(20, 23, 31, 0.15), #1B46E0)",
        "custom-gradient":
          "linear-gradient(139deg, #14171f 0%, #14171f 55%, rgba(27,70,224,0.25) 70%, rgba(27,70,224,0.5) 90%, #1b46e0 120%)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "3rem",
      },
      colors,
      fontSize: {
        zero: "0rem",
        xs: ".75rem",
        sm: ".875rem",
        tiny: ".875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
        "5xl": "3rem",
        "6xl": "3.5rem",
        "7xl": "4rem",
        "8xl": "4.5rem",
        "9xl": "6rem",
        "10xl": "8rem",
      },

      fontFamily: {
        khTeka: ["'KH Teka'", "sans-serif"],
        fustat: ["var(--font-fustat)"],
        mono: ["var(--font-space-mono)"],
        sans: ["var(--font-inter)"],
        gotham: ["var(--font-gotham)"],
      },
      letterSpacing: {
        1: "1px",
      },
      keyframes: {
        dot1: { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        dot2: { "33%": { opacity: "1" }, "100%": { opacity: "0" } },
        dot3: { "66%": { opacity: "1" }, "100%": { opacity: "0" } },
      },
      animation: {
        dot1: "dot1 2s steps(1, end) infinite",
        dot2: "dot2 2s steps(1, end) infinite",
        dot3: "dot3 2s steps(1, end) infinite",
      },
      boxShadow: {
        custom: "0 4px 6px 0 rgba(0, 0, 0, 0.1)",
        sidebar:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [beforeGradientBorder, menuItemHover, sidebarShadow],
});
export default config;
