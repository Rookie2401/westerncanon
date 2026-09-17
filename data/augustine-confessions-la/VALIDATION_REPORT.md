# Confessions validation report - augustine-confessions-la

Generated: 2026-09-17T22:43:46.244Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- books: 13
- chapters: 278
- passages: 453
- total passage chars: 515583

## Per-book counts

| # | id | number | chapters | passages | chars |
|---|----|--------|----------|----------|-------|
| 0 | book-1 | I | 20 | 31 | 33238 |
| 1 | book-2 | II | 10 | 18 | 17864 |
| 2 | book-3 | III | 12 | 21 | 25573 |
| 3 | book-4 | IV | 16 | 31 | 32131 |
| 4 | book-5 | V | 14 | 25 | 31163 |
| 5 | book-6 | VI | 16 | 26 | 36938 |
| 6 | book-7 | VII | 21 | 27 | 38941 |
| 7 | book-8 | VIII | 12 | 30 | 37493 |
| 8 | book-9 | IX | 13 | 37 | 40494 |
| 9 | book-10 | X | 43 | 70 | 73937 |
| 10 | book-11 | XI | 31 | 41 | 43294 |
| 11 | book-12 | XII | 32 | 43 | 47250 |
| 12 | book-13 | XIII | 38 | 53 | 57267 |

Sibling work `augustine-confessions-en` has 13 books / 276 chapters / 276 passages (each edition follows its own chapter division - counts are expected to differ).

## Verbatim spot-check

- OK - Book I, chapter 1, passage 1 starts "magnus es, domine, et laudabilis valde."
  - got: `magnus es, domine, et laudabilis valde. magna virtus tua et sapientiae tuae non `
- OK - Book XIII, final chapter ends "sic, sic accipietur, sic invenietur, sic aperietur."
  - got: `e quaeratur, ad te pulsetur: sic, sic accipietur, sic invenietur, sic aperietur.`

## Anomalies (preserved, not corrected)

- **book-10-ch-6 / section 10** - an editorial <ref>...</ref> footnote was removed from the reading text (apparatus, not Augustine's text): "de Labriolle legit: ''hoc dicit eorum natura videnti: 'moles est minor in parte quam in toto.'''"
- **augustine-confessions-la / all books** - 32 pair(s) of MediaWiki italic markup ('' ... '') were stripped from the reading text (this source uses them around quoted Scripture/speech within a quotation, e.g. Book III 3.4.7 and Book XII 12.29.40). Passage.text has no rich-text/formatting field, so the markup was removed while every literal apostrophe/quote-mark character and all enclosed words were kept verbatim.
- **augustine-confessions-la / all refs, all division & passage refs** - This Wikisource transcription carries no physical page/line reference. Division.ref and Passage.ref are null throughout; the citation scheme for this work is 'book-chapter-section' (registry.ts), reflected directly in the Book/Chapter/Passage id and number/n fields.
- **augustine-confessions-la / passage 9.12.32** - Book IX, chapter 12, section 32 contains an internal blank line in the source before eight lines of Ambrose's hymn "Deus creator omnium", quoted with a leading double-quote/apostrophe on each line as printed. This is the only section in the whole work with a blank line inside its heading-to-heading span; it is kept as a single passage (matching every other section) with the internal blank line collapsed to a single space by the shared whitespace-collapsing rule, not treated as a paragraph break.
- **augustine-confessions-la / division scheme** - 13 Books, each with book.chapter.section headings printed by the source itself; chapter counts per book as parsed (20, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38 for Books I-XIII) match the traditional chapter count for each book of the Confessions. Every chapter's section numbers run contiguously 1..N through the whole book (not reset per chapter), exactly as printed; Division.number for a Chapter is the plain arabic chapter number, and Passage.n is the plain arabic section number, both taken directly from the source heading.
- **augustine-confessions-la / orthography** - No capitalisation, u/v, or i/j regularisation of any kind. The source prints the entire text in lowercase, including the first word of the work ("magnus es, domine...") and every sentence-initial word thereafter; this is exactly as transcribed and is preserved verbatim.

## Errors

_none_

## Warnings

_none_
