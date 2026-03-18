/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1f2937",
          900: "#111827"
        },
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c"
        }
      },
      boxShadow: {
        soft: "0 24px 60px rgba(15, 23, 42, 0.10)",
        panel: "0 18px 45px rgba(122, 18, 18, 0.08)"
      },
      fontFamily: {
        sans: ["'Segoe UI Variable'", "'Segoe UI'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Georgia", "Cambria", "'Times New Roman'", "serif"]
      }
    }
  },
  plugins: []
};
