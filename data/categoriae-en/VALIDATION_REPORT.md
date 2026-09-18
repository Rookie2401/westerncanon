# categoriae-en validation report

Generated: 2026-09-18T00:25:09.388Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions: 15
- passages: 140
- total passage chars: 81501

## Per-division

| # | id | number | ref | passages | chars |
|---|----|--------|-----|----------|-------|
| 0 | ch-1 | 1 | Bekker 1a1–1a15 | 3 | 1142 |
| 1 | ch-2 | 2 | Bekker 1a15–1b5 | 6 | 1413 |
| 2 | ch-3 | 3 | Bekker 1b5–1b20 | 3 | 961 |
| 3 | ch-4 | 4 | Bekker 1b20–2a10 | 2 | 1017 |
| 4 | ch-5 | 5 | Bekker 2a10–4b15 | 23 | 14657 |
| 5 | ch-6 | 6 | Bekker 4b15–6a35 | 15 | 9292 |
| 6 | ch-7 | 7 | Bekker 6a35–8b20 | 19 | 14187 |
| 7 | ch-8 | 8 | Bekker 8b20–11a35 | 26 | 14101 |
| 8 | ch-9 | 9 | Bekker 11a35–11b10 | 3 | 918 |
| 9 | ch-10 | 10 | Bekker 11b10–13b35 | 19 | 13468 |
| 10 | ch-11 | 11 | Bekker 13b35–14a25 | 4 | 1721 |
| 11 | ch-12 | 12 | Bekker 14a25–14b20 | 7 | 2473 |
| 12 | ch-13 | 13 | Bekker 14b20–15a10 | 4 | 2338 |
| 13 | ch-14 | 14 | Bekker 15a10–15b15 | 4 | 2628 |
| 14 | ch-15 | 15 | Bekker 15b15–15b30 | 2 | 1185 |

## Verbatim spot-check

- OK - ch-1 passage[0] starts "Things are said to be named 'equivocally' when, th..."
  - got: `Things are said to be named 'equivocally' when, though they have a common name, `
- OK - final chapter (ch-15) ends "...t the most ordinary ones have all been enumerated."
  - got: `ord might perhaps be found, but the most ordinary ones have all been enumerated.`

## Anomalies (preserved, not corrected)

- **categoriae-en / refs** - Unlike categoriae-grc and categoriae-la, this source prints Bekker page/column anchors and a line-number marker every 5th line, inline throughout. Division.ref is reconstructed from them as "Bekker <start>–<end>", where <end> is the position in effect at the moment the next chapter begins (continuous numbering; not gapped) and is precise only to the nearest printed marker. Passage.ref is left null throughout — no marker is printed at every paragraph break, so no per-passage Bekker reference is fabricated. In the standard pagination the work occupies Bekker 1a1–15b33; the markers actually printed in this source run 1a1–15b30 (a few lines short of the canonical end — line numbers are only printed every 5th line and the work’s last few lines fall after the final printed marker).
- **categoriae-en / footnotes stripped** - 35 inline footnote markers (Ross's editorial annotation) were removed from the reading text; the footnotes themselves are translator/editorial apparatus, not Aristotle's text, and are not preserved anywhere in this build.
- **categoriae-en / table of contents and preface excluded** - The page also carries an editorial "TABLE OF CONTENTS" transclusion (one-line chapter summaries with anchor links, in a separate reading-text block from the one used here) and a translator’s prefatory note. Neither is Aristotle’s text; neither is read by this importer.
- **categoriae-en / bekker markers** - Source transcription irregularity, preserved as printed (not corrected): ch7: line marker "10" does not increase from previous "6b10".
- **categoriae-en / completeness** - All 15 chapters are present and in order, from the verbatim incipit to the verbatim explicit. The imported reading text is the English Wikisource transcription of "The Works of Aristotle/Categories" with transport scaffolding removed; no paragraph is dropped, merged or reordered.

## Errors

_none_

## Warnings

_none_
