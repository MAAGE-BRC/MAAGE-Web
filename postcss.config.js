const purgecss = require('@fullhuman/postcss-purgecss')({
  content: ['./views/**/*.{ejs,html,js}'],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
});

module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    tailwindcss: {
      config: process.env.THEME === 'dark' ? './tailwind.config.dark.mjs' : './tailwind.config.mjs'
    },
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
    ...(process.env.NODE_ENV === 'production' ? { purgecss } : {})
  }
};