# On Sense and the Sensible (English, Beare 1908) validation report

Generated: 2026-09-23T05:38:20.412Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 7
- chapters: 7
- total passage chars: 76795
- 7 chapters (numbers 1-7)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `Having now definitely considered the soul, by itself, and its several faculties, we must n`
- OK — last chapter explicit
  - got: `h organ. Of the remaining subjects, we must first consider that of memory and remembering.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 105
- work paragraphs: 105
- checked (>= 40 chars, not editorial): 105
- declared editorial / furniture (excluded): 0
- **missing: 0**

## Anomalies (preserved, not corrected)

- **de-sensu-en / section-2** — 1 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): {{center|'''THE END'''}}.
- **de-sensu-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with wiki-heading-Part-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-sensu-en / footnotes stripped** — 0 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-sensu-en / section-1** — 4 of the 7 chapters of the standard division are present in this source (highest number present: 4). The remainder is not transcribed on English Wikisource and is not fabricated here.
- **de-sensu-en / section-2** — 3 of the 7 chapters of the standard division are present in this source (highest number present: 7). The remainder is not transcribed on English Wikisource and is not fabricated here.
- **de-sensu-en / parent page (stub)** — The work's parent Wikisource page "On Sense and the Sensible" carries NO treatise text: it is a 451-byte navigation stub holding only a {{header}} template and links to the two Section subpages. Nothing was imported from it. The complete text was found on those subpages, so the empty parent costs the reader nothing and no text was fabricated to compensate.
- **de-sensu-en / section split** — The source splits this treatise across two subpages, "Section I" (Parts 1-4) and "Section II" (Parts 5-7). That split is an artefact of Wikisource page organisation, not a division made by Aristotle or by Beare, so it is NOT reproduced as a structural tier; the chapters are emitted as one flat run of 1-7 using the source's own continuous Part numbering, which runs straight on across the page boundary.
- **de-sensu-en / completeness** — COMPLETE: all 7 chapters of the standard division are present and untruncated.
- **de-sensu-en / reference scheme** — Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source.
- **de-sensu-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-sensu-en was adjusted to match a Greek text.

## Errors

_none_

## Warnings

_none_
