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

## Known issue / future follow-up: `locl` classical letterforms

EB Garamond ships a `locl` (localized-forms) GSUB feature that, for text runs
tagged `lang="la"`, substitutes classical epigraphic forms (u->v, j->i) so
`Quia igitur` *renders* as `Qvia igitvr`. The underlying characters are
unchanged.

Current mitigation (sufficient in practice):
- All `lang="la"` attributes were removed from the markup so the feature is
  never triggered. See the reader screens.
- `src/index.css` `body` keeps `font-feature-settings: ... 'locl' 0` plus
  `font-variant-alternates: normal` as defense-in-depth for engines that would
  otherwise honor a stray language tag.

Not done: physically stripping the `locl` feature from the vendored `.woff2`
files. `fonttools`/Python is unavailable in this environment, and a clean
Node-only path (decompress woff2 -> edit GSUB -> recompress) was judged a
rabbit hole not worth it given the markup fix already prevents the
substitution. If the fonts are ever re-subset, drop `locl` from the GSUB
table at that point (e.g. `pyftsubset --layout-features-='locl'`).
