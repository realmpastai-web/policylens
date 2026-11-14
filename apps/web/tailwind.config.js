/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe6",
        "paper-deep": "#e7e0d2",
        ink: "#1a2332",
        "ink-soft": "#465066",
        line: "#d9d0c1",
        card: "#fffcf7",
        teal: {
          DEFAULT: "#0e6b66",
          deep: "#0a3f3d",
          soft: "#e5f3f1",
        },
        clay: "#8f3d2b",
        amber: {
          DEFAULT: "#8a5a12",
          soft: "#f8efd8",
        },
      },
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(26, 35, 50, 0.04), 0 16px 40px -28px rgba(26, 35, 50, 0.45)",
      },
    },
  },
  plugins: [],
};
