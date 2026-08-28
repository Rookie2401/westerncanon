# Bundled typeface

**EB Garamond** — a revival of Claude Garamont's 16th-century roman, by
Georg Duffner and Octavio Pardo.

- License: SIL Open Font License, Version 1.1 (OFL). Redistribution and bundling
  in an application is permitted.
- Project: https://github.com/octaviopardo/EBGaramond12 /
  https://fonts.google.com/specimen/EB+Garamond
- Files vendored under `src/assets/fonts/` (Latin subset, woff2):
  - `eb-garamond-latin-400.woff2` — regular
  - `eb-garamond-latin-400-italic.woff2` — italic
  - `eb-garamond-latin-600.woff2` — semibold
- Source of the subset woff2: the `@fontsource/eb-garamond` distribution
  (jsDelivr `fontsource` CDN), fetched once during development. Total ~75 KB.

The app references these via `@font-face` in `src/index.css`. If the font ever
fails to load, the CSS falls back to a system serif stack
(`"Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Cardo", Georgia,
"Times New Roman", serif`).

No fonts are fetched at runtime.
