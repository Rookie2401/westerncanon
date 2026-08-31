# Aristotle validation report - categoriae-grc

Generated: 2026-08-31T05:18:35.458Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions: 15
- passages: 66
- total passage chars: 59673
- ref scheme: chapter (Bekker page/column/line not marked in the digital source; the work spans Bekker 1a1–15b33)

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | ch-1 | 1 | - | 1 | 770 |
| 1 | ch-2 | 2 | - | 2 | 1252 |
| 2 | ch-3 | 3 | - | 2 | 778 |
| 3 | ch-4 | 4 | - | 1 | 835 |
| 4 | ch-5 | 5 | - | 9 | 10728 |
| 5 | ch-6 | 6 | - | 7 | 7036 |
| 6 | ch-7 | 7 | - | 6 | 9930 |
| 7 | ch-8 | 8 | - | 10 | 10419 |
| 8 | ch-9 | 9 | - | 2 | 748 |
| 9 | ch-10 | 10 | - | 9 | 9622 |
| 10 | ch-11 | 11 | - | 4 | 1399 |
| 11 | ch-12 | 12 | - | 4 | 1939 |
| 12 | ch-13 | 13 | - | 3 | 1431 |
| 13 | ch-14 | 14 | - | 3 | 1948 |
| 14 | ch-15 | 15 | - | 3 | 838 |

Companion work `de-interpretatione-grc`: 14 divisions / 40 passages; division id sets DIFFER.
Companion work `categoriae-la`: 15 divisions / 99 passages; division id sets MATCH 1:1.
Companion work `de-interpretatione-la`: 14 divisions / 50 passages; division id sets DIFFER.

## Verbatim spot-check

- OK - ch-1 passage[0] starts "ὉΜΩΝΥΜΑ λέγεται ὧν ὄνομα μόνον κοινόν"
  - got: `ὉΜΩΝΥΜΑ λέγεται ὧν ὄνομα μόνον κοινόν, ὁ δὲ κατὰ τοὔνομα λόγ`
- OK - final chapter (ch-15) ends "οἱ δὲ εἰωθότες λέγεσθαι σχεδὸν ἅπαντες κατηρίθμηνται."
  - got: `ρόποι· οἱ δὲ εἰωθότες λέγεσθαι σχεδὸν ἅπαντες κατηρίθμηνται.`

## Anomalies (preserved, not corrected)

- **categoriae-grc / refs** - source TEI marks chapter divisions only; no Bekker page/column/line milestones and no <lb>, and the <pb> markers are 1837 Oxford Opera page images, not Bekker pages, and were dropped. Division.ref and Passage.ref are null and Passage.n is "" throughout; cite by chapter. The work spans Bekker 1a1–15b33 in the standard pagination.
- **categoriae-grc / ch-1 head** - the <head> in chapter 1 ("ΚΑΤΗΓΟΡΙΑΙ.") is the work title, not a chapter heading; it is not stored as sourceHeading (every Greek chapter sourceHeading is null).
- **categoriae-grc / ch-1 incipit** - chapter 1 opens with the all-caps word "ὉΜΩΝΥΜΑ" in the source transcription; preserved verbatim.
- **categoriae-grc / empty <p>** - 0 <p> element(s) were empty after stripping transport markup and were skipped (no reading text dropped).
- **categoriae-grc / character encoding** - The source uses the precomposed "oxia" polytonic code points (U+1F71 etc.) rather than the canonically-equivalent monotonic "tonos" code points (U+03AC etc.). Bytes are kept verbatim: no combining-mark sequences, no accent/breathing loss, canonically equivalent to NFC. No normalisation applied.
- **categoriae-grc / completeness** - All 15 chapters present and in order; reading text is byte-for-byte identical to the First1KGreek <p> paragraphs (transport scaffolding removed). Final chapter ends "…κατηρίθμηνται." (Bekker 1a1–15b33).

## Errors

_none_

## Warnings

_none_
