/** @type {import('tailwindcss').Config} */
module.exports = {
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
        errorColor: "#EF4444",
      },
      borderRadius: {
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
}
