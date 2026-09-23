# Plutarch validation report - plutarch-antony-grc

Generated: 2026-09-23T04:39:16.616Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg058
- chapters: 87
- passages: 87
- total passage chars: 124773
- Loeb vol. IX (1920)

## Anomalies (preserved, not corrected)

- **plutarch-antony-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-antony-grc / apparatus excluded** - 9 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-antony-grc / structural markers dropped** - 98 <pb/> page-break marker(s) and 33 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-antony-grc / ch-7** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-antony-grc / ch-22** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-antony-grc / ch-32** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-antony-grc / ch-69** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-antony-grc / ch-86** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 5 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
