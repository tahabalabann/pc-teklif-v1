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
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        },
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12"
        },
        accent: {
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
        soft: "0 24px 60px rgba(15, 23, 42, 0.08)",
        panel: "0 4px 24px rgba(15, 23, 42, 0.06)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.04)",
        glow: "0 0 20px rgba(249, 115, 22, 0.15)",
        elevated: "0 12px 40px rgba(15, 23, 42, 0.12)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      },
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        pulse_dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" }
        }
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-dot": "pulse_dot 2s ease-in-out infinite"
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f97316 100%)",
        "gradient-dark": "linear-gradient(135deg, #0f172a 0%, #1e1a2e 40%, #1a1020 100%)",
        "gradient-header": "linear-gradient(135deg, #0f172a 0%, #1c1126 35%, #2d1420 70%, #1e293b 100%)",
        "gradient-mesh": "radial-gradient(at 20% 80%, rgba(249, 115, 22, 0.04) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%)"
      }
    }
  },
  plugins: []
};
