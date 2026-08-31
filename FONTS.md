# Bundled typefaces

Two open-licensed serif families are bundled; nothing is fetched at runtime.
Latin-script works use **EB Garamond**; Greek-language works (the Greek
*Isagoge*) use **Gentium Plus** for the Greek and polytonic ranges and fall
back to EB Garamond for Latin punctuation inside a Greek run, so the two
languages sit at a consistent size and colour.

## EB Garamond (Latin)

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

## Gentium Plus (Greek / polytonic)

**Gentium Plus** — a serif with full polytonic Greek coverage, by Victor
Gaultney / SIL International.

- License: SIL Open Font License, Version 1.1 (OFL). The full licence text is
  vendored at `src/assets/fonts/gentium-plus-OFL.txt`.
- Project: https://software.sil.org/gentium/ /
  https://fonts.google.com/specimen/Gentium+Plus
- Files vendored under `src/assets/fonts/` (woff2), split into the monotonic
  Greek block and the Greek Extended / polytonic block by `unicode-range` so
  only the needed file loads for a given run:
  - `gentium-plus-greek-400.woff2`, `gentium-plus-greekext-400.woff2` — regular
  - `gentium-plus-greek-400-italic.woff2`, `gentium-plus-greekext-400-italic.woff2` — italic
  - `gentium-plus-greek-700.woff2`, `gentium-plus-greekext-700.woff2` — bold
  - `unicode-range`: `U+0370-03FF` (Greek) and `U+0300-036F, U+1F00-1FFF`
    (combining marks + Greek Extended, where precomposed polytonic letters live)
- Source of the subset woff2: the `@fontsource/gentium-plus@5` distribution
  (jsDelivr `fontsource` CDN), `greek` + `greek-ext` subsets, fetched once
  during development. Total ~80 KB.
- Applied via `--serif-grc` in `src/index.css` and the `.reader__prose--grc`
  / `[lang="grc"]` selectors. Greek runs are tagged `lang="grc"`; Latin runs
  are **never** tagged `lang="la"` (see the `locl` note below).

### Greek `locl` / `calt` check

Gentium Plus's own `locl` behaviour (final-sigma shaping etc.) is correct and
wanted, so nothing is disabled for Greek. The body-level
`font-feature-settings: … 'locl' 0` remains, aimed only at EB Garamond's
Latin `locl` (u→v / j→i); it does not affect Greek shaping. Greek glyphs only
ever come from Gentium Plus (the `@font-face` blocks map only the Greek
ranges), so a stray or absent `lang` tag cannot change Greek shaping. The
generic reader tags Greek prose `lang="grc"` and never emits `lang="la"`.
A render test asserts the `lang="grc"` prose block and the absence of
`lang="la"`; a polytonic pass on a physical device (breathings, iota
subscript, circumflex, iPhone width, both themes) is still a manual check —
see the deploy notes.

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
