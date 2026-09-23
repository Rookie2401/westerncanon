# On Memory and Reminiscence (English, Beare 1908) validation report

Generated: 2026-09-23T06:17:53.372Z

**Result: FAIL** — 1 error(s), 0 warning(s).

## Counts

- top-level divisions: 2
- chapters: 2
- total passage chars: 27832
- 2 chapters (numbers 1-2)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `We have, in the next place, to treat of Memory and Remembering, considering its nature, it`
- OK — last chapter explicit
  - got: `regards recollection, its formal definition, and the manner and causes-of its performance.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 30
- work paragraphs: 29
- checked (>= 40 chars, not editorial): 30
- declared editorial / furniture (excluded): 0
- **missing: 1**
  - [on-memory-and-reminiscence.json] `el:Περί μνήμης καί αναμνήσεως fr:De la mémoire et de la réminiscence`

## Anomalies (preserved, not corrected)

- **de-memoria-en / page** — Wikisource furniture templates dropped from the reading text (transport scaffolding only, no translated words removed): {{pd-old}} x2, {{translation license}} x1.
- **de-memoria-en / page** — 3 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): {{center|'''THE END'''}} | [[el:Περί μνήμης καί αναμνήσεως]] | [[fr:De la mémoire et de la réminiscence]].
- **de-memoria-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with wiki-heading-Part-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-memoria-en / footnotes stripped** — 0 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-memoria-en / completeness** — COMPLETE: both chapters of the standard division are present and untruncated. The page is real transcribed prose, not a stub.
- **de-memoria-en / reference scheme** — Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source.
- **de-memoria-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-memoria-en was adjusted to match a Greek text.

## Errors

- **[text-accounting]** 1 paragraph(s) of the raw source are ABSENT from the shipped reading text (and are not declared editorial):
    [on-memory-and-reminiscence.json] el:Περί μνήμης καί αναμνήσεως fr:De la mémoire et de la réminiscence

## Warnings

_none_
