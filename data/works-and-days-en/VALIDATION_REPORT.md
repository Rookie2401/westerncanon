# Hesiod validation report - works-and-days-en

Generated: 2026-09-18T21:33:10.399Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 26
- passages: 26
- total passage chars: 45710

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–10 | 550 |
| 1 | sec-2 | 2 | 11–41 | 1862 |
| 2 | sec-3 | 3 | 42–58 | 938 |
| 3 | sec-4 | 4 | 59–82 | 1276 |
| 4 | sec-5 | 5 | 83–108 | 1430 |
| 5 | sec-6 | 6 | 109–139 | 1762 |
| 6 | sec-7 | 7 | 140–173 | 2067 |
| 7 | sec-8 | 8 | 174–201 | 1645 |
| 8 | sec-9 | 9 | 202–237 | 2185 |
| 9 | sec-10 | 10 | 238–273 | 1995 |
| 10 | sec-11 | 11 | 274–319 | 2412 |
| 11 | sec-12 | 12 | 320–369 | 2808 |
| 12 | sec-13 | 13 | 370–404 | 1758 |
| 13 | sec-14 | 14 | 405–447 | 2474 |
| 14 | sec-15 | 15 | 448–478 | 1851 |
| 15 | sec-16 | 16 | 479–503 | 1226 |
| 16 | sec-17 | 17 | 504–535 | 1794 |
| 17 | sec-18 | 18 | 536–570 | 1757 |
| 18 | sec-19 | 19 | 571–608 | 2006 |
| 19 | sec-20 | 20 | 609–640 | 1669 |
| 20 | sec-21 | 21 | 641–677 | 1975 |
| 21 | sec-22 | 22 | 678–705 | 1495 |
| 22 | sec-23 | 23 | 706–736 | 1694 |
| 23 | sec-24 | 24 | 737–764 | 1517 |
| 24 | sec-25 | 25 | 765–799 | 1914 |
| 25 | sec-26 | 26 | 800–828 | 1650 |

Companion work `works-and-days-grc`: 26 divisions / 26 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "Muses of Pieria who give glory through song"
  - got: `Muses of Pieria who give glory through song, come hither, te`
- OK - final card (sec-26) ends "who discerns the omens of birds and avoids transgression."
  - got: `s, who discerns the omens of birds and avoids transgression.`

## Anomalies (preserved, not corrected)

- **works-and-days-en / source structure deviation** - As with theogony-en, the source carries NO <p> anywhere (a departure from the originally-assumed <p>-paragraph structure): the body is a bare stream of <l n="N"> reference-anchor elements carrying ordinary prose, threaded with <milestone unit="card"> markers. Each card is imported as one continuous prose block by walking the whole text stream token-by-token and cutting at each milestone.
- **works-and-days-en / card boundary source** - This file's own 26 <milestone unit="card"> markers were cross-checked against the shared cardBoundaries table (itself matching this work's Greek witness's own native card milestones) and match exactly.
- **works-and-days-en / <note> footnotes dropped** - 41 <note resp="Loeb" ...> element(s) - Evelyn-White's own translator's footnotes, not Hesiod's text - were dropped wholesale, matching this repo's established <note> convention (see e.g. import-euclid-en). Each drop was replaced with a single space to guard against words merging across the cut.
- **works-and-days-en / inline <placeName> unwrapped** - Occurrences of <placeName> wrapping ordinary reading-text words were unwrapped, keeping the text; verified by direct inspection that every occurrence outside a dropped <note> sits at a whitespace/punctuation boundary on both sides.
- **works-and-days-en / Division.ref** - Division.ref gives the underlying Greek verse line range for each card, since Evelyn-White's prose translation carries no line numbers of its own. This is the same range printed in the companion works-and-days-grc work.
- **works-and-days-en / completeness** - All 26 cards present and in order, from the incipit through the poem's final card. No truncation.

## Errors

_none_

## Warnings

_none_
