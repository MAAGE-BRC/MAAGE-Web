// tailwind-maage-config.js
// Standalone Tailwind config (Option 1)
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        maage: {
          primary: {
            50: '#f6f9f8', 100: '#e5f1e9', 200: '#d2e5db',
            300: '#b3d1c2', 400: '#92baa8', 500: '#5b9f83',
            600: '#44856e', 700: '#3b735e', 800: '#315d4c',
            900: '#2a4b40', 950: '#192f28'
          },
          secondary: {
            50: '#f5f9fa', 100: '#e7f0f3', 200: '#d2e4ea',
            300: '#b3d0db', 400: '#8fb7c6', 500: '#679fb7',
            600: '#4d85a2', 700: '#446c83', 800: '#3c5867',
            900: '#344855', 950: '#1d2b35'
          },
          tertiary: {
            50: '#fefcf5', 100: '#fdf7e6', 200: '#faeccc',
            300: '#f4dfb0', 400: '#eacb89', 500: '#ddaf60',
            600: '#c79547', 700: '#a87634', 800: '#895c2b',
            900: '#6c4723', 950: '#3c2913'
          },
          quaternary: {
            50: '#f6f6f9',
            100: '#efeff5',
            200: '#dfdfec',
            300: '#cbc9de',
            400: '#b0aecb',
            500: '#9a96bb',
            600: '#847ba7',
            700: '#6c638c',
            800: '#585171',
            900: '#48435b',
            950: '#2a2839'
          },
          quinary: {
            50: '#fcf5f3',
            100: '#faebea',
            200: '#f4dad7',
            300: '#ecc0bb',
            400: '#e49f9b',
            500: '#d8807e',
            600: '#c66264',
            700: '#b43c41',
            800: '#8f3239',
            900: '#732b33',
            950: '#4a171a'
          },
          senary: {
            50: '#f2fafb',
            100: '#dff3f5',
            200: '#c2e9ee',
            300: '#9fdbe3',
            400: '#75c8d6',
            500: '#53b2c6',
            600: '#3d98ae',
            700: '#357e8e',
            800: '#2e6773',
            900: '#2a535e',
            950: '#1b343d'
          },
          success: { 50: '#f2fbf5', 500: '#4ba675', 600: '#3d8d61' },
          warning: { 50: '#fff9eb', 500: '#f0b429', 600: '#d99a1c' },
          error: { 50: '#fef2f2', 500: '#d9534f', 600: '#c0392b' },
          info: { 50: '#eef6fb', 500: '#5b9bd5', 600: '#417cbf' },
          text: {
            DEFAULT: '#212529',
            muted: '#495057',
            subtle: '#6c757d',
            inverse: '#f8f9fa',
            link: '#4d85a2'
          },
          bg: {
            DEFAULT: '#f8f9fa',
            subtle: '#f1f3f5',
            muted: '#e9ecef',
            surface: '#ffffff',
            border: '#dee2e6'
          },
          dataviz: {
              1: '#5fa588', 2: '#679fb7', 3: '#ecc188', 4: '#b3d1c2',
            5: '#b3d0db', 6: '#f4dfb3', 7: '#498d73', 8: '#4d85a2',
            9: '#da8640', 10: '#8fb7c6', 11: '#efca92', 12: '#d2e5db',
            13: '#446c83', 14: '#be6a2e', 15: '#e5aa6d', 16: '#3b735e',
            17: '#3c5867', 18: '#9a5929', 19: '#5b9bd5', 20: '#4ba675'
          }
        }
      }
    }
  },
  plugins: []
};
