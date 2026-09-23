# Plutarch validation report - plutarch-cimon-grc

Generated: 2026-09-23T04:39:16.609Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg035
- chapters: 19
- passages: 19
- total passage chars: 39227
- Loeb vol. II (1914)

## Anomalies (preserved, not corrected)

- **plutarch-cimon-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-cimon-grc / apparatus excluded** - 10 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-cimon-grc / structural markers dropped** - 0 <pb/> page-break marker(s) and 0 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-cimon-grc / ch-4** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-cimon-grc / ch-10** - <gap reason="lost"/> x1: a lacuna in the source; no text supplied.
- **plutarch-cimon-grc / ch-18** - <gap reason="lost"/> x2: a lacuna in the source; no text supplied.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 1 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
