# On the Heavens (English, Stocks 1922) validation report

Generated: 2026-09-23T05:37:55.424Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 4
- chapters: 40
- total passage chars: 225223
- Book 1: 12 chapters (numbers 1-12)
- Book 2: 14 chapters (numbers 1-14)
- Book 3: 8 chapters (numbers 1-8)
- Book 4: 6 chapters (numbers 1-6)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `The science which has to do with nature clearly concerns itself for the most part with bod`
- OK — last chapter explicit
  - got: `ished our examination of the heavy and the light and of the phenomena connected with them.`

## Text accounting (raw source vs. shipped work)

Every paragraph of the cached raw response is rebuilt by an independent traversal
(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,
editorial header/licence blocks, running titles and any declared front matter are
excluded; anything else that is absent is an error.

- raw paragraphs: 153
- work paragraphs: 158
- checked (>= 40 chars, not editorial): 153
- declared editorial / furniture (excluded): 0
- **missing: 0**

## Anomalies (preserved, not corrected)

- **de-caelo-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with wiki-heading-Part-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-caelo-en / footnotes stripped** — 0 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-caelo-en / book-1-ch-12** — SUPPLEMENTED: the Wikisource transcription of Book I ends mid-sentence at exactly this point ("...But when terms stand to one another as these do, F and H coincident,") because it was itself copied from the MIT Internet Classics Archive's page for this book, which cuts off at the same word. MIT's own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length, a genuine server-side bug, not a download error). Everything from "E and F never predicated..." onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-17), matched byte-for-byte against Wikisource's own last words with no wording difference, and joined with a single space (the cut fell at a word boundary). See this importer's module doc and raw/supplement-decaelo-1-12-tail.txt for the full account.
- **de-caelo-en / reference scheme** — Division.ref and Passage.ref are null for every division of this work: this plaintext digitisation prints no Bekker page/column markers at all (confirmed across all four book pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source.
- **de-caelo-en / chapter numbering** — The source heads its chapters "Part N"; they are the chapters of the standard division and are imported under this app's ordinary Chapter numbering without renumbering. The counts match the standard division exactly: Book I 12, Book II 14, Book III 8, Book IV 6 chapters.
- **de-caelo-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of De caelo in this library; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.
- **de-caelo-en / MIT supplement source verification** — MIT's Internet Classics Archive credits this translation "Translated by J. L. Stocks" on the fetched page (verified by direct inspection of raw/mit/heavens.1.i.wayback-20000817.html), matching the Wikisource-credited translator exactly. MIT's own live page for this book is itself truncated at the identical word Wikisource stops at; the complete text used to supplement it comes from the Wayback Machine's earliest capture on file (2000-08-17), which carries both `<A NAME="start">`/`<A NAME="end">` markers and the ordinary closing navigation footer MIT's live copy currently lacks.

## Errors

_none_

## Warnings

_none_
