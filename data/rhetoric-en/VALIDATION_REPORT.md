# Rhetoric (English, Freese) validation report

Generated: 2026-09-23T04:29:26.017Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 3
- chapters: 60
- total passage chars: 360889
- Book 1: 15 chapters (traditionally cited 15)
- Book 2: 26 chapters (traditionally cited 26)
- Book 3: 19 chapters (traditionally cited 19)

## Verbatim spot-check

- OK — book-1 ch-1 incipit
  - got: `Rhetoric is a counterpart of Dialectic; for both have to do with matters that are in a manner within the cognizance of all men and not confi`
- OK — final chapter (book-3 ch-19) explicit
  - got: `ticles, in order that it may be a peroration, but not an oration: I have spoken; you have heard; you know the facts; now give your decision.`

## Anomalies (preserved, not corrected)

- **book-2-ch-15** — No Bekker page milestone found in this chapter; Division.ref left null rather than fabricated.
- **rhetoric-en / chapter counts** — All 3 books parse to exactly the traditionally cited chapter counts (I: 15, II: 26, III: 19) - no mismatch to reconcile.
- **rhetoric-en / reading text** — 639 <note resp="Freese"> footnotes (translator's commentary, cross-references and source citations - not the translated running text) were excluded entirely, tag and content, including the 147 <bibl> elements they contain; not logged individually given their number.
- **rhetoric-en / structure** — This source nests an extra <div type="textpart" subtype="section"> level (Freese's own Bekker-line-keyed sub-numbering, e.g. "1.1.1") between chapter and paragraph, labelled explicitly (unlike the unlabelled "subsection" level in the Nicomachean Ethics English witness). It carries no information this app's two-level Book->Chapter schema needs, so every <p> under a chapter div is read straight through regardless of its section nesting depth, in document order, into that chapter's single Passage. A small number of section divs (31 of 882) contain two <p> elements rather than one; both are kept, joined with the rest.
- **rhetoric-en / passage & division refs** — 134 Bekker page milestones captured; each chapter's Division.ref is the first–last page value seen in that chapter's own document order. Every Passage.ref is null: no Bekker milestone is printed at the per-paragraph level, only per-page.

## Errors

_none_

## Warnings

_none_
