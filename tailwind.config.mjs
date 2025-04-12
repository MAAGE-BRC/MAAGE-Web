/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'], // if you're using dark mode support
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--maage-font-heading)', 'sans-serif'],
        body: ['var(--maage-font-body)', 'sans-serif'],
        mono: ['var(--maage-font-mono)', 'monospace']
      },
      colors: {
        background: {
          DEFAULT: "var(--maage-bg-default)",
          faint: "var(--maage-bg-faint)",
          subtle: "var(--maage-bg-subtle)",
          alt: "var(--maage-bg-alt)",
          muted: "var(--maage-bg-muted)",
          soft: "var(--maage-bg-soft)",
          strong: "var(--maage-bg-strong)",
          inverse: "var(--maage-bg-inverse)",
          surface: "var(--maage-surface)",
          border: "var(--maage-border)"
        },
        text: {
          DEFAULT: "var(--maage-text-default)",
          muted: "var(--maage-text-muted)",
          subtle: "var(--maage-text-subtle)",
          inverse: "var(--maage-text-inverse)",
          link: "var(--maage-text-link)"
        },
        success: {
          50: "var(--maage-success-50)",
          500: "var(--maage-success-500)",
          600: "var(--maage-success-600)"
        },
        warning: {
          50: "var(--maage-warning-50)",
          500: "var(--maage-warning-500)",
          600: "var(--maage-warning-600)"
        },
        error: {
          50: "var(--maage-error-50)",
          500: "var(--maage-error-500)",
          600: "var(--maage-error-600)"
        },
        info: {
          50: "var(--maage-info-50)",
          500: "var(--maage-info-500)",
          600: "var(--maage-info-600)"
        },
        primary: {
          50: 'var(--maage-primary-50)',
          100: 'var(--maage-primary-100)',
          200: 'var(--maage-primary-200)',
          300: 'var(--maage-primary-300)',
          400: 'var(--maage-primary-400)',
          500: 'var(--maage-primary-500)',
          600: 'var(--maage-primary-600)',
          700: 'var(--maage-primary-700)',
          800: 'var(--maage-primary-800)',
          900: 'var(--maage-primary-900)',
          950: 'var(--maage-primary-950)',
          DEFAULT: 'var(--maage-primary-color)'
        },
        secondary: {
          50: 'var(--maage-secondary-50)',
          100: 'var(--maage-secondary-100)',
          200: 'var(--maage-secondary-200)',
          300: 'var(--maage-secondary-300)',
          400: 'var(--maage-secondary-400)',
          500: 'var(--maage-secondary-500)',
          600: 'var(--maage-secondary-600)',
          700: 'var(--maage-secondary-700)',
          800: 'var(--maage-secondary-800)',
          900: 'var(--maage-secondary-900)',
          950: 'var(--maage-secondary-950)',
          DEFAULT: 'var(--maage-secondary-color)'
        },
        tertiary: {
          50: 'var(--maage-tertiary-50)',
          100: 'var(--maage-tertiary-100)',
          200: 'var(--maage-tertiary-200)',
          300: 'var(--maage-tertiary-300)',
          400: 'var(--maage-tertiary-400)',
          500: 'var(--maage-tertiary-500)',
          600: 'var(--maage-tertiary-600)',
          700: 'var(--maage-tertiary-700)',
          800: 'var(--maage-tertiary-800)',
          900: 'var(--maage-tertiary-900)',
          950: 'var(--maage-tertiary-950)',
          DEFAULT: 'var(--maage-tertiary-color)'
        },
        gray: {
          50: 'var(--maage-gray-50)',
          100: 'var(--maage-gray-100)',
          200: 'var(--maage-gray-200)',
          300: 'var(--maage-gray-300)',
          400: 'var(--maage-gray-400)',
          500: 'var(--maage-gray-500)',
          600: 'var(--maage-gray-600)',
          700: 'var(--maage-gray-700)',
          800: 'var(--maage-gray-800)',
          900: 'var(--maage-gray-900)',
          950: 'var(--maage-gray-950)'
        }
      }
    }
  },
  plugins: []
}
