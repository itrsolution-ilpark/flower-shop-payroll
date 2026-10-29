import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#059669",
          hover: "#047857",
        },
        secondary: "#1E293B",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        textColor: "#0F172A",
        subText: "#64748B",
        borderLine: "#E2E8F0",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
