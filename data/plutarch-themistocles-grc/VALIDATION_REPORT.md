# Plutarch validation report - plutarch-themistocles-grc

Generated: 2026-09-23T04:39:16.599Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- tlg: tlg010
- chapters: 32
- passages: 32
- total passage chars: 53054
- Loeb vol. II (1914)

## Anomalies (preserved, not corrected)

- **plutarch-themistocles-grc / character encoding** - Unicode NFC normalisation was applied to all extracted reading text (0 code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).
- **plutarch-themistocles-grc / apparatus excluded** - 27 <note> element(s) and 4 <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.
- **plutarch-themistocles-grc / structural markers dropped** - 0 <pb/> page-break marker(s) and 0 <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").
- **plutarch-themistocles-grc / ch-4** - <add> editorial supplement included in reading text: "μακρὰν γὰρ ἦσαν οὗτοι καὶ δέος οὐ πάνυ βέβαιον ὡς ἀφιξόμενοι παρεῖχον"
- **plutarch-themistocles-grc / ch-32** - This chapter's text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.

## Errors

_none_

## Warnings

- **[combining-marks-preserved]** 1 string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.
