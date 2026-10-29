/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A",
        emerald: "#047857",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        textColor: "#0F172A",
        errorColor: "#EF4444",
      },
    },
  },
  plugins: [],
}
