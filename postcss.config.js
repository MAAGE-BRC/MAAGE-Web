module.exports = (ctx) => {
  const filename = ctx.file ? ctx.file.basename : '';
  
  // /tw/input.css --> /tw/output.css
  if (filename === 'input.css') {
    return {
      plugins: {
        'postcss-import': {},
        'tailwindcss': {},
        'autoprefixer': {},
      }
    };
  }
  
  // /src/index.css (which is /tw/output.css + /src/css partials) --> /dist/maage.css
  if (filename === 'index.css') {
    return {
      plugins: {
        'postcss-import': {},
        'autoprefixer': {},
      }
    };
  }
  
  // /dist/maage.css --> /dist/maage.min.css
  if (filename === 'maage.css') {
    return {
      plugins: {
        'cssnano': { preset: 'default' },
      }
    };
  }
  
  // default: resolve @imports and autoprefixes
  return {
    plugins: {
      'postcss-import': {},
      'autoprefixer': {},
    }
  };
};