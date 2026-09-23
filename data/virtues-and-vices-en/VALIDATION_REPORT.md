# Virtues and Vices (English, Solomon — pseudo-Aristotle) validation report

Generated: 2026-09-23T05:38:11.348Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 8
- chapters: 8
- total passage chars: 10653
- 8 chapters (numbers 1-8)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `The noble is the object of praise, the base of blame: at the head of what is noble stand t`
- OK — last chapter explicit
  - got: `ites; and all these marks and accompaniments of vice belong to the class of the blameable.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 22
- work paragraphs: 21
- checked (>= 40 chars, not editorial): 21
- declared editorial / furniture (excluded): 0
- **missing: 0**

## Anomalies (preserved, not corrected)

- **virtues-and-vices-en / page** — 1 paragraph(s) on this page are not wrapped in a <p> element by the source: where a printed paragraph straddles a scanned page boundary, the transclusion closes the paragraph at the break and emits the continuation as loose text and inline elements. Those runs are genuine translation (in one case an entire chapter opening, bold chapter number included) and are recovered and read exactly like ordinary paragraphs; a parser that walked only <p> elements would drop them silently.
- **virtues-and-vices-en / page** — This page renders as 2 separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.
- **virtues-and-vices-en / source technique** — This work's Wikisource pages are djvu PAGE-SCAN TRANSCLUSIONS: their wikitext is only a few hundred bytes of <pages index="..." from=X to=Y /> markup, so action=parse&prop=wikitext returns no text at all. The RENDERED HTML was fetched once per page via action=parse&prop=text and parsed with jsdom, exactly as scripts/import-aristotle-metaphysics-en does. Chapter markers in this source take the "leading-bold" form and Bekker page markers the "span.wst-verse" form — both verified by direct inspection of this work's own HTML, not assumed from any other work in the library.
- **virtues-and-vices-en / footnotes stripped** — 1 inline footnote/superscript marker(s) were removed from the reading text; the translator's notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved anywhere in this build.
- **virtues-and-vices-en / reference scheme** — 4 chapter(s) carry a Bekker page reference reconstructed from the source's own span.wst-verse markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented.
- **virtues-and-vices-en / authorship** — PSEUDO-ARISTOTLE. This tract is not now regarded as Aristotle's own; its date and author are unknown, and the Wikisource page's own header describes it as "a short Aristotelian tract of uncertain date and authorship". It is bundled under Aristotle's name because the Oxford edition transmits it that way (Solomon's translation was printed as an appendix to his Eudemian Ethics, data/eudemian-ethics-en), with the doubt recorded here and in about.json rather than hidden.
- **virtues-and-vices-en / structure** — FLAT single-book work: the tract has no book division, so division ids are `ch-N` rather than `book-N-ch-M`. This was confirmed by inspecting the rendered page, which carries no book heading of any kind.
- **virtues-and-vices-en / completeness** — COMPLETE and untruncated: all 8 chapters in a gapless run. The page-scan behind this text is fully proofread, with ZERO red-link ("page does not exist") occurrences, so no chapter breaks off mid-sentence.
- **virtues-and-vices-en / CORRECTION to an earlier build of this edition** — An earlier build shipped this work as 7 chapters (1-5, 7-8) and recorded chapter 6 as a number "the source does not print". That was WRONG, and the fault was this importer's. Chapter 6 opens exactly where a scanned page boundary falls; at such a break the transclusion closes the preceding paragraph and emits the new chapter's opening - its bold chapter number included - as loose text and inline elements OUTSIDE any <p> element. The parser walked only <p> elements and so could not see it, losing roughly 260 characters of text along with the division. The shared parser now gathers those loose runs, and a text-accounting check in validate.ts reconciles every paragraph of the cached raw HTML against the shipped work so the same class of fault fails the build.

## Errors

_none_

## Warnings

_none_
