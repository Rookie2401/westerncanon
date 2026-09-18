# Aeneid validation report - aeneid-en

Generated: 2026-09-18T03:30:38.687Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- Books: 12
- total verse lines (passage text split on '\n'): 13336
- total passage chars: 574329

## Per-book counts

| book | number | ref | lines | chars |
|------|--------|-----|-------|-------|
| book-1 | 1 | 1–1066 | 1066 | 45932 |
| book-2 | 2 | 1–1081 | 1081 | 46902 |
| book-3 | 3 | 1–985 | 985 | 42211 |
| book-4 | 4 | 1–992 | 992 | 42483 |
| book-5 | 5 | 1–1136 | 1136 | 49004 |
| book-6 | 6 | 1–1179 | 1179 | 50971 |
| book-7 | 7 | 1–1069 | 1069 | 45816 |
| book-8 | 8 | 1–986 | 986 | 42242 |
| book-9 | 9 | 1–1114 | 1114 | 48064 |
| book-10 | 10 | 1–1223 | 1223 | 52622 |
| book-11 | 11 | 1–1218 | 1218 | 52494 |
| book-12 | 12 | 1–1287 | 1287 | 55588 |

## Verbatim spot-check

- OK - Book 1 opens "Arms and the man I sing"
  - got: `Arms and the man I sing, who first made way,
predestined exile, from the Trojan shore
to I`
- OK - Book 12 ends "...with moan of wrath to darkness fled away." (Williams' rendering of the poem's final line)
  - got: `mbs
sank cold and helpless; and the vital breath
with moan of wrath to darkness fled away.`

## Anomalies (preserved, not corrected)

- **book-6 l.580** - Source <choice>: kept the original diacritic spelling "Pasiphaë" as printed (Williams' 1910 edition); the digitization also offers a plain-ASCII regularized spelling "Pasiphae", not used here.
- **book-6 l.640** - Source <choice>: kept the original diacritic spelling "Deïphobus" as printed (Williams' 1910 edition); the digitization also offers a plain-ASCII regularized spelling "Deiphobus", not used here.
- **book-6 l.703** - Source <choice>: kept the original diacritic spelling "Deïphobus" as printed (Williams' 1910 edition); the digitization also offers a plain-ASCII regularized spelling "Deiphobus", not used here.
- **book-6 l.751** - Source <choice>: kept the original diacritic spelling "Aloïdae" as printed (Williams' 1910 edition); the digitization also offers a plain-ASCII regularized spelling "Aloidae", not used here.
- **aeneid-en / reading text** - 4 <choice><reg>/<orig></choice> spelling variants (Book 6 underworld catalogue: Pasiphaë, Deïphobus ×2, Aloïdae) were resolved to the <orig> (as-printed, diacritic) spelling; every occurrence is logged individually above alongside the <reg> alternate.
- **aeneid-en / reading text** - 13336 <l> verse-line elements were parsed across the 12 books, well above Virgil's own 9,863 Latin <l> elements (see the companion Latin importer) — Williams' free English verse translation routinely expands a single Latin hexameter into more than one English line; this is expected, not an error.
- **aeneid-en / passage & division refs** - This TEI carries no <pb> page markers, so every Passage.ref is null; Division.ref gives each book's own translated verse-line range instead (first–last <l n="…"> found in that book, Williams' own line numbering, which tracks the Latin closely but not exactly).

## Errors

_none_

## Warnings

_none_
