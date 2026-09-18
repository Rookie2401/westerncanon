# Hesiod validation report - shield-of-heracles-grc

Generated: 2026-09-18T21:33:10.399Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 13
- passages: 13
- total passage chars: 21087

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–38 | 1639 |
| 1 | sec-2 | 2 | 39–77 | 1700 |
| 2 | sec-3 | 3 | 78–114 | 1623 |
| 3 | sec-4 | 4 | 115–153 | 1685 |
| 4 | sec-5 | 5 | 154–177 | 1090 |
| 5 | sec-6 | 6 | 178–215 | 1650 |
| 6 | sec-7 | 7 | 216–244 | 1286 |
| 7 | sec-8 | 8 | 245–279 | 1583 |
| 8 | sec-9 | 9 | 280–326 | 2073 |
| 9 | sec-10 | 10 | 327–364 | 1669 |
| 10 | sec-11 | 11 | 365–401 | 1644 |
| 11 | sec-12 | 12 | 402–442 | 1794 |
| 12 | sec-13 | 13 | 443–480 | 1651 |

Companion work `shield-of-heracles-en`: 13 divisions / 13 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "ἢ οἵη προλιποῦσα δόμους καὶ πατρίδα γαῖαν"
  - got: `ἢ οἵη προλιποῦσα δόμους καὶ πατρίδα γαῖαν
ἤλυθεν ἐς Θήβας με`
- OK - final card (sec-13) ends "ὅστις ἄγοι Πυθοῖδε βίῃ σύλασκε δοκεύων."
  - got: `ῥα κλειτὰς ἑκατόμβας
ὅστις ἄγοι Πυθοῖδε βίῃ σύλασκε δοκεύων.`

## Anomalies (preserved, not corrected)

- **shield-of-heracles-grc / card boundary derivation** - This Greek file carries its own native <milestone unit="card"> markers (13 of them, attribute order "ed... n... unit..."). They were cross-checked at import time against the shared cardBoundaries table and match exactly, byte for byte.
- **shield-of-heracles-grc / <del> editorial bracketing** - 6 line(s) contain 6 <del>...</del> span(s) in the source XML (editorial athetesis, n="203", "204", "205", "209", "210", "211"). Per this repo's "never content" rule these are KEPT verbatim in the reading text - only the <del>/</del> tags themselves are stripped. This file has no <add> or <gap> elements.
- **shield-of-heracles-grc / completeness** - All 13 cards present and in order, spanning the full line numbering 1-480. Incipit and explicit verified against the printed text.

## Errors

_none_

## Warnings

_none_
