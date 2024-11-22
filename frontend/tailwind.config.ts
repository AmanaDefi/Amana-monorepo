import type { Config } from "tailwindcss";

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
      colors: {
        customNeutral100: "#353945",
        customNeutral200: "#23262F",
        customNeutral300: "#141416",

        customGray100: "#D7D7D7",
        customGray200: "#C8C8C8",
        customGray300: "#AFAFAF",
        customGray400: "#969696",
        customGray500: "#737373",
        customGray600: "#555555",

        primaryGreen: "#7AFB79",
        primaryYellow: "#DFFF1C",
        secondaryYellow: "#FFE650",
        secondaryBlue: "#87C1F8",
        secondaryPink: "#E93BD5",
        secondaryFuchsia: "#F289E6",
        secondaryPurple: "#9B55FF",
        secondaryViolet: "#C391FF",
      },
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
      },
      letterSpacing: {
        1: "1px",
      },
    },
  },
  plugins: [],
};
export default config;
