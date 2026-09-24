# Books XI-XIII diagram sourcing report

Every `<figure/>` marker in Euclid, *Elements* Books XI, XII and XIII, plus the
one Book IV.16 re-check, cross-referenced against the actual printed page of
Heiberg, *Euclidis Opera Omnia* vol. IV (1885; archive.org identifier
`euclidisoperaomn04eucl`, confirmed to hold Books XI-XIII by its own running
headers - "ELEMENTORUM LIBER XI/XII/XIII" - checked directly against the scan,
not assumed) and vol. I (`euclidisoperaomn01eucluoft`) for the IV.16 re-check.

**IIIF leaf -> printed page.** Every page image was fetched as
`https://iiif.archive.org/iiif/<identifier>$<leaf>/full/full/0/default.jpg`.
Within vol. IV, printed page number = IIIF leaf number - 10, holding exactly
across the whole volume (spot-checked at multiple points via the volume's own
running-header page numbers). Diagrams sit on the Latin-facing page (odd leaf
numbers), matching the established Book II-IV convention - confirmed true for
every proposition in this report except Book IV.16 itself, whose diagram is an
exception (see below).

**Method.** Each proposition's Greek enunciation text (already in work.json) was
used to locate an approximate starting leaf via the archive.org "search inside"
full-text index, then every Latin page from that point forward was fetched and
visually inspected (via the Read tool, at full IIIF resolution) until either a
diagram was found or the next proposition's heading appeared with none shown -
i.e. full page-by-page coverage of the relevant span, not a guess from the
search index alone (which was frequently imprecise - short/repeated Greek
phrases and an index of the whole volume, including a later cross-reference
table, produced false-positive matches that were caught this way).

**Crop technique.** Each diagram region was cropped generously, converted to
grayscale, median-filtered (kernel 3) to suppress paper-grain/bleed-through
speckle, contrast-stretched (`sharp().normalize()`, since raw scan exposure
varies a lot leaf to leaf), then mapped to alpha (ink = opaque black, paper =
transparent) and trimmed to the ink's own bounding box - matching the existing
Book I-IV images' pure-black-on-transparent style. Every crop was re-viewed
after cropping to confirm it is complete (no truncated labels/lines) and clean
(no body text bled in); several were re-cropped 2-3 times to fix truncation.
Old, thin paper in this particular scan run means some crops (noted below)
carry visible bleed-through speckle from the facing page that a threshold
alone cannot fully remove without eating the thin construction lines - the ink
itself was never redrawn, straightened or otherwise altered.

## Book IV.16 re-check

**Finding: the existing claim is wrong.** `about.json` and `index.ts` both state
Book IV.16 "has no printed diagram in this edition at all - the construction is
given purely in words". Direct inspection of vol. I found a real diagram: after
the enunciation (leaf 332, Greek p. 318) and its Latin translation (leaf 333, p.
319) - both purely textual, matching the existing claim at that point - the
proof continues onto leaf 334 (Greek p. 320, **not** the Latin p. 321), where a
circle with the inscribed 15-gon (points A, B, E, Γ, Δ) is printed, illustrating
both the inscription and (via the "similarly ... circumscribe" corollary text
right after it) the circumscribed figure. This is the one Book I-IV diagram in
this whole task that sits on the **Greek** page rather than the Latin-facing
one - plausibly why the original Book I-IV pass missed it (it would only have
checked the Latin page opposite the enunciation, per its own documented
convention, and this proof runs a page further than usual before its figure).
Cropped and included here as `book-4-prop-16` (990x985). **`index.ts` and
`about.json` were left untouched** per this task's constraints; both still
assert the old "no diagram" wording until someone wires this correction in.

| leaf id | leaf | printed page | vol. | image | notes |
|---|---|---|---|---|---|
| book-4-prop-16 | 334 | 320 | I | book-4-prop-16.png (990x985) | Real diagram found, overturning the "no printed diagram" claim - on the Greek page, 2 pages after the enunciation. See above. |

## Book XI

| leaf id | leaf(s) | printed page(s) | markers | image(s) | notes |
|---|---|---|---|---|---|
| book-11-prop-1 | 19 | 9 | 1 | book-11-prop-1.png (328x551) |  |
| book-11-prop-2 | 21 | 11 | 1 | book-11-prop-2.png (271x381) |  |
| book-11-prop-3 | 23 | 13 | 1 | book-11-prop-3.png (334x472) |  |
| book-11-prop-4 | 23 | 13 | 1 | book-11-prop-4.png (650x432) |  |
| book-11-prop-5 | 29 | 19 | 1 | book-11-prop-5.png (580x529) |  |
| book-11-prop-6 | 31 | 21 | 1 | book-11-prop-6.png (626x570) |  |
| book-11-prop-7 | 33 | 23 | 1 | book-11-prop-7.png (674x570) |  |
| book-11-prop-8 | 35 | 25 | 1 | book-11-prop-8.png (620x730) |  |
| book-11-prop-9 | 39 | 29 | 1 | book-11-prop-9.png (778x405) |  |
| book-11-prop-10 | 41 | 31 | 1 | book-11-prop-10.png (826x730) |  |
| book-11-prop-11 | 43 | 33 | 1 | book-11-prop-11.png (559x517) |  |
| book-11-prop-12 | 45 | 35 | 1 | book-11-prop-12.png (513x481) |  |
| book-11-prop-13 | 47 | 37 | 1 | book-11-prop-13.png (634x483) |  |
| book-11-prop-14 | 49 | 39 | 1 | book-11-prop-14.png (1100x570) |  |
| book-11-prop-15 | 51 | 41 | 1 | book-11-prop-15.png (733x950) |  |
| book-11-prop-16 | 53 | 43 | 1 | book-11-prop-16.png (1150x800) |  |
| book-11-prop-17 | 57 | 47 | 1 | book-11-prop-17.png (1260x1000) |  |
| book-11-prop-18 | 59 | 49 | 1 | book-11-prop-18.png (670x450) |  |
| book-11-prop-19 | 61 | 51 | 1 | book-11-prop-19.png (844x750) |  |
| book-11-prop-20 | 63 | 53 | 1 | book-11-prop-20.png (1050x630) |  |
| book-11-prop-21 | 67 | 57 | 1 | book-11-prop-21.png (736x529) |  |
| book-11-prop-22 | 69, 71 | 59, 61 | 2 | book-11-prop-22-a.png (1750x530), book-11-prop-22-b.png (756x470) |  |
| book-11-prop-23 | 73, 75, 81 | 63, 65, 71 | 3 | book-11-prop-23-a.png (1750x550), book-11-prop-23-b.png (820x800), book-11-prop-23-c.png (495x291) |  |
| book-11-prop-24 | 83 | 73 | 1 | book-11-prop-24.png (900x666) |  |
| book-11-prop-25 | 85 | 75 | 1 | book-11-prop-25.png (1420x710) |  |
| book-11-prop-26 | 89 | 79 | 1 | book-11-prop-26.png (1465x715) |  |
| book-11-prop-27 | 95 | 85 | 1 | book-11-prop-27.png (1180x610) |  |
| book-11-prop-28 | 95 | 85 | 1 | book-11-prop-28.png (676x620) |  |
| book-11-prop-29 | 97 | 87 | 1 | book-11-prop-29.png (946x533) |  |
| book-11-prop-30 | 99 | 89 | 1 | book-11-prop-30.png (836x850) |  |
| book-11-prop-31 | 105, 107 | 95, 97 | 2 | book-11-prop-31-a.png (1280x1350), book-11-prop-31-b.png (1650x942) |  |
| book-11-prop-32 | 109 | 99 | 1 | book-11-prop-32.png (1399x475) |  |
| book-11-prop-33 | 111, 113 | 101, 103 | 2 | book-11-prop-33-a.png (450x514), book-11-prop-33-b.png (1100x930) |  |
| book-11-prop-34 | 117, 125 | 107, 115 | 2 | book-11-prop-34-a.png (1280x830), book-11-prop-34-b.png (1080x1150) |  |
| book-11-prop-35 | 129 | 119 | 1 | book-11-prop-35.png (746x630) |  |
| book-11-prop-36 | 135 | 125 | 1 | book-11-prop-36.png (1280x805) |  |
| book-11-prop-37 | 139 | 129 | 1 | book-11-prop-37.png (1231x680) |  |
| book-11-prop-38 | 143 | 133 | 1 | book-11-prop-38.png (947x1052) |  |
| book-11-prop-39 | 145 | 135 | 1 | book-11-prop-39.png (846x370) |  |

## Book XII

| leaf id | leaf(s) | printed page(s) | markers | image(s) | notes |
|---|---|---|---|---|---|
| book-12-prop-1 | 149 | 139 | 1 | book-12-prop-1.png (1740x900) |  |
| book-12-prop-2 | 153 | 143 | 1 | book-12-prop-2.png (1970x800) |  |
| book-12-prop-3 | 165 | 155 | 1 | book-12-prop-3.png (820x920) |  |
| book-12-prop-4 | 169 | 159 | 1 | book-12-prop-4.png (1450x900) |  |
| book-12-prop-5 | 177, 179 | 167, 169 | 2 | book-12-prop-5-a.png (1098x1150), book-12-prop-5-b.png (506x303) |  |
| book-12-prop-6 | 181 | 171 | 1 | book-12-prop-6.png (1392x720) |  |
| book-12-prop-7 | 185 | 175 | 1 | book-12-prop-7.png (850x880) |  |
| book-12-prop-8 | 187 | 177 | 1 | book-12-prop-8.png (1080x650) |  |
| book-12-prop-9 | 193 | 183 | 1 | book-12-prop-9.png (786x712) |  |
| book-12-prop-10 | 197 | 187 | 1 | book-12-prop-10.png (1010x1050) |  |
| book-12-prop-11 | 209 | 199 | 1 | book-12-prop-11.png (1980x800) |  |
| book-12-prop-12 | 215 | 205 | 1 | book-12-prop-12.png (998x943) |  |
| book-12-prop-13 | 227 | 217 | 1 | book-12-prop-13.png (1020x366) |  |
| book-12-prop-14 | 231 | 221 | 1 | book-12-prop-14.png (850x467) |  |
| book-12-prop-15 | 233 | 223 | 1 | book-12-prop-15.png (1310x490) |  |
| book-12-prop-16 | 237 | 227 | 1 | book-12-prop-16.png (551x450) |  |
| book-12-prop-17 | 241 | 231 | 1 | book-12-prop-17.png (1940x1900) |  |
| book-12-prop-18 | 253 | 243 | 1 | book-12-prop-18.png (1500x1200) |  |

## Book XIII

| leaf id | leaf(s) | printed page(s) | markers | image(s) | notes |
|---|---|---|---|---|---|
| book-13-prop-1 | 259 | 249 | 1 | book-13-prop-1.png (641x830) |  |
| book-13-prop-2 | 263 | 253 | 1 | book-13-prop-2.png (620x925) |  |
| book-13-prop-3 | 267 | 257 | 1 | book-13-prop-3.png (720x780) |  |
| book-13-prop-4 | 269 | 259 | 0 | *(none - no `<figure/>` marker)* | **A diagram IS printed** (a labelled figure for the AB²+BΓ²=3ΓA² proof), but this division's passages carry zero `<figure/>` markers in the transcription (confirmed against anomalies.json) - the mirror image of the usual "marker but no image" gap. No image produced since there is no marker for the app's data model to hang one on; see `DIAGRAMS_BOOKS_11_13`'s header comment. |
| book-13-prop-5 | 271 | 261 | 2 | book-13-prop-5-a.png (900x700), book-13-prop-5-b.png (900x700) |  |
| book-13-prop-6 | 273 | 263 | 1 | book-13-prop-6.png (1050x230) |  |
| book-13-prop-7 | 277 | 267 | 1 | book-13-prop-7.png (805x770) |  |
| book-13-prop-8 | 279 | 269 | 1 | book-13-prop-8.png (663x668) |  |
| book-13-prop-9 | 283 | 273 | 1 | book-13-prop-9.png (880x1110) |  |
| book-13-prop-10 | 287 | 277 | 1 | book-13-prop-10.png (1060x1050) |  |
| book-13-prop-11 | 291 | 281 | 1 | book-13-prop-11.png (1230x1000) |  |
| book-13-prop-12 | 297 | 287 | 1 | book-13-prop-12.png (712x822) |  |
| book-13-prop-13 | 299, 305 | 289, 295 | 2 | book-13-prop-13-a.png (980x1250), book-13-prop-13-b.png (850x1200) |  |
| book-13-prop-14 | 307 | 297 | 1 | book-13-prop-14.png (608x950) |  |
| book-13-prop-15 | 311 | 301 | 1 | book-13-prop-15.png (867x850) |  |
| book-13-prop-16 | 325 | 315 | 2 | book-13-prop-16.png (700x1320) | 2 marker(s), 1 image(s). |
| book-13-prop-17 | 333 | 323 | 1 | book-13-prop-17.png (1050x1190) |  |
| book-13-prop-18 | 339 | 329 | 2 | book-13-prop-18-a.png (841x647), book-13-prop-18-b.png (841x647) |  |

## Summary

| book | leaf divisions with a `<figure/>` marker | total markers | images produced |
|---|---|---|---|
| IV (re-check) | 1 (book-4-prop-16) | 1 | 1 (new finding - overturns "no diagram" claim) |
| XI | 39 | 46 | 45 files (39 leaf ids; props 22, 23, 31, 33, 34 have 2-3 sub-images each) |
| XII | 18 | 19 | 19 files (18 leaf ids; prop 5 has 2 sub-images) |
| XIII | 17 of 18 (prop 4 has no marker at all) | 21 | 20 files (17 leaf ids; props 5, 13, 18 have 2 sub-images, prop 16's 2 markers share 1 image) |

Total: 85 PNG files produced, covering 75 leaf ids (74 in Books XI-XIII + Book
IV.16) and 86 `<figure/>` marker slots (one leaf id, book-13-prop-16, has 2
markers sharing a single printed diagram).

## Doubts / lower-confidence calls

- **book-11-prop-22, book-11-prop-23 (marker a), book-13-prop-5, book-13-prop-9,
  book-13-prop-10, book-13-prop-11**: these crops carry visible bleed-through
  speckle from the facing page (thin old paper in this particular scan run).
  The ink itself is intact and legible in every case; a stronger threshold was
  tried and rejected where it started eating genuine thin construction lines.
- **book-13-prop-5 (marker b)** and **book-13-prop-18 (marker b)**: no second
  distinct diagram was found printed anywhere in the proof's page range for
  these markers after a full page-by-page check (not merely a quick skim) -
  the proof reasons about the same lettered figure a second time without a new
  plate. Repeats the one diagram found, matching the precedent set by the
  Archimedes DIAGRAMS map's repeat-last-entry convention for a marker with no
  new figure of its own.
- **book-11-prop-27 / book-11-prop-28**: both diagrams are printed on the same
  physical page (leaf 95) but are genuinely two separate figures for two
  separate propositions, not sub-cases of one - cropped and kept as two
  distinct single-entry leaf ids, not merged.
- **book-13-prop-4**: see the dedicated row above - a real anomaly worth a
  maintainer's attention (a printed diagram with no transcription marker),
  distinct in kind from every other gap logged in anomalies.json.
- Marker-count source: `anomalies.json`, filtered to `<figure/>` entries under
  `book-11-*`, `book-12-*`, `book-13-*` and `book-4-prop-16`, cross-checked
  against work.json's passage counts for the propositions with multiple
  markers (22, 23, 31, 33, 34 in Book XI; 5 in Book XII; 5, 13, 16, 18 in Book
  XIII) - not merely assumed from the printed page.

## QA pass (2026-09-23)

Every one of the 85 PNGs covered by this report (74 Books XI-XIII images plus
`book-4-prop-16.png`) was composited onto white and viewed with the Read tool.

**Root cause found:** the original crop pass used the same ink/paper
thresholds (`T_INK=95, T_PAPER=150`) as Books I-IV/V-IX, which were tuned for
`heiberg-vol2`'s sepia-toned paper. `heiberg-vol4` (Books XI-XIII) turns out to
be a visibly darker, lower-contrast scan - sampled paper background there
averages ~118 gray (max ~164) - so that threshold mapped much of the paper's
own texture into the "ink" range, producing the widespread paper speckle this
report's own "Doubts" section above only partly anticipated (it names props
22/23a and a few others; in fact most of the volume shows some degree of it).
`book-11-prop-22-a`'s dark smudge and `-23-a`'s matching one are a different,
worse case of the same bleed-through.

**Remediation applied to all 85 images:** a connected-component despeckle
pass (isolated ink blobs below an area threshold, run twice - once at a
threshold of 25px, once at 70px - checked after each pass to confirm no
genuine line or letter was ever fully removed, only paper dust) was run
directly on every existing PNG's alpha channel and overwritten in place; this
needs no re-fetch of the source leaf and cannot touch ink that is actually
connected to the rest of a figure. It visibly cleaned every image without
ever emptying one (both `crop2`/`cleanup` runs reported 0 failures across 85
files). A handful (`book-11-prop-14/28/32/33-a`) were additionally re-cropped
from scratch from their cached leaf in `heiberg-vol4`, using corrected
thresholds (`T_INK=30, T_PAPER=110`) discovered during this pass specifically
for that volume's darker scan - these four came out fully clean, both of
speckle and of the adjacent body text that had bled into the original crop.

**Follow-up completion pass (2026-09-23, later the same day):** every one of
the 85 PNG files covered by `DIAGRAMS_BOOKS_11_13` (86 marker entries,
`book-4-prop-16` included) was re-cropped directly from its source leaf JPEG
- `heiberg-vol4/leafN.jpg` for Books XI-XIII, `heiberg-vol1/leaf334.jpg` for
`book-4-prop-16` - using the corrected ink/paper thresholds (`T_INK=30,
T_PAPER=110` for vol. IV; `T_INK=80, T_PAPER=150` for vol. I, sampled
separately since it is a different, more sepia-toned scan) discovered during
the first half of this QA pass, rather than left on the old `T_INK=95,
T_PAPER=150` despeckle-only fix. Text-bleed cases were fixed by tightening
the crop region and, where the adjacent paragraph text sat too close to the
figure to exclude by region alone, masking that patch to paper colour before
thresholding. Every crop was composited onto white and viewed before being
accepted; several needed 2-4 region/mask iterations to include the full
figure (all point-letter labels) while excluding all adjacent body text.
`book-13-prop-5` (marker b) and `book-13-prop-18` (marker b) were re-cropped
once each and the identical result saved to both filenames, matching the
repeat-entry convention; `book-13-prop-16` (2 markers, 1 physical file) was
re-cropped once, with a stray printer's ink speck near the figure masked out.

**True final state (accepted with caveat):**
- Every image in the map has now been re-cropped from source with the
  corrected threshold for its volume - none remain on the old, uncorrected
  despeckle-only fix.
- No image contains adjacent printed body text any more. The `book-11-prop-22-a`
  and `book-11-prop-23-a` smudge cases were resolved cleanly (tighter box,
  same corrected threshold); no smudge touching the figure remains in either.
- Most images still carry light-to-moderate facing-page bleed-through
  mottling/ghosting after the re-crop - an inherent property of this
  particular scan run's thin paper, present in the source photograph itself,
  not removable by threshold or crop-region choice alone without risking the
  figure's own thin construction lines. It never obscures the figure's own
  ink, which is complete and legible in every image checked.
- `book-4-prop-16`: the printed circle in this vol. I engraving is itself
  rendered as a thin double/broken line (an artifact of the original 1883
  print, not of this crop), so its outline looks less solid than the
  Books XI-XIII figures; the ink is otherwise clean and complete.

**Verification:** `npx tsx scripts/import-euclid/diagrams/check-books-11-13.ts`
passes (86 diagram entries across 75 leaf ids, all present with matching
dimensions and alpha channel).
