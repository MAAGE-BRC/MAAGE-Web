/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./views/**/*.{js,jsx,ts,tsx,ejs,html}'],
    darkMode: ['class', '[data-theme="dark"]'],
    theme: {
      extend: {
        fontFamily: {
          heading: ['Poppins', 'sans-serif'],
          body: ['Inter', 'sans-serif'],
          mono: ['IBM Plex Mono', 'monospace']
        },
        colors: {
          maage: {
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
              950: 'var(--maage-primary-950)'
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
              950: 'var(--maage-secondary-950)'
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
              950: 'var(--maage-tertiary-950)'
            },
            quaternary: {
              50: 'var(--maage-quaternary-50)',
              100: 'var(--maage-quaternary-100)',
              200: 'var(--maage-quaternary-200)',
              300: 'var(--maage-quaternary-300)',
              400: 'var(--maage-quaternary-400)',
              500: 'var(--maage-quaternary-500)',
              600: 'var(--maage-quaternary-600)',
              700: 'var(--maage-quaternary-700)',
              800: 'var(--maage-quaternary-800)',
              900: 'var(--maage-quaternary-900)',
              950: 'var(--maage-quaternary-950)'
            },
            quinary: {
              50: 'var(--maage-quinary-50)',
              100: 'var(--maage-quinary-100)',
              200: 'var(--maage-quinary-200)',
              300: 'var(--maage-quinary-300)',
              400: 'var(--maage-quinary-400)',
              500: 'var(--maage-quinary-500)',
              600: 'var(--maage-quinary-600)',
              700: 'var(--maage-quinary-700)',
              800: 'var(--maage-quinary-800)',
              900: 'var(--maage-quinary-900)',
              950: 'var(--maage-quinary-950)'
            },
            senary: {
              50: 'var(--maage-senary-50)',
              100: 'var(--maage-senary-100)',
              200: 'var(--maage-senary-200)',
              300: 'var(--maage-senary-300)',
              400: 'var(--maage-senary-400)',
              500: 'var(--maage-senary-500)',
              600: 'var(--maage-senary-600)',
              700: 'var(--maage-senary-700)',
              800: 'var(--maage-senary-800)',
              900: 'var(--maage-senary-900)',
              950: 'var(--maage-senary-950)'
            },
            text: {
              DEFAULT: 'var(--maage-text-default)',
              muted: 'var(--maage-text-muted)',
              subtle: 'var(--maage-text-subtle)',
              inverse: 'var(--maage-text-inverse)',
              link: 'var(--maage-text-link)'
            },
            bg: {
              DEFAULT: 'var(--maage-bg-default)',
              subtle: 'var(--maage-bg-subtle)',
              muted: 'var(--maage-bg-muted)',
              surface: 'var(--maage-bg-surface)',
              border: 'var(--maage-bg-border)'
            },
            success: {
              50: 'var(--maage-success-50)',
              500: 'var(--maage-success-500)',
              600: 'var(--maage-success-600)'
            },
            warning: {
              50: 'var(--maage-warning-50)',
              500: 'var(--maage-warning-500)',
              600: 'var(--maage-warning-600)'
            },
            error: {
              50: 'var(--maage-error-50)',
              500: 'var(--maage-error-500)',
              600: 'var(--maage-error-600)'
            },
            info: {
              50: 'var(--maage-info-50)',
              500: 'var(--maage-info-500)',
              600: 'var(--maage-info-600)'
            },
            dataviz: {
              primary: {
                1: 'var(--maage-dataviz-primary-1)',
                2: 'var(--maage-dataviz-primary-2)',
                3: 'var(--maage-dataviz-primary-3)',
                4: 'var(--maage-dataviz-primary-4)'
              },
              secondary: {
                1: 'var(--maage-dataviz-secondary-1)',
                2: 'var(--maage-dataviz-secondary-2)',
                3: 'var(--maage-dataviz-secondary-3)',
                4: 'var(--maage-dataviz-secondary-4)'
              },
              tertiary: {
                1: 'var(--maage-dataviz-tertiary-1)',
                2: 'var(--maage-dataviz-tertiary-2)',
                3: 'var(--maage-dataviz-tertiary-3)',
                4: 'var(--maage-dataviz-tertiary-4)'
              },
              quaternary: {
                1: 'var(--maage-dataviz-quaternary-1)',
                2: 'var(--maage-dataviz-quaternary-2)',
                3: 'var(--maage-dataviz-quaternary-3)',
                4: 'var(--maage-dataviz-quaternary-4)'
              },
              quinary: {
                1: 'var(--maage-dataviz-quinary-1)',
                2: 'var(--maage-dataviz-quinary-2)',
                3: 'var(--maage-dataviz-quinary-3)',
                4: 'var(--maage-dataviz-quinary-4)'
              },
              senary: {
                1: 'var(--maage-dataviz-senary-1)',
                2: 'var(--maage-dataviz-senary-2)',
                3: 'var(--maage-dataviz-senary-3)',
                4: 'var(--maage-dataviz-senary-4)'
              }
            }
          }
        }
      }
    },
    plugins: []
  };
