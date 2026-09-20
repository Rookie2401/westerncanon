# De Legibus (Latin) validation report

Generated: 2026-09-20T00:41:57.883Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 3
- sections: 241
- passages: 241
- total passage chars: 124834
- Book 1: 63 sections (expected 63)
- Book 2: 69 sections (expected 69)
- Book 3: 109 sections (expected 109)

## Verbatim spot-check

- OK — book-1 sec-1 incipit
  - got: `Atticvs Lucus quidem ille et haec Arpinatium quercus agnoscitur, saepe a me lectus in Mario: si enim`
- OK — book-3 final section explicit (breaks off mid-dialogue)
  - got: `Atticus Sic prorsum censeo, et id ipsum quod dicis exspecto.*`

## Anomalies (preserved, not corrected)

- **book-1** — A bracketed span was excluded from the reading text as a Wikisource-added citation/gloss (editorial judgement call - see the importer's module doc), not Cicero's own words: "[de amicitia locus]"
- **book-1** — A bracketed span was excluded from the reading text as a Wikisource-added citation/gloss (editorial judgement call - see the importer's module doc), not Cicero's own words: "[quod Apollo praecepit Pythius]"
- **book-1-sec-1** — 7 char(s) of running text found before this book's first "[1]" marker ("Atticvs") - folded into section 1 rather than discarded or filed unnumbered.
- **book-2** — A bracketed span was excluded from the reading text as a Wikisource-added citation/gloss (editorial judgement call - see the importer's module doc), not Cicero's own words: "[*Plutarch. quaest. Rom. 34]"
- **book-3** — A bracketed span was excluded from the reading text as a Wikisource-added citation/gloss (editorial judgement call - see the importer's module doc), not Cicero's own words: "[Macrobius de differentiis et societatibus 17,6: Cicero de legibus tertio: Qui poterit socios tueri, si dilectum rerum utilium et inutilium non habebit? Ü convertem lex in omnis est.]"
- **book-3** — This page marks 20 traditional "Caput" (chapter) divisions with an inline Roman numeral (I..XX, sequential, no gaps) before the first paragraph of each chapter. Per the import brief, Division.ref stays null throughout this work, so these numerals are stripped as structural scaffolding (like a milestone elsewhere in this app) rather than used for anything; they are not part of Cicero's own sentence.
- **book-3** — 49 {{pn|N}} page-number template(s) (marking the printed page breaks of whatever edition this transcription follows - see the provenance-gap note) were stripped as scaffolding; not part of Cicero's own text.
- **book-3 / completeness** — This page’s transcription of Book 3 ends abruptly: the final surviving line of dialogue ("Atticus Sic prorsum censeo, et id ipsum quod dicis exspecto.*") is followed immediately by a bare "*" and nothing else - no closing formula, mid-argument (Atticus has just invited Marcus to continue). This matches the traditional understanding that De Legibus, like De Republica, is incompletely transmitted; confirmed directly against this source, not assumed. The trailing "*" itself is this source’s own paratextual mark for "text breaks off here" and is kept verbatim rather than stripped, like the other bare "*" marks elsewhere in this work.
- **book-2-sec-5** — A bare "*" in the running text (context: "…aior, haec in ea contineatur. * duas hab…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.
- **book-2-sec-28** — A 103-character ⟨…⟩ span is kept verbatim here - far longer than the ordinary single-word supplements elsewhere in this text, beginning "⟨magnumque consecravit gymnasiis in simulacra Amorum et Cupi"…. This reads as a substantial passage the source's own editorial tradition marks as belonging to a separate strand of transmission (not a simple gap-filling conjecture); kept 100% verbatim per this work's angle-bracket policy.
- **book-2-sec-39** — A bare "*" in the running text (context: "…nunc ut eadem exultet ⟨cavea⟩ * cervices…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.
- **book-2-sec-41** — A bare "*" in the running text (context: "…orum satis in lege dictum est * ac votis…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.
- **book-2-sec-54** — A 531-character ⟨…⟩ span is kept verbatim here - far longer than the ordinary single-word supplements elsewhere in this text, beginning "⟨Venio ad Manium iura, quae maiores nostri et sapientissime "…. This reads as a substantial passage the source's own editorial tradition marks as belonging to a separate strand of transmission (not a simple gap-filling conjecture); kept 100% verbatim per this work's angle-bracket policy.
- **book-3-sec-51** — A bare "*" in the running text (context: "…et sapiens temperatio accessit*…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.
- **book-3-sec-109** — A bare "*" in the running text (context: "…id ipsum quod dicis exspecto.*…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.
- **de-legibus-la / provenance** — Latin Wikisource does not cite a specific source critical edition for any of the three De legibus pages - no editor, no year, no publisher is given ("editio: incognita" / "fons: incognitus" in Wikisource’s own categorisation terms). The Latin text itself is ancient and unquestionably public domain regardless of which modern edition transcribed it, but the specific editorial lineage of this particular transcription is not stated by the source; disclosed here rather than invented - see about.json.
- **de-legibus-la / numbering scheme** — Book 1 and Book 2 use this source's own bracketed "[N]" paragraph numbers (sequential, no gaps, 63 and 69 respectively). Book 3 carries no such numbering at all in this source, so its sections (109 of them) are numbered SEQUENTIALLY BY PARAGRAPH by this importer - editorially-assigned sequential numbers, not the source's own; this is a deliberate, disclosed fallback (see the import brief), not an inconsistency.

## Errors

_none_

## Warnings

_none_
