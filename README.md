# MAAGE Web Application

<!--

TODO: Finish README 

 -->

The **MAAGE Web** frontend is a modernized interface for the Midwest Alliance for Applied Genomic Epidemiology (MAAGE) platform. It provides genomic surveillance, research visualization tools, and integrated analysis workflows for public health users.

MAAGE-Web GitHub: https://github.com/MAAGE-BRC/MAAGE-Web

This application is built on a legacy Dojo + Dijit framework and is being incrementally upgraded using Tailwind CSS and modern tooling via a staged hybrid approach.

---

## Project Overview

MAAGE Web sits at the core of the broader Bacterial and Viral Bioinformatics Resource Center (BV-BRC) ecosystem. It provides:

- Dataset and metadata exploration tools
- Dynamic charting and visualization
- Form-driven genomic analysis workflows
- Multi-level UI theming with light/dark support
- Legacy support for Dijit-based widgets and layouting

---

## Technologies Used

### Legacy Stack
- **Dojo Toolkit / Dijit 1.16**
- **EJS templates** for server-rendered views
- **Node.js + Express** backend

### Modern Stack
- **Tailwind CSS v4** for scalable, tokenized utility styling
- **PostCSS** with plugins:
  - `postcss-import`
  - `postcss-nested`
  - `tailwindcss`
  - `autoprefixer`
  - `cssnano` (production only)
  - `@fullhuman/postcss-purgecss` (production only)
- **Prettier** + `prettier-plugin-tailwindcss` for class order formatting

---

## Getting Started

### Install Dependencies
```bash
npm install
```

### Build Tailwind CSS
```bash
# Build both themes
npm run tailwind:build:all

# Or build individually
npm run tailwind:build:light
npm run tailwind:build:dark
```

### Start the App
```bash
node app.js
```

---

## Tailwind Usage Strategy

Tailwind is currently scoped to:
- `public/maage/css/input.css` as the only build entry
- Targeting `views/**/*.ejs` templates via `--content`
- Used to gradually replace legacy styles with scoped, override-safe class sets

Legacy styles remain untouched during purge and migration unless explicitly targeted.

---

## Directory Overview
```
maage-web/
├── app.js                # Express application
├── public/              # Static assets, scripts, legacy CSS
│   ├── js/              # Main application JS including Dojo and modules
│   ├── icon_source/     # Custom icon set
│   ├── help/            # Inline application help content
│   ├── js-p3-resources/ # Custom visualizations, dashboards, and diagrams
│   └── maage/css/       # Tailwind source and compiled output
├── views/               # EJS templates and page layouts
├── bin/                 # CLI entry points
├── docs/                # Internal dev documentation
├── tailwind.config.mjs  # Design system integration
├── postcss.config.js    # Tailwind + PostCSS plugins
├── package.json         # Build and dev scripts
└── .prettierrc/.eslintrc # Formatting and linting rules
```

---

## Contributing

This application is being actively refactored from its monolithic legacy base into a modular, progressively styled frontend. If contributing:

- Stick to scoped Tailwind components
- Do not modify legacy CSS files unless for isolation or reset
- Follow established font and color tokens defined in `variables.css`
- Use Prettier + Tailwind plugin to enforce class ordering

---

## License

MAAGE Web is released under the [MIT License](LICENSE.md). Please refer to accompanying documents for usage policies regarding public health data and embedded visualization libraries.
