import type { Config } from "tailwindcss";
import {colors} from "./src/utils/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/containers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/actions/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
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
        fustat: ['var(--font-fustat)'],
        mono: ['var(--font-space-mono)'],
        sans: ['var(--font-inter)'],
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
      }
    },
  },
  plugins: [],
};
export default config;
