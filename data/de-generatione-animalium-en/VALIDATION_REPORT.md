# On the Generation of Animals (English, Platt 1912) validation report

Generated: 2026-09-23T05:37:57.753Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 5
- chapters: 60
- total passage chars: 373151
- Book 1: 23 chapters (numbers 1-23)
- Book 2: 8 chapters (numbers 1-8)
- Book 3: 11 chapters (numbers 1-11)
- Book 4: 10 chapters (numbers 1-10)
- Book 5: 8 chapters (numbers 1-8)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `WE have now discussed the other parts of animals, both generally and with reference to the`
- OK — last chapter explicit
  - got: `ur not for any final end but of necessity and on account of the motive or efficient cause.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 423
- work paragraphs: 377
- checked (>= 40 chars, not editorial): 376
- declared editorial / furniture (excluded): 0
- **missing: 0**

## Anomalies (preserved, not corrected)

- **de-generatione-animalium-en / book-1** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): [[el:Περί ζώων γενέσως/1]].
- **de-generatione-animalium-en / book-2** — 2 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): Book II | [[el:Περί ζώων γενέσως/2]].
- **de-generatione-animalium-en / book-3** — 2 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): Book III | [[el:Περί ζώων γενέσως/3]].
- **de-generatione-animalium-en / book-4** — 2 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): Book IV | [[el:Περί ζώων γενέσως/4]].
- **de-generatione-animalium-en / book-5** — 2 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): Book V | [[el:Περί ζώων γενέσως/5]].
- **de-generatione-animalium-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with bare-line-N and wiki-heading-Part-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-generatione-animalium-en / footnotes stripped** — 0 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-generatione-animalium-en / completeness** — COMPLETE: all 5 books and all 60 chapters of the standard division are present and untruncated (I 23, II 8, III 11, IV 10, V 8). Nothing was skipped, and nothing was fabricated.
- **de-generatione-animalium-en / chapter marker shapes** — The five source pages do NOT mark chapters the same way: Book I uses "==Part N==" wiki headings, Books II-V use a bare line containing only the chapter number. Both were handled; a headings-only parser would have returned zero chapters for Books II-V. The bare-number rule only fires on a line that is nothing but digits at a paragraph boundary, so ordinary short sentences in the text (e.g. Book V's "So much for colours and hairs.") are not mistaken for markers.
- **de-generatione-animalium-en / reference scheme** — Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all (confirmed across all five book pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source.
- **de-generatione-animalium-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of De generatione animalium; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.

## Errors

_none_

## Warnings

_none_
