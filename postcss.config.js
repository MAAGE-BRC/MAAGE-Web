const path = require('path');

module.exports = {
  plugins: {
    'postcss-import': {
      path: [path.resolve(__dirname, 'public/maage/css')]
    },
    tailwindcss: {},
    autoprefixer: {},
  }
}