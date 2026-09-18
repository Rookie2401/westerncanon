# Hesiod validation report - theogony-grc

Generated: 2026-09-18T03:39:14.937Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (cards): 32
- passages: 32
- total passage chars: 45637

## Per-division passage counts

| # | id | number | ref | chars |
|---|----|--------|-----|-------|
| 0 | sec-1 | 1 | 1–28 | 1168 |
| 1 | sec-2 | 2 | 29–52 | 1068 |
| 2 | sec-3 | 3 | 53–62 | 449 |
| 3 | sec-4 | 4 | 63–103 | 1805 |
| 4 | sec-5 | 5 | 104–138 | 1588 |
| 5 | sec-6 | 6 | 139–172 | 1525 |
| 6 | sec-7 | 7 | 173–206 | 1524 |
| 7 | sec-8 | 8 | 207–239 | 1479 |
| 8 | sec-9 | 9 | 240–269 | 1202 |
| 9 | sec-10 | 10 | 270–303 | 1482 |
| 10 | sec-11 | 11 | 304–336 | 1422 |
| 11 | sec-12 | 12 | 337–370 | 1448 |
| 12 | sec-13 | 13 | 371–403 | 1468 |
| 13 | sec-14 | 14 | 404–452 | 2186 |
| 14 | sec-15 | 15 | 453–491 | 1737 |
| 15 | sec-16 | 16 | 492–506 | 645 |
| 16 | sec-17 | 17 | 507–544 | 1666 |
| 17 | sec-18 | 18 | 545–584 | 1753 |
| 18 | sec-19 | 19 | 585–616 | 1419 |
| 19 | sec-20 | 20 | 617–653 | 1622 |
| 20 | sec-21 | 21 | 654–686 | 1450 |
| 21 | sec-22 | 22 | 687–728 | 1903 |
| 22 | sec-23 | 23 | 729–766 | 1657 |
| 23 | sec-24 | 24 | 767–806 | 1766 |
| 24 | sec-25 | 25 | 807–819 | 551 |
| 25 | sec-26 | 26 | 820–852 | 1517 |
| 26 | sec-27 | 27 | 853–885 | 1439 |
| 27 | sec-28 | 28 | 886–900 | 656 |
| 28 | sec-29 | 29 | 901–937 | 2492 |
| 29 | sec-30 | 30 | 938–962 | 1030 |
| 30 | sec-31 | 31 | 963–1002 | 1711 |
| 31 | sec-32 | 32 | 1003–1022 | 809 |

Companion work `theogony-en`: 32 divisions / 32 passages; division id sets MATCH 1:1; ref (card line-range) sets MATCH 1:1.

## Verbatim spot-check

- OK - card 1 starts "Μουσάων Ἑλικωνιάδων ἀρχώμεθʼ ἀείδειν"
  - got: `Μουσάων Ἑλικωνιάδων ἀρχώμεθʼ ἀείδειν,
αἵθʼ Ἑλικῶνος ἔχουσιν `
- OK - final card (sec-32) ends "Μοῦσαι Ὀλυμπιάδες, κοῦραι Διὸς αἰγιόχοιο."
  - got: `ἀείσατε, ἡδυέπειαι
Μοῦσαι Ὀλυμπιάδες, κοῦραι Διὸς αἰγιόχοιο.`

## Anomalies (preserved, not corrected)

- **theogony-grc / card boundary derivation** - This Greek file carries its own native <milestone unit="card"> markers (32 of them). They were cross-checked at import time against the shared cardBoundaries table and match exactly, byte for byte. All three Hesiodic poems carry matching native card milestones in both their Greek and English TEI witness; see scripts/import-hesiod-shared/xml.ts for the full derivation notes.
- **theogony-grc / <del> editorial bracketing** - 12 line(s) contain 12 <del>...</del> span(s) in the source XML (editorial athetesis, e.g. n="111", "118", "196", "323", "324", "496", ...). Per this repo's "never content" rule these are KEPT verbatim in the reading text - only the <del>/</del> tags themselves are stripped. This deliberately departs from this repo's Euclid importer, which drops <del> content outright; that precedent does not apply here because the task instructions for this corpus are explicit that only XML transport scaffolding may be stripped, never content the source prints.
- **theogony-grc / <add> editorial insertion** - 19 line(s) (the lettered interpolation n="929a".."929t", the Hera/Hephaestus - Zeus/Metis/Athena-birth passage) are wrapped in <add>...</add> in the source XML (an editorially-supplied passage present in only part of the manuscript tradition). Kept verbatim in the reading text; only the <add>/</add> tags are stripped.
- **theogony-grc / <gap> lacuna marker** - 1 <gap reason="ellipsis"/> marker(s) in the source XML (a lacuna between the lettered lines n="929f" and n="929g"), printed by the edition as "* * * *". Preserved verbatim as its own line in the reading text, at its original position, rather than silently dropped.
- **theogony-grc / lettered interpolation lines** - Beyond the standard 1-1022 line numbering, the source carries 20 additional lettered lines (929a-929t) for the <add>-wrapped interpolated passage noted above. These are real content the source prints and are kept as their own reading-text lines within the card they fall in (901-938); Division.ref line ranges refer to the standard integer numbering only.
- **theogony-grc / completeness** - All 32 cards present and in order, spanning the standard line numbering 1-1022 plus the lettered interpolation. Incipit and explicit verified against the printed text.

## Errors

_none_

## Warnings

_none_
