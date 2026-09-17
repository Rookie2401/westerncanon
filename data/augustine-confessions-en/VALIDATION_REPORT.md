# Confessions validation report - augustine-confessions-en

Generated: 2026-09-17T22:43:46.247Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- books: 13
- chapters: 276
- passages: 276
- total passage chars: 628936

## Per-book counts

| # | id | number | chapters | passages | chars |
|---|----|--------|----------|----------|-------|
| 0 | book-1 | I | 18 | 18 | 40349 |
| 1 | book-2 | II | 10 | 10 | 21824 |
| 2 | book-3 | III | 12 | 12 | 31291 |
| 3 | book-4 | IV | 16 | 16 | 38592 |
| 4 | book-5 | V | 14 | 14 | 38549 |
| 5 | book-6 | VI | 16 | 16 | 45310 |
| 6 | book-7 | VII | 21 | 21 | 47154 |
| 7 | book-8 | VIII | 12 | 12 | 45771 |
| 8 | book-9 | IX | 13 | 13 | 49674 |
| 9 | book-10 | X | 43 | 43 | 91047 |
| 10 | book-11 | XI | 31 | 31 | 51868 |
| 11 | book-12 | XII | 32 | 32 | 57188 |
| 12 | book-13 | XIII | 38 | 38 | 70319 |

Sibling work `augustine-confessions-la` has 13 books / 278 chapters / 453 passages (each edition follows its own chapter division - counts are expected to differ).

## Verbatim spot-check

- OK - Book I, chapter 1, passage 1 starts "1. Great art Thou, O Lord, and greatly to be praised;"
  - got: `1. Great art Thou, O Lord, and greatly to be praised; great is Thy power, and of`
- OK - Book XIII, final chapter ends "so, even so shall it be received, so shall it be found, so shall it be opened. Amen."
  - got: `even so shall it be received, so shall it be found, so shall it be opened. Amen.`

## Anomalies (preserved, not corrected)

- **book-12-ch-1** - printed chapter heading has an irregular stray space before the period ("Chapter I .—..."); tolerated, not corrected.
- **augustine-confessions-en / all books** - 1313 <ref>...</ref> footnotes (Pilkington's translator/editorial annotation) were removed from the reading text across all 13 books; their content is not preserved anywhere, per this importer's brief.
- **augustine-confessions-en / all books** - 46 pair(s) of MediaWiki italic markup ('' ... '') were stripped from the reading text (used around quoted Latin phrases and emphasised English words). Passage.text has no rich-text field, so the markers were removed while every enclosed word was kept verbatim.
- **augustine-confessions-en / inline section numerals** - 276 of 276 chapters carry one or more inline numerals (e.g. "5. ... 6. ...") in their prose, printed by this edition wherever a chapter spans more than one of the Latin work's traditional section numbers. This translation's own citation scheme is book-chapter only (registry.ts), with nothing below chapter level, so each Chapter division holds exactly one Passage (n: '') and these numerals are kept verbatim as part of that passage's printed text rather than stripped or moved to a field this edition does not use.

## Errors

_none_

## Warnings

_none_
