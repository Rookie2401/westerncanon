# Plutarch validation report - plutarch-pompey-grc

Generated: 2026-09-23T04:39:16.612Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg045
- chapters: 80
- passages: 80
- total passage chars: 134925
- Loeb vol. V (1917)

## Anomalies (preserved, not corrected)

- **plutarch-pompey-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-pompey-grc / apparatus excluded** - 15 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-pompey-grc / structural markers dropped** - 148 <pb/> page-break marker(s) and 11 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-pompey-grc / ch-73** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 1 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
