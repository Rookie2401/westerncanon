# Eudemian Ethics (English, Solomon — Books I, II, III, VII only) validation report

Generated: 2026-09-23T05:38:05.084Z

**Result: FAIL** — 1 error(s), 0 warning(s).

## Counts

- top-level divisions: 4
- chapters: 41
- total passage chars: 198133
- Book 1: 8 chapters (numbers 1-8)
- Book 2: 11 chapters (numbers 1-11)
- Book 3: 7 chapters (numbers 1-7)
- Book 7: 15 chapters (numbers 1-15)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `The man who stated his judgement in the god's precinct in Delos made an inscription on the`
- FAIL — last chapter explicit
  - got: `ible.

So much, then, for the standard of perfection and the object of the absolute goods.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 161
- work paragraphs: 155
- checked (>= 40 chars, not editorial): 153
- declared editorial / furniture (excluded): 1
- **missing: 0**

## Anomalies (preserved, not corrected)

- **eudemian-ethics-en / book-1** — 2 paragraph(s) on this page are not wrapped in a <p> element by the source: where a printed paragraph straddles a scanned page boundary, the transclusion closes the paragraph at the break and emits the continuation as loose text and inline elements. Those runs are genuine translation (in one case an entire chapter opening, bold chapter number included) and are recovered and read exactly like ordinary paragraphs; a parser that walked only <p> elements would drop them silently.
- **eudemian-ethics-en / book-1** — This page renders as 2 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **eudemian-ethics-en / book-2** — 1 tabulation(s) in the source were flattened into a single paragraph each, their cells taken in document order (row by row, left to right). The source sets these out as HTML tables — in the Eudemian Ethics, Aristotle's three-column table of excesses, deficiencies and means — and this schema has no table tier; every word is preserved in reading order, but the column layout is not. Note that such tables lie outside any <p> element and were captured only after this parser learned to read loose runs.
- **eudemian-ethics-en / book-2** — 4 paragraph(s) on this page are not wrapped in a <p> element by the source: where a printed paragraph straddles a scanned page boundary, the transclusion closes the paragraph at the break and emits the continuation as loose text and inline elements. Those runs are genuine translation (in one case an entire chapter opening, bold chapter number included) and are recovered and read exactly like ordinary paragraphs; a parser that walked only <p> elements would drop them silently.
- **eudemian-ethics-en / book-2** — This page renders as 2 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **eudemian-ethics-en / book-3** — 8 paragraph(s) on this page are not wrapped in a <p> element by the source: where a printed paragraph straddles a scanned page boundary, the transclusion closes the paragraph at the break and emits the continuation as loose text and inline elements. Those runs are genuine translation (in one case an entire chapter opening, bold chapter number included) and are recovered and read exactly like ordinary paragraphs; a parser that walked only <p> elements would drop them silently.
- **eudemian-ethics-en / book-3** — This page renders as 2 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **eudemian-ethics-en / book-7** — This page renders as 3 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **eudemian-ethics-en / source technique** — This work's Wikisource pages are djvu PAGE-SCAN TRANSCLUSIONS: their wikitext is only a few hundred bytes of <pages index="..." from=X to=Y /> markup, so action=parse&prop=wikitext returns no text at all. The RENDERED HTML was fetched once per page via action=parse&prop=text and parsed with jsdom, exactly as scripts/import-aristotle-metaphysics-en does. Chapter markers in this source take the "leading-bold" form and Bekker page markers the "span.wst-verse" form — both verified by direct inspection of this work's own HTML, not assumed from any other work in the library.
- **eudemian-ethics-en / footnotes stripped** — 352 inline footnote/superscript marker(s) were removed from the reading text; the translator's notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved anywhere in this build.
- **eudemian-ethics-en / reference scheme** — 36 chapter(s) carry a Bekker page reference reconstructed from the source's own span.wst-verse markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented.
- **eudemian-ethics-en / books 4, 5, 6 (ABSENT BY DESIGN)** — BOOKS IV, V AND VI ARE NOT PRESENT, AND NOTHING WAS FABRICATED OR COPIED IN TO REPLACE THEM. In the Greek tradition these are the "common books", identical with Nicomachean Ethics V, VI and VII, so Solomon never re-translated them. Three independent confirmations were obtained before this importer was written: (1) the Wikisource parent page states in its header notes that "Books IV, V, VI of the Eudemian Ethics are identical to Nicomachean Ethics Books V, VI, VII, so were not translated by Solomon"; (2) its contents list prints that equation where the book links would be, linking only to /Book 1, /Book 2, /Book 3 and /Book 7; (3) a batched MediaWiki existence check for "Eudemian Ethics/Book 4", "/Book 5" and "/Book 6" returns `missing` for all three — the pages do not exist at all, not even as untranscribed red-link stubs. The printed text agrees: Book 7 opens with the running line "BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII." Explicitly NOT done: copying those books from data/nicomachean-ethics-en or any other edition to make the numbering continuous; that is a different translator's words from a different edition and would be a fabrication here. The book numbering 1, 2, 3, 7 is the source's own and is preserved exactly.
- **eudemian-ethics-en / book 8 (folded into book 7)** — There is no separate Book VIII in this edition, and none is missing: following one manuscript tradition, Solomon's edition appends Book VIII's material to Book VII as sections 13-15, as the work's own Wikisource page states. That material is present as book-7 chapters 13, 14 and 15; the source confirms the identification by tagging chapter 13 with an internal HTML anchor named "book8".
- **eudemian-ethics-en / completeness of books 1, 2, 3, 7** — COMPLETE and untruncated for the four books that exist, in gapless chapter runs (Book I 1-8, Book II 1-11, Book III 1-7, Book VII 1-15). Every page-scan behind them is fully proofread, with ZERO red-link ("page does not exist") occurrences across all four subpages, so no chapter breaks off mid-sentence anywhere in this work.
- **eudemian-ethics-en / CORRECTION to an earlier build of this edition** — An earlier build of this edition was WRONG about three things, and the fault was this importer's rather than the source's. (1) It reported Book II as lacking a chapter 6 and Book III as lacking a chapter 2 and stopping at 6. Those chapter openings are in fact printed, but where a scanned page boundary falls the transclusion emits them OUTSIDE any <p> element, and the parser walked only <p> elements. (2) It shipped Book VII with 12 chapters instead of 15, losing about 19,700 characters: chapters 13-15 render in a SECOND div.prp-pages-output block (a page emits one such block per <pages .../> tag) and only the first block was read. (3) Chapter 13's number sits inside a wst-anchor span rather than standing free, so even reading the second block did not by itself recover it. All three are fixed; every book is now a gapless run, and the text reconciles paragraph-for-paragraph against the cached raw HTML (see VALIDATION_REPORT.md's text-accounting section).
- **eudemian-ethics-en / chapter marker rule** — Chapters are marked by a bold number at the head of a paragraph. Only a <b> element that is the paragraph's FIRST child and whose text is a bare 1-2 digit integer is accepted as a marker, because this same source also renders its Bekker page references as bold numbers (e.g. <b>1219a</b>) inside mid-paragraph span.wst-verse elements; a looser "any bold number" rule would split the text into hundreds of false chapters.
- **eudemian-ethics-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of the Eudemian Ethics; the two are not forced to agree on book or chapter boundaries, and no division here was adjusted to match a Greek text.

## Errors

- **[spot-check-explicit]** last chapter (book-7-ch-15) does not end with the expected verbatim explicit (got tail: "ible.\n\nSo much, then, for the standard of perfection and the object of the absolute goods.")

## Warnings

_none_
