/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sophia: {
          blue: {
            DEFAULT: "#113F9C",
            50: "#eef4ff",
            100: "#d9e5ff",
            200: "#bcd2ff",
            300: "#8eb6ff",
            400: "#5990ff",
            500: "#113F9C",
            600: "#0e3482",
            700: "#0b2866",
            800: "#092052",
            900: "#06163b",
          },
          sky: {
            DEFAULT: "#0284C7",
            light: "#38BDF8",
            dark: "#0369A1"
          },
          accent: "#2563EB"
        }
      }
    },
  },
  plugins: [],
}
