# Hesiod validation report - works-and-days-grc

Generated: 2026-09-18T21:33:10.398Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 26
- passages: 26
- total passage chars: 36949

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–10 | 438 |
| 1 | sec-2 | 2 | 11–41 | 1400 |
| 2 | sec-3 | 3 | 42–58 | 748 |
| 3 | sec-4 | 4 | 59–82 | 1073 |
| 4 | sec-5 | 5 | 83–108 | 1159 |
| 5 | sec-6 | 6 | 109–139 | 1379 |
| 6 | sec-7 | 7 | 140–173 | 1706 |
| 7 | sec-8 | 8 | 174–201 | 1269 |
| 8 | sec-9 | 9 | 202–237 | 1652 |
| 9 | sec-10 | 10 | 238–273 | 1604 |
| 10 | sec-11 | 11 | 274–319 | 2006 |
| 11 | sec-12 | 12 | 320–369 | 2259 |
| 12 | sec-13 | 13 | 370–404 | 1541 |
| 13 | sec-14 | 14 | 405–447 | 1912 |
| 14 | sec-15 | 15 | 448–478 | 1353 |
| 15 | sec-16 | 16 | 479–503 | 1085 |
| 16 | sec-17 | 17 | 504–535 | 1380 |
| 17 | sec-18 | 18 | 536–570 | 1525 |
| 18 | sec-19 | 19 | 571–608 | 1710 |
| 19 | sec-20 | 20 | 609–640 | 1423 |
| 20 | sec-21 | 21 | 641–677 | 1617 |
| 21 | sec-22 | 22 | 678–705 | 1262 |
| 22 | sec-23 | 23 | 706–736 | 1387 |
| 23 | sec-24 | 24 | 737–764 | 1230 |
| 24 | sec-25 | 25 | 765–799 | 1560 |
| 25 | sec-26 | 26 | 800–828 | 1271 |

Companion work `works-and-days-en`: 26 divisions / 26 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "μοῦσαι Πιερίηθεν ἀοιδῇσιν κλείουσαι"
  - got: `μοῦσαι Πιερίηθεν ἀοιδῇσιν κλείουσαι
δεῦτε, Δίʼ ἐννέπετε, σφέ`
- OK - final card (sec-26) ends "ὄρνιθας κρίνων καὶ ὑπερβασίας ἀλεείνων."
  - got: `ναίτιος ἀθανάτοισιν,
ὄρνιθας κρίνων καὶ ὑπερβασίας ἀλεείνων.`

## Anomalies (preserved, not corrected)

- **works-and-days-grc / card boundary derivation** - This Greek file carries its own native <milestone unit="card"> markers (26 of them, attribute order "n... ed... unit..." - different from the Theogony's "ed... unit... n..." - so parsing matches unit="card" via lookahead rather than assuming attribute order). They were cross-checked at import time against the shared cardBoundaries table and match exactly. The Greek text was bucketed into cards by each line's integer line-number prefix against this boundary list.
- **works-and-days-grc / <del> editorial bracketing** - 6 line(s) are wholly wrapped in a single <del>...</del> span (editorial athetesis, n="76", "79", "93", "99", "124", "125"). Per this repo's "never content" rule these are KEPT verbatim in the reading text - only the <del>/</del> tags themselves are stripped (see the parallel note in theogony-grc for why this departs from the Euclid importer's precedent of dropping <del> content).
- **works-and-days-grc / partial in-line <del> bracketing (lettered lines)** - The 4 lettered lines n="169a", "169b", "169c", "169d" (a "silver race" doublet beyond the standard 1-828 numbering, present in only part of the manuscript tradition) each carry TWO separate <del> spans with un-bracketed plain text between them (e.g. n="169a": "<del>τοῦ γὰρ δεσμὸν</del> ἔλυσε πα<del>τὴρ ἀνδρῶν τε θεῶν τε.</del>" - NOT wrapped in <add> as originally guessed before the raw XML was inspected closely). All text is kept verbatim (both the bracketed and the un-bracketed portions); only the <del>/</del> tags are stripped, same treatment as the whole-line <del> spans above. This file has no <add> elements at all.
- **works-and-days-grc / completeness** - All 26 cards present and in order, spanning the standard line numbering 1-828 plus the lettered doublet. Incipit and explicit verified against the printed text.

## Errors

_none_

## Warnings

_none_
