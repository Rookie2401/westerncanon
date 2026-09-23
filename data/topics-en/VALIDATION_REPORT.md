# Topics (English, Pickard-Cambridge) validation report

Generated: 2026-09-23T04:42:15.728Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 8
- chapters: 82
- total passage chars: 390965
- Book 1: 18 chapters
- Book 2: 11 chapters
- Book 3: 6 chapters
- Book 4: 6 chapters
- Book 5: 8 chapters
- Book 6: 14 chapters
- Book 7: 5 chapters
- Book 8: 14 chapters

## Verbatim spot-check

- OK — book-1 ch-1 incipit
  - got: `Our treatise proposes to find a line of inquiry whereby we shall be able to reason from op`
- OK — final chapter explicit
  - got: `t is rather difficult to produce points for ourselves from matters of everyday experience.`

## Anomalies (preserved, not corrected)

- **topics-en / book-4-ch-3** — 2 stray mid-paragraph <B>...</B> emphasis tag(s) found wrapping the single word "Likewise." at the start of a paragraph in Book IV, Part 3 (confirmed genuine source content by direct inspection of scripts/import-topics-en/raw/topics.4.iv.html - not a chapter heading, not transport scaffolding). This schema's Passage.text is plain text with no rich-text/emphasis field, so the <B>/</B> wrapper was unwrapped (inner text "Likewise." kept, verbatim, in its place in the running prose) rather than dropped.
- **topics-en / reference scheme** — MIT's Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (verified by direct inspection of all 8 book pages) - only silent, invisible `<A NAME="n">` deep-link anchors, sequentially numbered across each book with no relation to Bekker numbering and no visible rendering. Division.ref is null throughout for both Books and Chapters; nothing is fabricated to supply a citation scheme this source does not carry.
- **topics-en / footnotes** — No footnotes or translator apparatus of any kind were found anywhere in this source (confirmed by direct inspection of all 8 book pages) - there is nothing to strip or disclose beyond the ordinary transport scaffolding (page navigation, `<A NAME>` anchors).
- **topics-en / completeness** — All 8 Books and all 82 chapters are present and complete, matching the table-of-contents page's own advertised structure exactly; no page was found truncated (contrast with the sibling imports of De Generatione et Corruptione and Meteorologica, each of which has one genuinely truncated source page).

## Errors

_none_

## Warnings

_none_
