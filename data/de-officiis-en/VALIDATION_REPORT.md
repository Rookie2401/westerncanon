# De Officiis (English) validation report

Generated: 2026-09-20T00:42:01.560Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 3
- sections: 371
- passages: 371
- total passage chars: 323074
- Book 1: 161 sections (expected 161; Latin sibling has 161)
- Book 2: 89 sections (expected 89; Latin sibling has 89)
- Book 3: 121 sections (expected 121; Latin sibling has 121)

## Verbatim spot-check

- OK — book-1 sec-1 incipit
  - got: `My dear son Marcus, you have now been studying a full year under Cratippus, and that too in Athens, `
- OK — final section explicit
  - got: `est affection, you will be dearer to me still, if you find pleasure in such counsel and instruction.`

## Anomalies (preserved, not corrected)

- **book-3** — source XML's own <div subtype="book" n="1"> attribute does not match this book's position in document order (expected "3"); this is a known bug in this Perseus witness (Book III's div is mislabeled n="1") — confirmed via its own <head> rubric and the Latin sibling. Filed under book-3 by document order, not by this witness's own (wrong) n attribute; no reading text is affected.
- **de-officiis-en / structure** — Unlike the Latin sibling, this English witness has no <div subtype="section"> at all - sections are marked purely by inline <milestone unit="section" n="N"/> in a continuous run of <p>s per book, and 50 of 482 <p> elements contain more than one such marker (36 more have running text before their first marker). The importer splits the text stream at each marker's exact position rather than at <p> boundaries; see the module doc for the full algorithm. Despite the structural difference, this witness and the Latin sibling's own <div subtype="section"> count agree exactly, section-for-section (161/89/121).
- **de-officiis-en / book III mislabeled** — This witness's own <div subtype="book" n="…"> for Book III is mislabeled n="1" (duplicating Book I's own n value) instead of "3" - a genuine bug in this Perseus TEI file, confirmed via its <head> rubric ("Book III: the conflict between the right and the expedient") and the correctly-numbered Latin sibling. This importer numbers books by document order (1st/2nd/3rd division encountered), not by this witness's own (wrong) n attribute; no reading text is affected, only which Division id the third book is filed under. See also the per-book anomaly logged above at the point this was detected.
- **de-officiis-en / reading text** — 392 <note> / <note type="marg"> footnotes and marginal summary glosses (Miller's own translator's commentary, not his translated running text) were excluded entirely, tag and content; not logged individually given their number.
- **de-officiis-en / passage & division refs** — 103 chapter milestones and 371 section milestones captured (matching the Latin sibling's 103 chapter milestones exactly); each section's Division.ref is the chapter value in effect when that section's own marker was reached, carried forward from the previous section if it introduced no new chapter itself, reset to null at the start of each book. This source also marks 5 <milestone unit="alternatesection"/> markers (matching the Latin sibling) - dropped as scaffolding, not used for anything. Every Passage.ref is null throughout.
- **de-officiis-en / reading text** — 286 text chunk(s) (delimited by a </p> close or a section-milestone split point) cleaned to empty text were dropped rather than joined as an empty segment.

## Errors

_none_

## Warnings

_none_
