# Plutarch validation report - plutarch-pyrrhus-grc

Generated: 2026-09-23T04:39:16.607Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg030
- chapters: 34
- passages: 34
- total passage chars: 72265
- Loeb vol. IX (1920)

## Anomalies (preserved, not corrected)

- **plutarch-pyrrhus-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-pyrrhus-grc / apparatus excluded** - 17 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-pyrrhus-grc / structural markers dropped** - 82 <pb/> page-break marker(s) and 30 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-pyrrhus-grc / ch-7** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-pyrrhus-grc / ch-29** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 2 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
