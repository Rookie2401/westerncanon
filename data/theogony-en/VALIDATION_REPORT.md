# Hesiod validation report - theogony-en

Generated: 2026-09-18T21:33:10.398Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 32
- passages: 32
- total passage chars: 55031

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–28 | 1425 |
| 1 | sec-2 | 2 | 29–52 | 1398 |
| 2 | sec-3 | 3 | 53–62 | 537 |
| 3 | sec-4 | 4 | 63–103 | 2242 |
| 4 | sec-5 | 5 | 104–138 | 1852 |
| 5 | sec-6 | 6 | 139–172 | 1784 |
| 6 | sec-7 | 7 | 173–206 | 1825 |
| 7 | sec-8 | 8 | 207–239 | 1622 |
| 8 | sec-9 | 9 | 240–269 | 1354 |
| 9 | sec-10 | 10 | 270–303 | 1890 |
| 10 | sec-11 | 11 | 304–336 | 1726 |
| 11 | sec-12 | 12 | 337–370 | 1622 |
| 12 | sec-13 | 13 | 371–403 | 1796 |
| 13 | sec-14 | 14 | 404–452 | 2622 |
| 14 | sec-15 | 15 | 453–491 | 2100 |
| 15 | sec-16 | 16 | 492–506 | 821 |
| 16 | sec-17 | 17 | 507–544 | 2111 |
| 17 | sec-18 | 18 | 545–584 | 2121 |
| 18 | sec-19 | 19 | 585–616 | 1774 |
| 19 | sec-20 | 20 | 617–653 | 1945 |
| 20 | sec-21 | 21 | 654–686 | 1795 |
| 21 | sec-22 | 22 | 687–728 | 2245 |
| 22 | sec-23 | 23 | 729–766 | 1987 |
| 23 | sec-24 | 24 | 767–806 | 2147 |
| 24 | sec-25 | 25 | 807–819 | 605 |
| 25 | sec-26 | 26 | 820–852 | 1858 |
| 26 | sec-27 | 27 | 853–885 | 1705 |
| 27 | sec-28 | 28 | 886–900 | 734 |
| 28 | sec-29 | 29 | 901–937 | 3090 |
| 29 | sec-30 | 30 | 938–962 | 1265 |
| 30 | sec-31 | 31 | 963–1002 | 2023 |
| 31 | sec-32 | 32 | 1003–1022 | 1010 |

Companion work `theogony-grc`: 32 divisions / 32 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "From the Heliconian Muses let us begin to sing"
  - got: `From the Heliconian Muses let us begin to sing, who hold the`
- OK - final card (sec-32) ends "sing of the company of women."
  - got: `s of Zeus who holds the aegis, sing of the company of women.`

## Anomalies (preserved, not corrected)

- **theogony-en / source structure deviation** - The importer was originally planned around <p> paragraphs with inline <milestone> card breaks (mirroring this repo's Homer-style English encoding). The actual source carries NO <p> anywhere: the body is a bare stream of <l n="N"> "line group" elements (reference anchors spaced roughly every 5 Greek lines, not real verse lines - Evelyn-White's translation is ordinary prose) with <milestone unit="card"> markers threaded through it, sometimes at an <l> boundary and sometimes mid-<l>. Each card is therefore imported as ONE continuous prose block (there is no source paragraph division to join with "\n\n"), built by walking the whole text stream token-by-token and cutting at each milestone regardless of which <l> it falls inside.
- **theogony-en / card boundary source** - This file's own 32 <milestone unit="card"> markers ARE the canonical card boundaries (their n values equal the Greek starting line number of each card) - used both for this English work and, via the shared cardBoundaries table, cross-checked against and reused for the Greek work of the same title.
- **theogony-en / <note> footnotes dropped** - 32 <note resp="Loeb" ...> element(s) - Evelyn-White's own translator's footnotes, not Hesiod's text - were dropped wholesale, matching this repo's established <note> convention (see e.g. import-euclid-en). Each drop was replaced with a single space to guard against words merging across the cut (verified: several notes abut reading-text words with no surrounding whitespace in the source).
- **theogony-en / inline <placeName> unwrapped** - Occurrences of <placeName> wrapping ordinary reading-text words (e.g. "Olympus") were unwrapped, keeping the text; every occurrence outside a dropped <note> sits at a whitespace/punctuation boundary on both sides (verified by direct inspection), so no word-merging risk. <foreign> and <hi> occur only inside dropped <note> blocks in this file and needed no separate handling.
- **theogony-en / Division.ref** - Division.ref gives the underlying Greek verse line range for each card (e.g. "1–28"), since Evelyn-White's prose translation carries no line numbers of its own. This is the same range printed in the companion theogony-grc work, so the two witnesses' cards can be read side by side.
- **theogony-en / completeness** - All 32 cards present and in order, from the incipit through the poem's final card. No truncation.

## Errors

_none_

## Warnings

_none_
