# Deployment Guide

## Prerequisites

- **Node.js**: 22.x or later (LTS recommended)
- **npm**: 10.x or later (ships with Node 22)

## Install Dependencies

```bash
npm ci
```

## Run Tests Locally

```bash
npm test
```

## Type Check

```bash
npm run type-check
```

## Run the Production Build Locally

```bash
npm run build
```

The compiled output is written to the `dist/` directory.

To preview the built output locally using a static file server:

```bash
npx serve dist
```

Or any equivalent static server (e.g. `python3 -m http.server` from inside `dist/`).

## Development Server

```bash
npm run dev
```

Opens a hot-reloading dev server at `http://localhost:5173` (default Vite port).

## Deploy as a Static Site

The contents of `dist/` are a fully self-contained static site (one HTML file + hashed JS/CSS assets). Deploy them to any static hosting service:

- **Netlify / Vercel**: point the publish directory to `dist`
- **GitHub Pages**: copy `dist/` contents to the `gh-pages` branch
- **Nginx / Apache**: serve `dist/` as the document root
- **Any CDN**: upload `dist/` and set `index.html` as the default document

No server-side runtime is required.

## Compliance String Search

Run this search to verify no prohibited terms appear in source files:

```bash
grep -RniE \
  "elite|cobra|jameson|lave|diso|leesti|zaonce|riedquat|tionisla|coriolis|galcop|thargoid|thargon|frontier" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git
```

Matches inside `COMPLIANCE.md` and `2026-05-24_compliance-review.md` are expected audit records and are not violations. Any match in source code, UI text, or generated content is a violation.
