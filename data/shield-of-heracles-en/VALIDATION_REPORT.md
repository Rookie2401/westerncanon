# Hesiod validation report - shield-of-heracles-en

Generated: 2026-09-18T03:39:14.939Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 13
- passages: 13
- total passage chars: 25749

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–38 | 1997 |
| 1 | sec-2 | 2 | 39–77 | 2090 |
| 2 | sec-3 | 3 | 78–114 | 1938 |
| 3 | sec-4 | 4 | 115–153 | 2054 |
| 4 | sec-5 | 5 | 154–177 | 1315 |
| 5 | sec-6 | 6 | 178–215 | 2178 |
| 6 | sec-7 | 7 | 216–244 | 1542 |
| 7 | sec-8 | 8 | 245–279 | 1869 |
| 8 | sec-9 | 9 | 280–326 | 2664 |
| 9 | sec-10 | 10 | 327–364 | 1970 |
| 10 | sec-11 | 11 | 365–401 | 1966 |
| 11 | sec-12 | 12 | 402–442 | 2121 |
| 12 | sec-13 | 13 | 443–480 | 2045 |

Companion work `shield-of-heracles-grc`: 13 divisions / 13 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "Or like her who left home and country and came to Thebes"
  - got: `Or like her who left home and country and came to Thebes, fo`
- OK - final card (sec-13) ends "that any might bring to Phyto."
  - got: `ly despoil the rich hecatombs that any might bring to Phyto.`

## Anomalies (preserved, not corrected)

- **shield-of-heracles-en / source structure deviation** - As with theogony-en and works-and-days-en, the source carries NO <p> anywhere: the body is a bare stream of <l n="N"> reference-anchor elements carrying ordinary prose, threaded with <milestone unit="card"> markers. Each card is imported as one continuous prose block by walking the whole text stream token-by-token and cutting at each milestone.
- **shield-of-heracles-en / card boundary source** - This file's own 13 <milestone unit="card"> markers were cross-checked against the shared cardBoundaries table (itself matching this work's Greek witness's own native card milestones) and match exactly.
- **shield-of-heracles-en / <note> footnotes dropped** - 6 <note resp="Loeb" ...> element(s) - Evelyn-White's own translator's footnotes, not the poem's text - were dropped wholesale, matching this repo's established <note> convention (see e.g. import-euclid-en). Each drop was replaced with a single space to guard against words merging across the cut.
- **shield-of-heracles-en / inline <placeName> unwrapped** - Occurrences of <placeName> wrapping ordinary reading-text words were unwrapped, keeping the text; verified by direct inspection that every occurrence outside a dropped <note> sits at a whitespace/punctuation boundary on both sides.
- **shield-of-heracles-en / Division.ref** - Division.ref gives the underlying Greek verse line range for each card, since Evelyn-White's prose translation carries no line numbers of its own. This is the same range printed in the companion shield-of-heracles-grc work.
- **shield-of-heracles-en / completeness** - All 13 cards present and in order, from the incipit through the poem's final card. No truncation.

## Errors

_none_

## Warnings

_none_
