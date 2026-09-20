# Cicero validation report - pro-ligario-la

Generated: 2026-09-20T00:28:39.923Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- sections: 38
- total passage chars: 21355
- final chapter ref reached: 12 (expected 12)

## Per-section refs & chars

| section | ref | chars |
|---------|-----|-------|
| sec-1 | _null_ | 739 |
| sec-2 | 1 | 705 |
| sec-3 | 1 | 578 |
| sec-4 | 1 | 606 |
| sec-5 | 2 | 445 |
| sec-6 | 2 | 608 |
| sec-7 | 3 | 614 |
| sec-8 | 3 | 371 |
| sec-9 | 3 | 453 |
| sec-10 | 3 | 597 |
| sec-11 | 4 | 562 |
| sec-12 | 4 | 502 |
| sec-13 | 5 | 536 |
| sec-14 | 5 | 412 |
| sec-15 | 5 | 400 |
| sec-16 | 5 | 635 |
| sec-17 | 5 | 691 |
| sec-18 | 6 | 562 |
| sec-19 | 6 | 736 |
| sec-20 | 6 | 574 |
| sec-21 | 7 | 519 |
| sec-22 | 7 | 483 |
| sec-23 | 7 | 530 |
| sec-24 | 8 | 485 |
| sec-25 | 8 | 624 |
| sec-26 | 8 | 630 |
| sec-27 | 9 | 447 |
| sec-28 | 9 | 593 |
| sec-29 | 9 | 514 |
| sec-30 | 10 | 775 |
| sec-31 | 10 | 746 |
| sec-32 | 11 | 406 |
| sec-33 | 11 | 889 |
| sec-34 | 11 | 597 |
| sec-35 | 12 | 456 |
| sec-36 | 12 | 373 |
| sec-37 | 12 | 528 |
| sec-38 | 12 | 434 |

## Verbatim spot-check

- OK - sec-1 passage[0] starts "novum crimen, C. Caesar, et ante hunc diem non auditum propinquus meus"
  - got: `novum crimen, C. Caesar, et ante hunc diem non auditum propinquus meus`
- OK - final section (sec-38) ends "si illi absenti salutem dederis, praesentibus te his daturum."
  - got: `dmonebo, si illi absenti salutem dederis, praesentibus te his daturum.`

## Anomalies (preserved, not corrected)

- **pro-ligario-la / refs** - This source prints two independent citation schemes: its own 38 numbered sections (Division.id / Division.number, "sec-1".."sec-38") and, coarser, the traditional 12 Roman-numeral "chapter" citation as inline <milestone unit="chapter" n="N"/> markers. Division.ref for each section is the chapter number active at that section's START - the nearest PRECEDING milestone in document order - built by a strict document-order walk (never inferred). sec-1 is the sole section with ref null: the source's own chapter-1 milestone sits just inside sec-1's own <p>, not before it, so no chapter is yet "active" when sec-1 opens - this is the documented, expected null case, not a gap. Passage.ref is null throughout and Passage.n is "" throughout (no printed sub-section numbering survives in this source).
- **pro-ligario-la / apparatus criticus** - 174 <note> elements (Clark's apparatus criticus - manuscript sigla, proposed emendations, editors' names) were excluded entirely, tag and content; not logged individually given their number. None of this is Cicero's own text.
- **pro-ligario-la / apparatus tags absent** - Like the companion Pro Marcello import (and unlike Pro Sestio/Pro Milone), this witness carries no <del>, <add>, <choice>/<abbr>/<expan>, <num>, <quote> or <l> at all (confirmed by direct inspection). Only <reg> and <q> occur.
- **pro-ligario-la / regularised spellings** - 171 <reg> elements (Clark's regularised-spelling form - the word he actually prints) were kept inline, tags stripped, text preserved verbatim.
- **pro-ligario-la / quoted speech** - 12 <q rend="single"> elements (Cicero repeatedly staging and answering an imagined prosecutor Tubero's own words, e.g. "in armis fuit") were unwrapped and kept inline as ordinary running text.
- **pro-ligario-la / work-level head** - The source's own running title <head> ("PRO Q. LIGARIO ORATIO") is a work-level heading, not a section heading; discarded entirely and not stored on any Division, matching how this library already treats the analogous per-book <head> in data/physics-grc.
- **pro-ligario-la / completeness** - All 38 sections and all 12 chapter milestones are present and sequential, from the incipit "novum crimen, C. Caesar, et ante hunc diem non auditum propinquus meus..." to the explicit "...si illi absenti salutem dederis, praesentibus te his daturum.".
- **pro-ligario-la / character encoding** - No HTML/XML entities occur anywhere in this file's reading text (confirmed by direct inspection); no combining diacritics are used. Bytes are preserved exactly as transmitted; no normalisation applied.

## Errors

_none_

## Warnings

_none_
