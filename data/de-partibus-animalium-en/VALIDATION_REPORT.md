# On the Parts of Animals (English, Ogle 1912 — completed from MIT) validation report

Generated: 2026-09-23T05:38:00.066Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 4
- chapters: 51
- total passage chars: 336350
- Book 1: 5 chapters (numbers 1-5)
- Book 2: 17 chapters (numbers 1-17)
- Book 3: 15 chapters (numbers 1-15)
- Book 4: 14 chapters (numbers 1-14)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `Every systematic science, the humblest and the noblest alike, seems to admit of two distin`
- OK — last chapter explicit
  - got: `ust now pass on, and in due sequence must next deal with the question of their generation.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 251
- work paragraphs: 316
- checked (>= 40 chars, not editorial): 248
- declared editorial / furniture (excluded): 0
- **missing: 0**

## Anomalies (preserved, not corrected)

- **de-partibus-animalium-en / book-1** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): [[el:Περί Ζώιων Μορίων/1]].
- **de-partibus-animalium-en / book-2** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): [[el:Περί Ζώιων Μορίων/2]].
- **de-partibus-animalium-en / book-3** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): [[el:Περί Ζώιων Μορίων/3]].
- **de-partibus-animalium-en / book-4** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): [[el:Περί Ζώιων Μορίων/4]].
- **de-partibus-animalium-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with wiki-heading-Part-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-partibus-animalium-en / footnotes stripped** — 0 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-partibus-animalium-en / book-2** — 14 of the 17 chapters of the standard division are present in this source (highest number present: 14). The remainder is not transcribed on English Wikisource and is not fabricated here.
- **de-partibus-animalium-en / book-3** — 14 of the 15 chapters of the standard division are present in this source (highest number present: 14). The remainder is not transcribed on English Wikisource and is not fabricated here.
- **de-partibus-animalium-en / book-4** — 10 of the 14 chapters of the standard division are present in this source (highest number present: 10). The remainder is not transcribed on English Wikisource and is not fabricated here.
- **de-partibus-animalium-en / completeness** — COMPLETE (as of the 2026-09-22 MIT supplement). Book I was always whole (5/5, ends cleanly). Books II, III and IV originally stopped mid-sentence (mid-word in Book III) on English Wikisource, at 14/17, 14/15 and 10/14 chapters respectively; each has now been completed from a Wayback Machine capture of the MIT Internet Classics Archive's own copy of this same Ogle translation, whose live page has the identical defect (see the three book-N-ch-M tail anomalies and the six "whole chapter" anomalies below for the full, per-chapter account). Total: 51 chapters across 4 books (5 + 17 + 15 + 14), all of it Ogle's translation verbatim, part MIT-sourced (17 of the 51 chapters: the tails of II.14/III.14/IV.10 and the whole of II.15-17, III.15, IV.11-14) and the rest Wikisource-sourced.
- **de-partibus-animalium-en / book-2 stray markup** — Book II's Wikisource transcription broke off leaving a half-written HTML opening tag ("<A") at the very end of its last surviving sentence. It is transport debris rather than a word of the translation, so it was removed; the words before it are kept verbatim. No other page in this work left such a fragment.
- **de-partibus-animalium-en / chapter marker shape** — All four Wikisource pages mark chapters uniformly with "==Part N==" wiki headings. This was verified for this work independently and NOT assumed from its 1912 volume-mate On the Generation of Animals, whose Books II-V use a quite different bare-number-line marker. MIT's own pages use the same "Part N" convention (via a `<B>...</B>` heading rather than wikitext), likewise verified directly.
- **de-partibus-animalium-en / reference scheme** — Division.ref and Passage.ref are null throughout: neither Wikisource's plaintext digitisation nor MIT's Internet Classics Archive prints Bekker page/column markers anywhere in this work (confirmed across all four Wikisource pages and all three MIT supplement pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from either source.
- **de-partibus-animalium-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of De partibus animalium; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.
- **de-partibus-animalium-en / MIT supplement source verification** — MIT's Internet Classics Archive credits this translation "Translated by William Ogle" on all three fetched book pages (verified by direct inspection of raw/mit/parts_animals.{2.ii,3.iii,4.iv}.wayback-20000817.html), matching the Wikisource-credited translator exactly. MIT's own live pages for Books II-IV are each themselves truncated at the identical word Wikisource stops at (same underlying page, copied before it broke); the complete text used to supplement them comes from the Wayback Machine's earliest capture on file for each (2000-08-17), which carries both `<A NAME="start">`/`<A NAME="end">` markers and the ordinary closing navigation footer MIT's live copies currently lack.
- **de-partibus-animalium-en / book-2-ch-15** — SUPPLEMENTED: Wikisource's transcription of Book II never carried Chapter 15 at all (its page stops earlier in this same book — see the book-2 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.2.ii.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-2-ch-16** — SUPPLEMENTED: Wikisource's transcription of Book II never carried Chapter 16 at all (its page stops earlier in this same book — see the book-2 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.2.ii.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-2-ch-17** — SUPPLEMENTED: Wikisource's transcription of Book II never carried Chapter 17 at all (its page stops earlier in this same book — see the book-2 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.2.ii.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-3-ch-15** — SUPPLEMENTED: Wikisource's transcription of Book III never carried Chapter 15 at all (its page stops earlier in this same book — see the book-3 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.3.iii.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-4-ch-11** — SUPPLEMENTED: Wikisource's transcription of Book IV never carried Chapter 11 at all (its page stops earlier in this same book — see the book-4 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.4.iv.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-4-ch-12** — SUPPLEMENTED: Wikisource's transcription of Book IV never carried Chapter 12 at all (its page stops earlier in this same book — see the book-4 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.4.iv.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-4-ch-13** — SUPPLEMENTED: Wikisource's transcription of Book IV never carried Chapter 13 at all (its page stops earlier in this same book — see the book-4 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.4.iv.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).
- **de-partibus-animalium-en / book-4-ch-14** — SUPPLEMENTED: Wikisource's transcription of Book IV never carried Chapter 14 at all (its page stops earlier in this same book — see the book-4 tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.4.iv.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).

## Errors

_none_

## Warnings

_none_
