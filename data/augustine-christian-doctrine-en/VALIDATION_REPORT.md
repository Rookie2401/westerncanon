# On Christian Doctrine validation report - augustine-christian-doctrine-en

Generated: 2026-09-17T23:13:32.387Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- books: 5
- chapters: 151
- passages: 151
- total passage chars: 350880

## Per-book counts

| book | number | chapters | passages | chars |
|------|--------|----------|----------|-------|
| book-0 | - | 1 | 1 | 10822 |
| book-1 | I | 40 | 40 | 54139 |
| book-2 | II | 42 | 42 | 95071 |
| book-3 | III | 37 | 37 | 80789 |
| book-4 | IV | 31 | 31 | 110059 |

## Verbatim spot-check

- OK - book-0 first passage starts "1. There are certain rules for the interpretation of Scripture"
  - got: `1. There are certain rules for the interpretation of Scripture which I`
- OK - final book (book-4) ends "not for his own instruction only, but for that of others also."
  - got: ` is, in Christian doctrine, not for his own instruction only, but for that of others also.`

## Anomalies (preserved, not corrected)

- **augustine-christian-doctrine-en / all refs** - This Wikisource transcription carries no physical page/line reference of its own. Division.ref and Passage.ref are null throughout; citation is 'book-chapter' (registry.ts): Division.number / Division.id carry the printed Book roman numeral and Chapter number, and every Passage.n is "" (this edition's Chapter divisions are not further subdivided into separate Passages - see "How it was imported" in about.json).
- **augustine-christian-doctrine-en / footnotes** - 317 editorial <ref>...</ref> footnote(s) (translator/editor apparatus, chiefly Scripture cross-references) were removed from the reading text across the Preface and all four Books; counted in aggregate rather than quoted individually given the volume.
- **augustine-christian-doctrine-en / italic-bold markup** - 266 run(s) of MediaWiki italic/bold apostrophe markup ('' or ''') were stripped from the reading text (this app's Passage.text has no rich-text field); every enclosed word was kept verbatim.
- **augustine-christian-doctrine-en / book-2 and book-3 vs. Latin edition** - This English translation preserves the traditional 42-chapter (Book II) and 37-chapter (Book III) division. The Latin De Doctrina Christiana bundled alongside this work does NOT preserve that division for its own Books II/III (its Wikisource transcription prints no chapter numerals there at all - see that edition's own anomalies.json); this is a property of the two independent Wikisource transcriptions, not something introduced by either importer.
- **augustine-christian-doctrine-en / interior paragraph numbers** - Where a chapter page prints more than one numbered paragraph ("1.", "2." ...), all of them are joined into that Chapter's single Passage per this work's 'book-chapter' citation scheme, with the source's own paragraph numbers kept inline exactly as printed rather than stripped or split into separate Passages.

## Errors

_none_

## Warnings

_none_
