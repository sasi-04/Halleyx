/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        // Keep older tokens for existing screens
        border: "hsl(214 32% 91%)",
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222 47% 11%)",
        muted: "hsl(210 40% 96%)",
        accent: "hsl(210 40% 92%)",
        primary: {
          DEFAULT: "hsl(222 47% 11%)",
          foreground: "hsl(210 40% 98%)"
        },
        secondary: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(222 47% 11%)"
        },

        // New app-level tokens (match tailwind.config.ts + globals.css)
        app: "rgb(var(--hx-app) / <alpha-value>)",
        surface: "rgb(var(--hx-surface) / <alpha-value>)",
        panel: "rgb(var(--hx-panel) / <alpha-value>)",
        sidebar: "rgb(var(--hx-sidebar) / <alpha-value>)",
        border2: "rgb(var(--hx-border) / <alpha-value>)",
        text: {
          DEFAULT: "rgb(var(--hx-text) / <alpha-value>)",
          secondary: "rgb(var(--hx-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--hx-text-muted) / <alpha-value>)",
          onSidebar: "rgb(var(--hx-text-on-sidebar) / <alpha-value>)"
        },
        hxprimary: "rgb(var(--hx-primary) / <alpha-value>)",
        hxaccent: "rgb(var(--hx-accent) / <alpha-value>)",
        hxsoftBlue: "rgb(var(--hx-soft-blue) / <alpha-value>)",
        hxsoftPink: "rgb(var(--hx-soft-pink) / <alpha-value>)",
        hxdarkGray: "rgb(var(--hx-dark-gray) / <alpha-value>)",
        info: "rgb(var(--hx-info) / <alpha-value>)",
        success: "rgb(var(--hx-success) / <alpha-value>)",
        error: "rgb(var(--hx-error) / <alpha-value>)",
        step: {
          completed: "rgb(var(--hx-step-completed) / <alpha-value>)",
          current: "rgb(var(--hx-step-current) / <alpha-value>)",
          pending: "rgb(var(--hx-step-pending) / <alpha-value>)"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        card: "14px",
        panel: "16px"
      },
      boxShadow: {
        card: "0 10px 30px rgba(0, 0, 0, 0.04)",
        cardHover: "0 14px 40px rgba(0, 0, 0, 0.08)",
        floating: "0 18px 50px rgba(15, 23, 42, 0.32)"
      },
      backdropBlur: {
        glass: "16px"
      }
    }
  },
  plugins: []
};

