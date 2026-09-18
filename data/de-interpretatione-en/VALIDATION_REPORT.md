# de-interpretatione-en validation report

Generated: 2026-09-18T01:09:23.037Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions: 14
- passages: 120
- total passage chars: 55175

## Per-division

| # | id | number | ref | passages | chars |
|---|----|--------|-----|----------|-------|
| 0 | ch-1 | 1 | Bekker 16a1–16a15 | 3 | 1167 |
| 1 | ch-2 | 2 | Bekker 16a15–16b5 | 4 | 1502 |
| 2 | ch-3 | 3 | Bekker 16b5–16b25 | 6 | 1603 |
| 3 | ch-4 | 4 | Bekker 16b25–17a5 | 3 | 1233 |
| 4 | ch-5 | 5 | Bekker 17a5–17a20 | 5 | 1509 |
| 5 | ch-6 | 6 | Bekker 17a20–17a35 | 3 | 869 |
| 6 | ch-7 | 7 | Bekker 17a35–18a10 | 11 | 4733 |
| 7 | ch-8 | 8 | Bekker 18a10–18a25 | 2 | 1270 |
| 8 | ch-9 | 9 | Bekker 18a25–19b1 | 12 | 8359 |
| 9 | ch-10 | 10 | Bekker 19b1–20b10 | 18 | 7008 |
| 10 | ch-11 | 11 | Bekker 20b10–21a30 | 12 | 5758 |
| 11 | ch-12 | 12 | Bekker 21a30–22a10 | 13 | 4652 |
| 12 | ch-13 | 13 | Bekker 22a10–23a25 | 15 | 8559 |
| 13 | ch-14 | 14 | Bekker 23a25–24b5 | 13 | 6953 |

## Verbatim spot-check

- OK - ch-1 passage[0] starts "First we must define the terms 'noun' and 'verb', ..."
  - got: `First we must define the terms 'noun' and 'verb', then the terms 'denial' and 'a`
- OK - final chapter (ch-14) ends "...sist at one and the same time in the same subject."
  - got: `contrary conditions cannot subsist at one and the same time in the same subject.`

## Anomalies (preserved, not corrected)

- **de-interpretatione-en / ch-10 / passage 5** - a scanned-page diagram (The Works of Aristotle, Volume 1 - p74-a.png) follows this passage in the printed edition; no transcribed text exists for it in the source and no image is bundled here (this build stays fully offline without a separate asset-review pass) — recorded as an honest Passage.figure marker (source + note, no image), nothing fabricated.
- **de-interpretatione-en / ch-10 / passage 6** - a scanned-page diagram (The Works of Aristotle, Volume 1 - p74-b.png) follows this passage in the printed edition; no transcribed text exists for it in the source and no image is bundled here (this build stays fully offline without a separate asset-review pass) — recorded as an honest Passage.figure marker (source + note, no image), nothing fabricated.
- **de-interpretatione-en / ch-10 / passage 8** - a scanned-page diagram (The Works of Aristotle, Volume 1 - p75.png) follows this passage in the printed edition; no transcribed text exists for it in the source and no image is bundled here (this build stays fully offline without a separate asset-review pass) — recorded as an honest Passage.figure marker (source + note, no image), nothing fabricated.
- **de-interpretatione-en / ch-12 / passage 12** - source prints this passage as an HTML <table>, not running prose; flattened to plain text (cells joined " — ", rows joined " / ", left-to-right/top-to-bottom, nothing reordered or reworded) because Passage.text has no table field. Genuine argument content (the prose introduces it as "a table"), not apparatus.
- **de-interpretatione-en / ch-13 / passage 3** - source prints this passage as an HTML <table>, not running prose; flattened to plain text (cells joined " — ", rows joined " / ", left-to-right/top-to-bottom, nothing reordered or reworded) because Passage.text has no table field. Genuine argument content (the prose introduces it as "a table"), not apparatus.
- **de-interpretatione-en / refs** - Unlike de-interpretatione-grc and de-interpretatione-la, this source prints Bekker page/column anchors and a line-number marker every 5th line, inline throughout. Division.ref is reconstructed from them as "Bekker <start>–<end>", where <end> is the position in effect at the moment the next chapter begins (continuous numbering; not gapped) and is precise only to the nearest printed marker. Passage.ref is left null throughout — no marker is printed at every paragraph break, so no per-passage Bekker reference is fabricated. In the standard pagination the work occupies Bekker 16a1–24b9; the markers actually printed in this source run 16a1–24b5 (a few lines short of the canonical end — line numbers are only printed every 5th line and the work’s last few lines fall after the final printed marker).
- **de-interpretatione-en / footnotes stripped** - 67 inline footnote markers (Ross's editorial annotation) were removed from the reading text; the footnotes themselves are translator/editorial apparatus, not Aristotle's text, and are not preserved anywhere in this build.
- **de-interpretatione-en / table of contents and preface excluded** - The page also carries an editorial "TABLE OF CONTENTS" transclusion (one-line chapter summaries with anchor links, in a separate reading-text block from the one used here) and a translator’s prefatory note. Neither is Aristotle’s text; neither is read by this importer.
- **de-interpretatione-en / bekker markers** - Source transcription irregularity, preserved as printed (not corrected): ch3: line marker "5" does not increase from previous "16b10".
- **de-interpretatione-en / bekker markers** - Source transcription irregularity, preserved as printed (not corrected): ch12: line marker "15" does not increase from previous "21b30".
- **de-interpretatione-en / empty spacer paragraph** - 1 formatting-only "<p><br></p>" spacer (immediately after the chapter-12 table) was skipped; it carries no reading text.
- **de-interpretatione-en / completeness** - All 14 chapters are present and in order, from the verbatim incipit to the verbatim explicit. The imported reading text is the English Wikisource transcription of "The Works of Aristotle/On Interpretation" with transport scaffolding removed; no paragraph is dropped, merged or reordered.

## Errors

_none_

## Warnings

_none_
