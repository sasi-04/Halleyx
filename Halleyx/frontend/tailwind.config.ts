import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core app tokens (backed by CSS variables in `app/globals.css`)
        app: 'rgb(var(--hx-app) / <alpha-value>)',
        surface: 'rgb(var(--hx-surface) / <alpha-value>)',
        panel: 'rgb(var(--hx-panel) / <alpha-value>)',
        sidebar: 'rgb(var(--hx-sidebar) / <alpha-value>)',
        border: 'rgb(var(--hx-border) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--hx-text) / <alpha-value>)',
          secondary: 'rgb(var(--hx-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--hx-text-muted) / <alpha-value>)',
          onSidebar: 'rgb(var(--hx-text-on-sidebar) / <alpha-value>)',
        },

        // Palette
        primary: 'rgb(var(--hx-primary) / <alpha-value>)',
        accent: 'rgb(var(--hx-accent) / <alpha-value>)',
        softBlue: 'rgb(var(--hx-soft-blue) / <alpha-value>)',
        softPink: 'rgb(var(--hx-soft-pink) / <alpha-value>)',
        darkGray: 'rgb(var(--hx-dark-gray) / <alpha-value>)',

        // Semantic
        info: 'rgb(var(--hx-info) / <alpha-value>)',
        success: 'rgb(var(--hx-success) / <alpha-value>)',
        error: 'rgb(var(--hx-error) / <alpha-value>)',

        // Workflow step states
        step: {
          completed: 'rgb(var(--hx-step-completed) / <alpha-value>)',
          current: 'rgb(var(--hx-step-current) / <alpha-value>)',
          pending: 'rgb(var(--hx-step-pending) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '14px',
        panel: '16px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0, 0, 0, 0.04)',
        cardHover: '0 14px 40px rgba(0, 0, 0, 0.08)',
        floating: '0 18px 50px rgba(15, 23, 42, 0.32)',
      },
      backdropBlur: {
        glass: '16px',
      },
    }
  },
  plugins: []
};

export default config;

