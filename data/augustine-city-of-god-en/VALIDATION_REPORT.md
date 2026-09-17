# City of God validation report - augustine-city-of-god-en

Generated: 2026-09-17T23:50:26.626Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 22
- Books: 22
- Chapters: 665
- Passages: 1785
- total passage chars: 2338405

## Per-book counts

| book | number | chapters | passages | chars |
|------|--------|----------|----------|-------|
| book-1 | I | 37 | 118 | 97563 |
| book-2 | II | 29 | 65 | 90666 |
| book-3 | III | 31 | 81 | 93044 |
| book-4 | IV | 34 | 61 | 89161 |
| book-5 | V | 27 | 149 | 111465 |
| book-6 | VI | 13 | 46 | 65360 |
| book-7 | VII | 36 | 81 | 99041 |
| book-8 | VIII | 27 | 64 | 102636 |
| book-9 | IX | 23 | 42 | 59524 |
| book-10 | X | 32 | 70 | 116141 |
| book-11 | XI | 34 | 57 | 93598 |
| book-12 | XII | 27 | 55 | 84012 |
| book-13 | XIII | 24 | 53 | 78109 |
| book-14 | XIV | 28 | 83 | 99291 |
| book-15 | XV | 27 | 74 | 116438 |
| book-16 | XVI | 43 | 90 | 127752 |
| book-17 | XVII | 24 | 66 | 109393 |
| book-18 | XVIII | 54 | 147 | 162858 |
| book-19 | XIX | 28 | 64 | 112068 |
| book-20 | XX | 30 | 92 | 144937 |
| book-21 | XXI | 27 | 114 | 126138 |
| book-22 | XXII | 30 | 113 | 159210 |

## Verbatim spot-check

- OK - Book 1 Preface (book-1-ch-0) starts "The glorious city of God"
  - got: `The glorious city of God is my theme in this work, which you, my deare`
- OK - Book XXII final chapter ends "...giving thanks to God. Amen." (true end of the work)
  - got: `o think I have said just enough join me in giving thanks to God. Amen.`

## Anomalies (preserved, not corrected)

- **augustine-city-of-god-en / (work level)** - The top-level "City of God" Wikisource page also links a "Translator's Preface" (Dods' own preface) and, one level up, an "Editor's Preface" (Philip Schaff's, for the whole NPNF volume). Both are paratextual - the translator's/editor's own words, not Augustine's - and are deliberately not included as divisions of this work; only Augustine's 22 books (plus each book's own "Preface" chapter, which IS Augustine's text) are imported.
- **augustine-city-of-god-en / (work level)** - MediaWiki bold/italic markup ("''" / "'''", e.g. around a single emphasised word like Book I chapter 23's "he was ''ashamed'' that") is stripped throughout, same as {{templates}}/[[links]] - the plain-text Passage schema has no way to represent emphasis, so leaving the raw marker characters in would leak wiki syntax into the reading text rather than preserve it. Only the marker characters are dropped; the words themselves are untouched.

## Errors

_none_

## Warnings

_none_
