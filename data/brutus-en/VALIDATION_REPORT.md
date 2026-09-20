# brutus-en validation report

Generated: 2026-09-20T00:38:31.527Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (all levels): 17
- leaf divisions: 17
- passages: 17
- total passage chars: 250127
- chunk sizes: min 7789, max 32874, mean 14713

## Verbatim spot-check

- OK - first passage starts "When I had left Cilicia, and arrived at Rhodes"
  - got: `When I had left Cilicia, and arrived at Rhodes, word was brought me of`
- OK - final (sec-17) ends ""--[Caetera defunt.]"
  - got: `only add, that if I had been so fortunate, &c, &c,"--[Caetera defunt.]`

## Anomalies (preserved, not corrected)

- **brutus-en / front matter** - E. Jones's own translator's "PREFACE." (2988 characters, describing both Brutus and Orator and his approach to translating them) precedes Brutus's own heading in the source and is not part of either work's translated running text; excluded from both editions.
- **brutus-en / footnotes** - 38 "[Footnote: ...]" translator/transcriber asides (combined across Brutus and Orator, this work's own share not separately delimited in the shared source) were excluded entirely - Jones's own explanatory glosses, not his translated running text.
- **brutus-en / italic markup** - 543 underscore characters (Gutenberg's plain-text italic-markup convention, e.g. "_Civil War_") were stripped from Brutus's text; this schema has no rich-text field. One doubled "__metaphorical_" (a transcription glitch, not a real word) normalises the same way as every other case since only the markup character is removed.
- **brutus-en / division scheme** - Jones's 1776 translation prints no chapter/section numbers anywhere in Brutus's text (confirmed by direct inspection of the whole source file). Per the task brief's own fallback guidance, this edition is divided into 15000-character reading chunks (paragraphs grouped in document order, never split) - these sec-N numbers are this importer's own sequential labels only and do NOT correspond to the Latin sibling's Wilkins section numbers. See about.json and data/brutus-en/types.ts.

## Errors

_none_

## Warnings

_none_
