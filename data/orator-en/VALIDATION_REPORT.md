# orator-en validation report

Generated: 2026-09-20T00:38:34.501Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (all levels): 14
- leaf divisions: 14
- passages: 14
- total passage chars: 191915
- chunk sizes: min 8911, max 14978, mean 13708

## Verbatim spot-check

- OK - first passage starts "Which, my Brutus, would be the most difficult talk"
  - got: `Which, my Brutus, would be the most difficult talk,--to decline answer`
- OK - final (sec-14) ends "my abilities are unequal."
  - got: `resumption of undertaking a subject to which my abilities are unequal.`

## Anomalies (preserved, not corrected)

- **orator-en / front matter** - A second title-page block for Orator (247 characters: "THE ORATOR, BY MARCUS TULLIUS CICERO; ADDRESSED TO MARCUS BRUTUS; And now first translated from the Original Latin." plus a Milton epigraph, "Song charms the Sense, but Eloquence the Soul.") sits between the end of Brutus's text and Orator's own heading ("THE ORATOR." - a standalone line ending in a period, distinct from this title-page line which ends in a comma). This title-page block is decorative front matter, not Cicero's translated text; excluded, same treatment as the book's opening title page.
- **orator-en / footnotes** - 38 "[Footnote: ...]" translator/transcriber asides (combined across Brutus and Orator, this work's own share not separately delimited in the shared source) were excluded entirely - Jones's own explanatory glosses, not his translated running text.
- **orator-en / italic markup** - 1662 underscore characters (Gutenberg's plain-text italic-markup convention, e.g. "_juncture_") were stripped from Orator's text; this schema has no rich-text field.
- **orator-en / typographic ornament** - 1 decorative row-of-asterisks ornament (no text content), printed just before the work's closing paragraph, was dropped.
- **orator-en / division scheme** - Jones's 1776 translation prints no chapter/section numbers anywhere in Orator's text either (confirmed by direct inspection of the whole source file). Per the task brief's own fallback guidance, this edition is divided into 15000-character reading chunks (paragraphs grouped in document order, never split) - these sec-N numbers are this importer's own sequential labels only and do NOT correspond to the Latin sibling's Wilkins section numbers. See about.json and data/orator-en/types.ts.

## Errors

_none_

## Warnings

_none_
