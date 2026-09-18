# Homer import validation report - iliad-en

Generated: 2026-09-18T03:29:14.021Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- Books: 24
- total passage chars: 945428

## Per-book counts

| book | number | ref | chars |
|------|--------|-----|-------|
| book-1 | 1 | 1–610 | 35332 |
| book-2 | 2 | 1–875 | 51877 |
| book-3 | 3 | 1–460 | 27417 |
| book-4 | 4 | 1–540 | 32816 |
| book-5 | 5 | 1–905 | 54131 |
| book-6 | 6 | 1–525 | 30858 |
| book-7 | 7 | 1–480 | 28564 |
| book-8 | 8 | 1–565 | 33965 |
| book-9 | 9 | 1–710 | 42616 |
| book-10 | 10 | 1–575 | 34127 |
| book-11 | 11 | 1–845 | 51126 |
| book-12 | 12 | 1–470 | 27893 |
| book-13 | 13 | 1–830 | 51842 |
| book-14 | 14 | 1–520 | 31654 |
| book-15 | 15 | 1–745 | 45807 |
| book-16 | 16 | 1–865 | 53359 |
| book-17 | 17 | 1–760 | 46802 |
| book-18 | 18 | 1–615 | 37286 |
| book-19 | 19 | 1–420 | 25308 |
| book-20 | 20 | 1–500 | 30663 |
| book-21 | 21 | 1–610 | 37147 |
| book-22 | 22 | 1–515 | 31338 |
| book-23 | 23 | 1–895 | 54483 |
| book-24 | 24 | 1–800 | 49017 |

## Verbatim spot-check

- OK - Book 1 opens "The wrath sing, goddess, of Peleus' son, Achilles"
  - got: `The wrath sing, goddess, of Peleus' son, Achilles, that destructive wrath which brought co`
- OK - Book 24 ends "...funeral for horse-taming Hector."
  - got: ` Priam, the king fostered of Zeus. On this wise held they funeral for horse-taming Hector.`

## Anomalies (preserved, not corrected)

- **iliad-en / book-20** - <corr resp="perseus"> transcription correction in the source, kept verbatim in the reading text: "son of"
- **iliad-en / whole work** - Parsed 425 Loeb "card" print-pagination divisions (discarded as pure layout) across 24 Books, yielding 425 prose paragraphs. 144 <note resp="Loeb"> footnote markers were stripped entirely (Murray/Loeb apparatus, not reading text). 1 <corr resp="perseus"> transcription correction(s) were kept verbatim and individually logged above.

## Errors

_none_

## Warnings

_none_
