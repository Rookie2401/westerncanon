# On Plants (English, Forster 1913 — pseudo-Aristotle) validation report

Generated: 2026-09-23T05:38:14.010Z

**Result: FAIL** — 2 error(s), 0 warning(s).

## Counts

- top-level divisions: 2
- chapters: 17
- total passage chars: 71857
- Book 1: 7 chapters (numbers 1-7)
- Book 2: 10 chapters (numbers 1-10)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `Life is found in animals and plants; but while in animalsit is clearly manifest, in plants`
- FAIL — last chapter explicit
  - got: `and dryness will prevail, and the fruit will become bitter.

Here ends the book on Plants.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 59
- work paragraphs: 44
- checked (>= 40 chars, not editorial): 43
- declared editorial / furniture (excluded): 15
- **missing: 1**
  - [on-plants.parse.json] `The shedding of leaves from trees will be due to the tendency to fall, induced by quickly `

## Anomalies (preserved, not corrected)

- **de-plantis-en / page** — 1 tabulation(s) in the source were flattened into a single paragraph each, their cells taken in document order (row by row, left to right). The source sets these out as HTML tables — in the Eudemian Ethics, Aristotle's three-column table of excesses, deficiencies and means — and this schema has no table tier; every word is preserved in reading order, but the column layout is not. Note that such tables lie outside any <p> element and were captured only after this parser learned to read loose runs.
- **de-plantis-en / page** — Reading text found before this page's first chapter marker; the source prints no number there, so it was kept as chapter 1 of book 2: "A plant has three powers, the first derived from the element of earth, the secon"
- **de-plantis-en / page** — Unrendered sidenote template removed from the reading text: the source contains a mistyped, unclosed "{{... sidenote|826" marker, which MediaWiki emits as literal wiki markup in the middle of a sentence rather than as a margin note. It is transport scaffolding that failed to render, not a word of the translation, so it is stripped; the Bekker page 826 it carries is kept as a reference for this chapter. Its column letter is not recoverable at this point (the source places it in a separate superscript element), so the page is recorded without one.
- **de-plantis-en / page** — Unrendered sidenote template removed from the reading text: the source contains a mistyped, unclosed "{{... sidenote|828" marker, which MediaWiki emits as literal wiki markup in the middle of a sentence rather than as a margin note. It is transport scaffolding that failed to render, not a word of the translation, so it is stripped; the Bekker page 828 it carries is kept as a reference for this chapter. Its column letter is not recoverable at this point (the source places it in a separate superscript element), so the page is recorded without one.
- **de-plantis-en / page** — This page renders as 2 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **de-plantis-en / page** — This single Wikisource page carries more than one book; it was split on the source's own "BOOK N" headings into 2 books (chapters found, as book:chapter — 1:1, 1:2, 1:3, 1:4, 1:5, 1:6, 1:7, 2:1, 2:2, 2:3, 2:4, 2:5, 2:6, 2:7, 2:8, 2:9, 2:10).
- **de-plantis-en / source technique** — This work's Wikisource pages are djvu PAGE-SCAN TRANSCLUSIONS: their wikitext is only a few hundred bytes of <pages index="..." from=X to=Y /> markup, so action=parse&prop=wikitext returns no text at all. The RENDERED HTML was fetched once per page via action=parse&prop=text and parsed with jsdom, exactly as scripts/import-aristotle-metaphysics-en does. Chapter markers in this source take the "sidenote-number" form and Bekker page markers the "span.wst-sidenote" form — both verified by direct inspection of this work's own HTML, not assumed from any other work in the library.
- **de-plantis-en / footnotes stripped** — 198 inline footnote/superscript marker(s) were removed from the reading text; the translator's notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved anywhere in this build.
- **de-plantis-en / reference scheme** — 15 chapter(s) carry a Bekker page reference reconstructed from the source's own span.wst-sidenote markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented.
- **de-plantis-en / structure (two books, established by inspection)** — This batch's brief left open whether On Plants has book/chapter divisions or is one short flowing text. INSPECTION ANSWERED: it has TWO BOOKS. The rendered page marks them itself with <div class="wst-heading">BOOK I</div> and BOOK II, so this edition is a two-level Book -> Chapter tree split on the source's own headings: Book I chapters 1-7, Book II chapters 1-10.
- **de-plantis-en / book-2-ch-1 (unmarked in the source)** — The source prints NO chapter number at the start of Book II — its marginal numbering resumes visibly at 2 — so Book II chapter 1 is recovered from the book boundary itself: the text standing between the "BOOK II" heading and the first printed "2". Nothing is invented and nothing is moved; the chapter contains exactly what the source prints at that point. Recorded because the chapter number, unlike every other in this work, is this importer's inference from the source's own structure rather than a figure the source prints.
- **de-plantis-en / front matter EXCLUDED** — The page's first 14 paragraphs are the 1913 title page (DE PLANTIS / BY / E. S. FORSTER / OXFORD / AT THE CLARENDON PRESS / 1913), Forster's own signed five-paragraph PREFACE on the treatise's authorship and textual history, and a CONTENTS heading. That is the translator's editorial apparatus, not the treatise, so the import starts at the first paragraph of the text proper. Excluded deliberately and recorded here rather than quietly dropped; the preface's substance is summarised in about.json instead of being passed off as part of the work.
- **de-plantis-en / marker disambiguation (shared container)** — This source places its Bekker page markers AND its chapter numbers in the SAME span.wst-sidenote margin element, so the two cannot be told apart by position. They are distinguished by shape instead: a bare 1-2 digit integer is a chapter number, a page/column token such as "815a" is a Bekker reference, and a line range such as "9–11" is neither and is ignored. This is why the shared parser requires a column letter on two-digit Bekker numbers — without that rule, chapter "10" would have been read as a page reference.
- **de-plantis-en / red link falls in the excluded preface** — The page contains one red-link ("page does not exist") anchor, but it sits inside Forster's PREFACE — an unrelated author link — which this edition does not import. No reading text is truncated anywhere in the treatise itself.
- **de-plantis-en / transcription oddities preserved verbatim** — Two source oddities are kept exactly as the source has them, per this repo's rule never to silently correct: (1) the very first sentence reads "but while in animalsit is clearly manifest", a missing space present in the Wikisource HTML itself and not introduced by this importer (confirmed by inspecting the raw markup); (2) the final chapter ends with the printed colophon "Here ends the book on Plants." followed by a line of Greek hexameter, both of which stand inside the transcribed text block and are therefore kept as part of the work rather than stripped as furniture.
- **de-plantis-en / authorship** — PSEUDO-ARISTOTLE. The De plantis is not Aristotle's: the Wikisource page's own header calls it "widely believed to be spurious and instead to be by Nicolaus of Damascus", and Forster's preface explains that the lost Greek original reached Latin via Arabic and a further Greek retranslation. Forster translated from the Latin version of Alfredus as edited by E. H. F. Meyer. Bundled under Aristotle's name because the Oxford edition transmits it that way, with the doubt recorded rather than hidden.

## Errors

- **[spot-check-explicit]** last chapter (book-2-ch-10) does not end with the expected verbatim explicit (got tail: "and dryness will prevail, and the fruit will become bitter.\n\nHere ends the book on Plants.")
- **[text-accounting]** 1 paragraph(s) of the raw source are ABSENT from the shipped reading text (and are not declared editorial):
    [on-plants.parse.json] The shedding of leaves from trees will be due to the tendency to fall, induced by quickly 

## Warnings

_none_
