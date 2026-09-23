# Politics (English, Ellis) validation report

Generated: 2026-09-23T04:38:54.503Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- books: 8
- chapters: 103
- total passage chars: 521498
- Book 1: 13 chapters
- Book 2: 12 chapters
- Book 3: 18 chapters
- Book 4: 16 chapters
- Book 5: 12 chapters
- Book 6: 8 chapters
- Book 7: 17 chapters
- Book 8: 7 chapters

## Verbatim spot-check

- OK - book-1-ch-1 opening
  - got: `As we see that every city is a society, and every society Ed. is established for some good purpose; for an apparent good is the spring of al`
- OK - final chapter closing
  - got tail: ` Lydian of all others seems chiefly to be-These then are as it were the three boundaries of education, moderation, possibility, and decorum.`
- chapters with a well-formed Bekker ref: 103

## Anomalies (preserved, not corrected)

- **book-1-ch-12** - Bekker marker transcription irregularity, preserved as found but normalised for Division.ref computation: the source prints "[I259b]" (a stray capital "I" in place of the digit "1") where every other marker in this text uses a plain digit; read here as Bekker page 1259b.
- **politics-en / book-8-ch-1** - This chapter prints no inline Bekker marker of its own at all (the source jumps from the last marker in Book VII, "[1337a]", straight to the next one, "[1337b]", which falls inside book-8-ch-2). Since Bekker pagination is continuous across the whole work and not reset at Book boundaries, this chapter's Division.ref ("Bekker 1337a–1337a") is carried forward from whatever marker was last in force when it began, rather than left null - this is the accurate continuous-numbering position, not a fabricated one, but is disclosed here because it differs from every other chapter (which all contain at least one marker of their own).
- **politics-en / Bekker references** - Unlike the task brief's own initial expectation, this Everyman-edition Gutenberg text DOES print inline Bekker page/column markers throughout (161 of them: "[Bekker 1252a]" once at the very start, then the bare "[1252b]"/"[1253a]"/... form thereafter). Division.ref is reconstructed from them as "Bekker <start>–<end>" per chapter, where <end> is whichever marker is in force at the point the next chapter begins (continuous numbering, not gapped, exactly as this app's data/categoriae-en already does for its own inline Bekker anchors). The markers themselves are stripped out of the reading text - they are citation apparatus, not Aristotle's/Ellis's prose. Passage.ref stays null throughout: no marker is printed at every paragraph break, only at the coarser points described above.
- **politics-en / stray "Ed." token** - Book 1 Chapter I contains a single stray word "Ed." embedded mid-sentence ("...every society Ed. is established for some good purpose..."), breaking the grammar of the sentence. Its origin is unclear - most likely a transcription-era scanno specific to this Gutenberg edition rather than anything meaningful in Ellis's own printed 1912 text - but per this repo's rule of never discarding or silently correcting source text, it is preserved exactly as found rather than removed or "fixed".
- **politics-en / front and back matter excluded** - A. D. Lindsay's signed "INTRODUCTION" essay, the bibliography that follows it, and the trailing alphabetical "INDEX" (keyed to the original print edition's own page numbers, which this build has no way to reproduce) are excluded as apparatus, not Aristotle's/Ellis's translated text. No footnote/endnote apparatus of any kind was found anywhere in the real translation region.

## Errors

_none_

## Warnings

_none_
