# Plutarch validation report - plutarch-caius-marius-grc

Generated: 2026-09-23T04:39:16.607Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg031
- chapters: 46
- passages: 46
- total passage chars: 85519
- Loeb vol. IX (1920)

## Anomalies (preserved, not corrected)

- **plutarch-caius-marius-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-caius-marius-grc / apparatus excluded** - 10 <note> element(s) and 0 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-caius-marius-grc / structural markers dropped** - 95 <pb/> page-break marker(s) and 10 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-caius-marius-grc / ch-6** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-caius-marius-grc / ch-33** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.
- **plutarch-caius-marius-grc / ch-35** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 3 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
