# Athenian Constitution (English, Kenyon) validation report

Generated: 2026-09-23T04:38:17.757Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- chapters: 69
- total passage chars: 140929

## Verbatim spot-check

- OK - ch-1 opening
  - got: `...[They were tried] by a court empanelled from among the noble families, and sworn upon the sacrifices. The part of accuser was taken by My`
- OK - final chapter closing
  - got tail: `the damages. Finally, when all has been completed in accordance with the law, the jurors receive their pay in the order assigned by the lot.`

## Anomalies (preserved, not corrected)

- **athenian-constitution-en / ch-1 / fragmentary opening** - The Athenian Constitution survives only on a papyrus discovered in Egypt in 1890, whose own beginning is lost - every translation of this work, including Kenyon's here, therefore opens mid-sentence. This source's own text begins "...[They were tried] by a court empanelled..." (the bracketed words are Kenyon's own editorial supplement for sense, not an importer artefact) and is kept exactly as printed.
- **athenian-constitution-en / ch-8 / preserved transcriber note** - Part 8 (ch-8) contains one genuine Project Gutenberg transcriber's note embedded inline in the running text: "...any one who, in a time [Transcriber's note: of?] civil factions, did not take up arms..." - the transcriber's own flagged uncertainty about a single word in their source scan. Removing just the bracketed note would leave the sentence missing whatever word it stands in for and would silently paper over a real source uncertainty, so - per this repo's rule of never discarding or silently correcting text - it is kept exactly as printed rather than stripped or "corrected".
- **athenian-constitution-en / Bekker references** - This work carries no Bekker-style page apparatus of any kind: the papyrus was discovered in 1890, fifty-nine years after Bekker's 1831 edition of Aristotle's other works, so it was never assigned Bekker pagination to begin with (unlike data/politics-en and data/categoriae-en). Division.ref is null throughout; nothing is fabricated to supply a citation scheme this work has never had.
- **athenian-constitution-en / front and back matter** - This particular Gutenberg edition carries only a short title page before Part 1 (no separate translator's introduction, preface, or bibliography, unlike its siblings in this importer group) and ends cleanly with "THE END" - no trailing index or notes section of any kind.
- **athenian-constitution-en / division labelling** - Kenyon's own heading for each of this work's 69 divisions in this translation is "Part N", not "Chapter N". This app's "single-book work" convention uses a flat ch-N id regardless of the source's own label, so "Part N" maps directly to ch-N here; Division.sourceHeading stays null (the label itself is not preserved as a distinct field, matching this app's other single-book English editions).

## Errors

_none_

## Warnings

_none_
