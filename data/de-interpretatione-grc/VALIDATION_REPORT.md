# Aristotle validation report - de-interpretatione-grc

Generated: 2026-08-31T19:59:19.075Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions: 14
- passages: 40
- total passage chars: 35471
- ref scheme: chapter (Bekker page/column/line not marked in the digital source; the work spans Bekker 16a1–24b9)

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | ch-1 | 1 | - | 2 | 947 |
| 1 | ch-2 | 2 | - | 2 | 1076 |
| 2 | ch-3 | 3 | - | 3 | 1052 |
| 3 | ch-4 | 4 | - | 2 | 764 |
| 4 | ch-5 | 5 | - | 1 | 906 |
| 5 | ch-6 | 6 | - | 1 | 649 |
| 6 | ch-7 | 7 | - | 3 | 2980 |
| 7 | ch-8 | 8 | - | 1 | 842 |
| 8 | ch-9 | 9 | - | 4 | 5257 |
| 9 | ch-10 | 10 | - | 4 | 4983 |
| 10 | ch-11 | 11 | - | 3 | 3419 |
| 11 | ch-12 | 12 | - | 1 | 3364 |
| 12 | ch-13 | 13 | - | 12 | 5030 |
| 13 | ch-14 | 14 | - | 1 | 4202 |

Companion work `categoriae-grc`: 15 divisions / 66 passages; division id sets DIFFER.
Companion work `categoriae-la`: 15 divisions / 99 passages; division id sets DIFFER.
Companion work `de-interpretatione-la`: 14 divisions / 50 passages; division id sets MATCH 1:1.

## Verbatim spot-check

- OK - ch-1 passage[0] starts "ΠΡΩΤΟΝ δεῖ θέσθαι τί ὄνομα καὶ τί ῥῆμα"
  - got: `ΠΡΩΤΟΝ δεῖ θέσθαι τί ὄνομα καὶ τί ῥῆμα, ἔπειτα τί ἐστιν ἀπόφ`
- OK - final chapter (ch-14) ends "ἅμα δὲ οὐκ ἐνδέχεται τὰ ἐναντία ὑπάρχειν τῷ αὐτῷ."
  - got: `τὸν αὐτόν· ἅμα δὲ οὐκ ἐνδέχεται τὰ ἐναντία ὑπάρχειν τῷ αὐτῷ.`

## Anomalies (preserved, not corrected)

- **de-interpretatione-grc / refs** - source TEI marks chapter divisions only; no Bekker page/column/line milestones and no <lb>, and the <pb> markers are 1837 Oxford Opera page images, not Bekker pages, and were dropped. Division.ref and Passage.ref are null and Passage.n is "" throughout; cite by chapter. The work spans Bekker 16a1–24b9 in the standard pagination.
- **de-interpretatione-grc / ch-1 head** - the <head> in chapter 1 ("ΠΕΡΙ ΕΡΜΗΝΕΙΑΣ.") is the work title, not a chapter heading; it is not stored as sourceHeading (every Greek chapter sourceHeading is null).
- **de-interpretatione-grc / ch-1 incipit** - chapter 1 opens with the all-caps word "ΠΡΩΤΟΝ" in the source transcription; preserved verbatim.
- **de-interpretatione-grc / empty <p>** - 0 <p> element(s) were empty after stripping transport markup and were skipped (no reading text dropped).
- **de-interpretatione-grc / character encoding** - The source uses the precomposed "oxia" polytonic code points (U+1F71 etc.) rather than the canonically-equivalent monotonic "tonos" code points (U+03AC etc.). Bytes are kept verbatim: no combining-mark sequences, no accent/breathing loss, canonically equivalent to NFC. No normalisation applied.
- **de-interpretatione-grc / completeness** - All 14 chapters present and in order; reading text is byte-for-byte identical to the First1KGreek <p> paragraphs (transport scaffolding removed). Final chapter ends "…ὑπάρχειν τῷ αὐτῷ." (Bekker 16a1–24b9).

## Errors

_none_

## Warnings

_none_
