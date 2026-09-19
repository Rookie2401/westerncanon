# Posterior Analytics (English, Bouchier) validation report

Generated: 2026-09-19T20:32:58.585Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 2
- chapters: 55
- total passage chars: 212538
- Book 1: 34 chapters (traditional Chapters I-34)
- Book 2: 21 chapters (traditional Chapters I-19 + Appendix Chapters 23, 24)

## Verbatim spot-check

- OK — book-1 ch-1 body incipit
  - got: `All communications of knowledge from teacher to pupil by way of reasoning pre-suppose some`
- OK — final chapter explicit
  - got: `the minor, and does not make use of all the individual instances, but only of some or one.`

## Anomalies (preserved, not corrected)

- **posterior-analytics-en / book-2-ch-23 .. book-2-ch-24** — These two chapters ("On Induction", "On Example") come from a separate Wikisource page titled "Posterior Analytics (Bouchier)/Book II/Appendix" rather than the ordinary ".../Book II/Chapter N" pattern used for Chapters I-XIX. On that page they are nonetheless printed as ordinary further Bouchier chapters, numbered XXIII and XXIV, continuing his own numbering — Chapters XX, XXI and XXII simply do not exist in this translation (this is Bouchier's own scheme, not an importer gap: the English Wikisource prefixsearch enumerated exactly Book II Chapters I-XIX plus this one further "Appendix" page, no others). Rather than inventing a generic "Appendix" container division (which would discard Bouchier's own specific, informative chapter titles), both are imported as ordinary Chapter divisions (book-2-ch-23, book-2-ch-24) using Bouchier's own printed numbers and titles exactly like every other chapter. The page's own "Appendix" framing is preserved only here, in this anomaly note — it is not fabricated into editorialTitle or sourceHeading.
- **posterior-analytics-en / (work level)** — This source carries no Bekker page/column/line markers anywhere (confirmed by direct inspection of every one of the 54 raw pages) — unlike the Greek sibling data/posterior-analytics-grc/, whose Bekker refs are reconstructed from its own inline {{χ|...}} markers. Division.ref and Passage.ref are therefore null throughout this English edition; citation is by Book/Chapter (plus Bouchier's own chapter title) only.
- **posterior-analytics-en / (work level)** — Bouchier's own scholarly footnotes (9 of them, on 8 of the 54 pages — e.g. textual-variant notes citing "the Clarendon Press Edition", or a cross-reference to de Partibus Animalium) are editorial apparatus, not Aristotle's words. Every inline <ref>...</ref> marker and the trailing "===Notes===" / <references /> section on each page that has one are dropped entirely from the reading text, mirroring how translator/editor footnote apparatus is dropped elsewhere in this repo (e.g. the NPNF editor's footnotes in the Augustine English imports).
- **posterior-analytics-en / (work level)** — Each chapter's italicised one-paragraph "argument" (Bouchier's own chapter summary, printed as ":''...''" wikitext immediately under the chapter title) is genuine translator's prose, not source apparatus or a citation marker, and is kept as the first paragraph of that chapter's Passage.text — joined with the body paragraphs by "\n\n", per the target schema — rather than discarded.

## Errors

_none_

## Warnings

_none_
