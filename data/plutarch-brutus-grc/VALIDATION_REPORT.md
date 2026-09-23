# Plutarch validation report - plutarch-brutus-grc

Generated: 2026-09-23T04:39:16.617Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg061
- chapters: 53
- passages: 53
- total passage chars: 79145
- Loeb vol. VI (1918)

## Anomalies (preserved, not corrected)

- **plutarch-brutus-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-brutus-grc / apparatus excluded** - 9 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-brutus-grc / structural markers dropped** - 87 <pb/> page-break marker(s) and 25 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-brutus-grc / ch-14** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 1 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
