# Cicero validation report - pro-marcello-la

Generated: 2026-09-20T00:29:32.195Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- sections: 34
- total passage chars: 18281
- final chapter ref reached: 11 (expected 11)

## Per-section refs & chars

| section | ref | chars |
|---------|-----|-------|
| sec-1 | _null_ | 429 |
| sec-2 | 1 | 671 |
| sec-3 | 1 | 517 |
| sec-4 | 1 | 563 |
| sec-5 | 2 | 486 |
| sec-6 | 2 | 491 |
| sec-7 | 2 | 480 |
| sec-8 | 2 | 534 |
| sec-9 | 3 | 612 |
| sec-10 | 3 | 711 |
| sec-11 | 4 | 396 |
| sec-12 | 4 | 608 |
| sec-13 | 4 | 651 |
| sec-14 | 5 | 487 |
| sec-15 | 5 | 519 |
| sec-16 | 5 | 388 |
| sec-17 | 6 | 396 |
| sec-18 | 6 | 405 |
| sec-19 | 6 | 667 |
| sec-20 | 6 | 307 |
| sec-21 | 6 | 850 |
| sec-22 | 7 | 581 |
| sec-23 | 7 | 442 |
| sec-24 | 8 | 375 |
| sec-25 | 8 | 861 |
| sec-26 | 8 | 526 |
| sec-27 | 8 | 579 |
| sec-28 | 9 | 505 |
| sec-29 | 9 | 638 |
| sec-30 | 9 | 472 |
| sec-31 | 10 | 487 |
| sec-32 | 10 | 590 |
| sec-33 | 10 | 485 |
| sec-34 | 11 | 572 |

## Verbatim spot-check

- OK - sec-1 passage[0] starts "diuturni silenti, patres conscripti, quo eram his temporibus usus, non"
  - got: `diuturni silenti, patres conscripti, quo eram his temporibus usus, non`
- OK - final section (sec-34) ends "quod fieri iam posse non arbitrabar, magnus hoc tuo facto cumulus accesserit."
  - got: `eri iam posse non arbitrabar, magnus hoc tuo facto cumulus accesserit.`

## Anomalies (preserved, not corrected)

- **pro-marcello-la / refs** - This source prints two independent citation schemes: its own 34 numbered sections (Division.id / Division.number, "sec-1".."sec-34") and, coarser, the traditional 11 Roman-numeral "chapter" citation as inline <milestone unit="chapter" n="N"/> markers. Division.ref for each section is the chapter number active at that section's START - the nearest PRECEDING milestone in document order - built by a strict document-order walk (never inferred). sec-1 is the sole section with ref null: the source's own chapter-1 milestone sits just inside sec-1's own <p>, not before it, so no chapter is yet "active" when sec-1 opens - this is the documented, expected null case, not a gap. Passage.ref is null throughout and Passage.n is "" throughout (no printed sub-section numbering survives in this source).
- **pro-marcello-la / apparatus criticus** - 137 <note> elements (Clark's apparatus criticus - manuscript sigla, proposed emendations, editors' names) were excluded entirely, tag and content; not logged individually given their number. None of this is Cicero's own text.
- **pro-marcello-la / apparatus tags absent** - Unlike the companion Pro Sestio and Pro Milone imports, this witness carries no <del>, <add>, <choice>/<abbr>/<expan>, <num>, <quote> or <l> at all (confirmed by direct inspection - the shortest and structurally simplest of the four speeches bundled in this batch). Only <reg> and a single <q> occur.
- **pro-marcello-la / regularised spellings** - 109 <reg> elements (Clark's regularised-spelling form - the word he actually prints) were kept inline, tags stripped, text preserved verbatim.
- **pro-marcello-la / quoted speech** - 1 <q rend="single"> element(s) (Cicero quoting his own earlier, now-famous remark "satis diu vel naturae vixi vel gloriae", sec-25) were unwrapped and kept inline as ordinary running text.
- **pro-marcello-la / work-level head** - The source's own running title <head> ("PRO M. MARCELLO ORATIO") is a work-level heading, not a section heading; discarded entirely and not stored on any Division, matching how this library already treats the analogous per-book <head> in data/physics-grc.
- **pro-marcello-la / completeness** - All 34 sections and all 11 chapter milestones are present and sequential, from the incipit "diuturni silenti, patres conscripti, quo eram his temporibus usus, non..." to the explicit "...quod fieri iam posse non arbitrabar, magnus hoc tuo facto cumulus accesserit.".
- **pro-marcello-la / character encoding** - No HTML/XML entities occur anywhere in this file's reading text (confirmed by direct inspection); no combining diacritics are used. Bytes are preserved exactly as transmitted; no normalisation applied.
- **pro-marcello-la / English translation scope decision** - An incomplete/partial 19th-century (Yonge-tradition) English translation of Pro Marcello does exist on English Wikisource. It was deliberately NOT used for this import: this app ships the Latin text only for now, and a complete, independently-verified public-domain English translation will be sought later rather than shipping a partial one now. See about.json's "No English edition bundled" section.

## Errors

_none_

## Warnings

_none_
