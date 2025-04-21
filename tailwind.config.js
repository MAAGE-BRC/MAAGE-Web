/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.{html,ejs}', // Update this path as needed
  ],
theme: {
      extend: {
        fontFamily: {
          heading: [
            "Poppins", "sans-serif"
          ],
          body: [
            "Inter", "sans-serif"
          ],
          mono: ["IBM Plex Mono", "monospace"]
        },
        maxWidth: {
          'maage': '1400px'
        },
        colors: {
          maage: {
            bg: {
              DEFAULT: "#f8f9fa",
              faint: "#fcfcfd",
              subtle: "#f1f3f5",
              alt: "#f3f4f6",
              muted: "#e9ecef",
              soft: "#eaeef0",
              strong: "#dee2e6",
              inverse: "#ffffff"
            },
            surface: "#ffffff",
            border: "#dee2e6",
            text: {
              DEFAULT: "#212529",
              muted: "#495057",
              subtle: "#6c757d",
              inverse: "#f8f9fa",
              link: "#447188",
              'link-white': "#f5f5f5",
              white: "#fafafa",
              black: "#1a1a1a",
              primary: 'var(--maage-primary-500)',
              secondary: 'var(--maage-secondary-500)',
              tertiary: 'var(--maage-tertiary-500)',
              quaternary: 'var(--maage-quaternary-500)',
              quinary: 'var(--maage-quinary-500)'
            },
            success: {
              50: "#f2fbf5",
              500: "#4ba675",
              600: "#3d8d61"
            },
            warning: {
              50: "#fff9eb",
              500: "#f0b429",
              600: "#d99a1c"
            },
            error: {
              50: "#fef2f2",
              500: "#d9534f",
              600: "#c0392b"
            },
            info: {
              50: "#eef6fb",
              500: "#5b9bd5",
              600: "#417cbf"
            },
            'primary': {
              '50': '#f3f7f5',
              '100': '#ecf3f0',
              '200': '#d6e5de',
              '300': '#b4d0c3',
              '400': '#98bdac',
              '500': '#6ea089',
              '600': '#57856f',
              '700': '#496f5d',
              '800': '#3c5d4e',
              '900': '#324d41',
              '950': '#1c2b24'
            },
            'secondary': {
              '50': '#eef4f7',
              '100': '#dce9ef',
              '200': '#c1d8e1',
              '300': '#a0c1cf',
              '400': '#87afc0',
              '500': '#5f94ab',
              '600': '#467386',
              '700': '#406777',
              '800': '#365663',
              '900': '#2e4a56',
              '950': '#22363f'
            },
            'tertiary': {
              '50': '#fdfaf2',
              '100': '#fbf6e9',
              '200': '#f8edd8',
              '300': '#f4e4c2',
              '400': '#edd5a6',
              '500': '#e7c788',
              '600': '#dab46c',
              '700': '#d29c4b',
              '800': '#bb8335',
              '900': '#946729',
              '950': '#6d461d'
            },
            'quaternary': {
              '50': '#f6f6f9',
              '100': '#efeff5',
              '200': '#dfdfec',
              '300': '#cbc9de',
              '400': '#b0aecb',
              '500': '#9a96bb',
              '600': '#847ba7',
              '700': '#6c638c',
              '800': '#585171',
              '900': '#48435b',
              '950': '#2a2839'
            },
            'quinary': {
              '50': '#fbf6f5',
              '100': '#f8eceb',
              '200': '#f1dbda',
              '300': '#e6bebb',
              '400': '#d79895',
              '500': '#c56e6e',
              '600': '#ab4e52',
              '700': '#923e44',
              '800': '#7b363d',
              '900': '#6c323a',
              '950': '#491d22'
            },
            'gray-neutral': {
              '50': '#f5f5f5',
              '100': '#ededed',
              '200': '#dedede',
              '300': '#c9c9c9',
              '400': '#adadad',
              '500': '#8f8f8f',
              '600': '#757575',
              '700': '#595959',
              '800': '#454545',
              '900': '#333333',
              '950': '#262626'
            },
            'gray-cool': {
              '50': '#f9fafb',
              '100': '#f3f4f6',
              '200': '#e5e7eb',
              '300': '#d0d5dc',
              '400': '#9aa3b1',
              '500': '#687182',
              '600': '#495465',
              '700': '#364153',
              '800': '#1e2938',
              '900': '#111828',
              '950': '#030712'
            },
            'gray-warm': {
              '50': '#f8f8f7',
              '100': '#eeeeec',
              '200': '#dfdfdc',
              '300': '#ccccc7',
              '400': '#b2b1a9',
              '500': '#9a988e',
              '600': '#838177',
              '700': '#6b6961',
              '800': '#585650',
              '900': '#484742',
              '950': '#2b2a27'
            }
          }
        }
      }
    },
  plugins: [],
};