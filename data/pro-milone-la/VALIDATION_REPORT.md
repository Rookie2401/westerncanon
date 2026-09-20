# Cicero validation report - pro-milone-la

Generated: 2026-09-20T00:29:30.509Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- sections: 105
- total passage chars: 70606
- final chapter ref reached: 38 (expected 38)

## Per-section refs & chars

| section | ref | chars |
|---------|-----|-------|
| sec-1 | _null_ | 472 |
| sec-2 | 1 | 678 |
| sec-3 | 1 | 896 |
| sec-4 | 2 | 624 |
| sec-5 | 2 | 624 |
| sec-6 | 2 | 654 |
| sec-7 | 2 | 611 |
| sec-8 | 3 | 750 |
| sec-9 | 3 | 690 |
| sec-10 | 4 | 526 |
| sec-11 | 4 | 602 |
| sec-12 | 4 | 932 |
| sec-13 | 5 | 631 |
| sec-14 | 5 | 817 |
| sec-15 | 6 | 776 |
| sec-16 | 6 | 724 |
| sec-17 | 7 | 521 |
| sec-18 | 7 | 695 |
| sec-19 | 7 | 605 |
| sec-20 | 7 | 561 |
| sec-21 | 8 | 1038 |
| sec-22 | 8 | 397 |
| sec-23 | 8 | 589 |
| sec-24 | 9 | 551 |
| sec-25 | 9 | 715 |
| sec-26 | 9 | 484 |
| sec-27 | 9 | 538 |
| sec-28 | 10 | 599 |
| sec-29 | 10 | 855 |
| sec-30 | 10 | 727 |
| sec-31 | 11 | 759 |
| sec-32 | 12 | 864 |
| sec-33 | 12 | 1181 |
| sec-34 | 13 | 1406 |
| sec-35 | 13 | 641 |
| sec-36 | 13 | 632 |
| sec-37 | 14 | 575 |
| sec-38 | 14 | 782 |
| sec-39 | 14 | 755 |
| sec-40 | 15 | 683 |
| sec-41 | 15 | 475 |
| sec-42 | 16 | 567 |
| sec-43 | 16 | 635 |
| sec-44 | 16 | 393 |
| sec-45 | 16 | 669 |
| sec-46 | 17 | 773 |
| sec-47 | 17 | 651 |
| sec-48 | 18 | 568 |
| sec-49 | 18 | 492 |
| sec-50 | 19 | 436 |
| sec-51 | 19 | 331 |
| sec-52 | 19 | 792 |
| sec-53 | 19 | 548 |
| sec-54 | 20 | 671 |
| sec-55 | 20 | 651 |
| sec-56 | 21 | 765 |
| sec-57 | 21 | 545 |
| sec-58 | 22 | 733 |
| sec-59 | 22 | 567 |
| sec-60 | 22 | 455 |
| sec-61 | 22 | 934 |
| sec-62 | 23 | 351 |
| sec-63 | 23 | 720 |
| sec-64 | 23 | 807 |
| sec-65 | 24 | 724 |
| sec-66 | 24 | 730 |
| sec-67 | 24 | 715 |
| sec-68 | 25 | 940 |
| sec-69 | 25 | 542 |
| sec-70 | 26 | 558 |
| sec-71 | 26 | 371 |
| sec-72 | 26 | 712 |
| sec-73 | 27 | 683 |
| sec-74 | 27 | 841 |
| sec-75 | 27 | 564 |
| sec-76 | 27 | 838 |
| sec-77 | 28 | 814 |
| sec-78 | 28 | 957 |
| sec-79 | 29 | 993 |
| sec-80 | 29 | 565 |
| sec-81 | 29 | 603 |
| sec-82 | 30 | 688 |
| sec-83 | 30 | 714 |
| sec-84 | 30 | 688 |
| sec-85 | 31 | 831 |
| sec-86 | 31 | 844 |
| sec-87 | 32 | 854 |
| sec-88 | 32 | 540 |
| sec-89 | 33 | 524 |
| sec-90 | 33 | 728 |
| sec-91 | 33 | 696 |
| sec-92 | 33 | 846 |
| sec-93 | 34 | 544 |
| sec-94 | 34 | 713 |
| sec-95 | 34 | 727 |
| sec-96 | 35 | 499 |
| sec-97 | 35 | 429 |
| sec-98 | 35 | 633 |
| sec-99 | 35 | 790 |
| sec-100 | 36 | 716 |
| sec-101 | 36 | 681 |
| sec-102 | 37 | 499 |
| sec-103 | 37 | 705 |
| sec-104 | 38 | 446 |
| sec-105 | 38 | 432 |

## Verbatim spot-check

- OK - sec-1 passage[0] starts "etsi vereor, iudices, ne turpe sit pro fortissimo viro dicere incipient"
  - got: `etsi vereor, iudices, ne turpe sit pro fortissimo viro dicere incipien`
- OK - final section (sec-105) ends "optimum et sapientissimum et fortissimum quemque delegit."
  - got: `bus legendis optimum et sapientissimum et fortissimum quemque delegit.`

## Anomalies (preserved, not corrected)

- **pro-milone-la / refs** - This source prints two independent citation schemes: its own 105 numbered sections (Division.id / Division.number, "sec-1".."sec-105") and, coarser, the traditional 38 Roman-numeral "chapter" citation as inline <milestone unit="chapter" n="N"/> markers. Division.ref for each section is the chapter number active at that section's START - the nearest PRECEDING milestone in document order - built by a strict document-order walk (never inferred). sec-1 is the sole section with ref null: the source's own chapter-1 milestone sits just inside sec-1's own <p>, not before it, so no chapter is yet "active" when sec-1 opens - this is the documented, expected null case, not a gap. Passage.ref is null throughout and Passage.n is "" throughout (no printed sub-section numbering survives in this source).
- **pro-milone-la / apparatus criticus** - 583 <note> elements (Clark's apparatus criticus - manuscript sigla, proposed emendations, editors' names) were excluded entirely, tag and content; not logged individually given their number. None of this is Cicero's own text.
- **pro-milone-la / <del>** - This witness carries no <del> elements at all (confirmed by direct inspection, unlike the companion Pro Sestio import, which has 3) - nothing was excluded as an editorial deletion.
- **pro-milone-la / sec-14** - The source's own <choice><abbr>"tr."</abbr> <expan>"tribunum"</expan></choice> offers the literal manuscript abbreviation alongside its resolution; the resolved reading "tribunum" is what Clark's edition actually prints as running text, so it alone is kept (matching this library's choice/sic/corr convention in import-virgil-aeneid-la of preferring the resolved reading over the literal transcription).
- **pro-milone-la / sec-14** - The source's own <choice><abbr>"pl."</abbr> <expan>"plebis"</expan></choice> offers the literal manuscript abbreviation alongside its resolution; the resolved reading "plebis" is what Clark's edition actually prints as running text, so it alone is kept (matching this library's choice/sic/corr convention in import-virgil-aeneid-la of preferring the resolved reading over the literal transcription).
- **pro-milone-la / editorial additions** - 6 <add> elements (Clark's own editorial additions/emendations, incorporated into his printed text) were kept inline, tags stripped, text preserved verbatim.
- **pro-milone-la / regularised spellings** - 409 <reg> elements (Clark's regularised-spelling form - the word he actually prints) were kept inline, tags stripped, text preserved verbatim.
- **pro-milone-la / quoted speech** - 32 <q rend="single"> elements (short quoted/reported speech within Cicero's own oration, e.g. his rhetorical staging of an opponent's imagined words) were unwrapped and kept inline as ordinary running text. This witness carries no <quote> or <l> (verse) elements at all, unlike the companion Pro Sestio import.
- **pro-milone-la / numerals** - 2 <num rend="smallcaps"> element(s) (a numeral rendered in small capitals in print) were kept inline, tags stripped, text preserved verbatim.
- **pro-milone-la / work-level head** - The source's own running title <head> ("PRO T. ANNIO MILONE ORATIO") is a work-level heading, not a section heading; discarded entirely and not stored on any Division, matching how this library already treats the analogous per-book <head> in data/physics-grc.
- **pro-milone-la / completeness** - All 105 sections and all 38 chapter milestones are present and sequential, from the incipit "etsi vereor, iudices, ne turpe sit pro fortissimo viro dicere incipient..." to the explicit "...optimum et sapientissimum et fortissimum quemque delegit.".
- **pro-milone-la / character encoding** - No HTML/XML entities occur anywhere in this file's reading text (confirmed by direct inspection); no combining diacritics are used. Bytes are preserved exactly as transmitted; no normalisation applied.

## Errors

_none_

## Warnings

_none_
