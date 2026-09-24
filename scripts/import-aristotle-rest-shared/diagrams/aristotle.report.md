# Aristotelian works with printed geometric diagrams - research report

Scope: every Aristotelian/pseudo-Aristotelian work in this library that is a
plausible candidate for printed geometric diagrams (per the task brief),
checked against public-domain scanned editions on archive.org. Produced
without editing any importer, `work.json`, or `about.json` - see
`scripts/import-aristotle-rest-shared/diagrams/aristotle.ts` for the actual
diagram map and `check-aristotle.ts` for the verification script. Nothing
here was committed.

## Step 1 - research table

| Work | Candidate PD edition(s) checked | Figures in that edition? | Letters match this library's Greek text? | Verdict |
|---|---|---|---|---|
| **mechanica-grc** (ps.-Aristotle, *Mechanical Problems*) | Otto Apelt, *Aristotelis quae feruntur De plantis, De mirabilibus auscultationibus, Mechanica...* (Teubner, Leipzig 1888). archive.org [`deplantisalia00apelgoog`](https://archive.org/details/deplantisalia00apelgoog), IIIF-enabled, `_djvu.txt` present. | **Yes** - at least 5 real line diagrams found by direct page inspection (pp. 97, 100, 101, 104, 105), of the classic "wheels-within-wheels", circle/radius, and balance-beam-and-cord constructions. | **Yes**, checked directly: every point-letter in each printed diagram (Α, Β, Γ, Δ, Ε, Ζ, ... ) is named at exactly that point in this library's own `data/mechanica-grc/work.json` passage text (First1K-Greek Bekker-tradition transcription) - see the per-figure table below for the exact matching sentences. | **Used.** See below. |
| | *(also checked, not used)* Henri de Monantheuil, *Aristotelis Mechanica* (Paris 1599), Greek+Latin+commentary. archive.org [`aristotelismech00aris`](https://archive.org/details/aristotelismech00aris), `_djvu.txt` present, 256 leaves. | Likely (41 "figura" mentions in the Latin commentary, a serious geometrical commentary), but the 16th-c. Greek typeface OCRs too badly to locate specific diagrams by text search, and Apelt 1888 already gives a clean, directly text-matched set at far lower effort. Not pursued further once Apelt's edition proved sufficient. | Not evaluated (OCR unusable for targeted lookup). | Not used. |
| **meteorologica-grc** / **meteorologica-en** (Book III rainbow/halo geometry) | F. H. Fobes, *Aristotelis Meteorologicorum libri quattuor* (Harvard UP, Cambridge Mass. 1919). archive.org [`aristotelismeteo00arisuoft`](https://archive.org/details/aristotelismeteo00arisuoft), `_djvu.txt` present. | **No.** Zero "fig." occurrences in the OCR text; the two "TABULA" sections (pp. front matter) are word-frequency tables for textual criticism, not plates. Direct page view of the densest lettered passage in the whole work - Book III's horizon-circle/halo proof at 376b22-377a8 (dozens of point-letters Α,Τ,Κ,Η,Π,Β,Ψ,Υ...) - confirmed **no diagram is printed**, just running Greek text (archive.org leaf 171 of that same scan). | N/A (no diagram exists to check). | Not used. |
| | Julius Ludwig Ideler, *Aristotelis Meteorologicorum libri IV*, vol. 1 (Leipzig 1834). archive.org [`meteorologicorum01arisuoft`](https://archive.org/details/meteorologicorum01arisuoft), `_djvu.txt` present. | **No** - and Ideler says so explicitly. Commenting on Meteor. I.8's own text, which instructs the reader "θεωρείσθω δ' ὁ κύκλος καὶ τὰ ἐν αὐτῷ ἄστρα ἐκ τῆς ὑπογραφῆς" ("let the circle and the stars in it be studied FROM THE DIAGRAM"; referring to an ancient marginal star-chart in some manuscripts), Ideler writes: *"Neque nos figuram adposuimus, quum satis esset ablegasse lectorem ad mappam astronomicam"* - "Nor did we add a figure, since it sufficed to refer the reader to an astronomical atlas." (Ideler vol. 1, commentary ad loc.) | N/A. | Not used. |
| **de-lineis-insecabilibus-grc** (ps.-Aristotle, *On Indivisible Lines*) | Apelt 1888 (same volume as Mechanica, above; De Lineis Insecabilibus is one of the six opuscula it collects). | **No.** Direct view of the treatise's opening page (Bekker 968a, archive.org leaf 202 of `deplantisalia00apelgoog`) shows plain argumentative prose, no diagram; the work is a dialectical polemic against the existence of indivisible lines, never a step-by-step construction, and no diagram markers or "figura" apparatus notes appear anywhere in its section of the OCR text. | N/A. | Not used. |
| **de-motu-animalium-grc** / **-en**, **de-incessu-animalium-grc** / **-en** | *The Works of Aristotle Translated into English*, ed. J. A. Smith & W. D. Ross, vol. V (Oxford, Clarendon Press, 1912) - contains A. S. L. Farquharson's translations of both works. archive.org [`bwb_KO-640-935`](https://archive.org/details/bwb_KO-640-935), `_djvu.txt` present. | **No.** Zero "Fig."/"FIG." occurrences anywhere in the volume's OCR text (both works included). This is a prose translation with footnotes, not a diagrammed scientific edition. | N/A. | Not used. |
| **de-caelo-grc** / **-en**, **physics-grc**, **de-anima-grc**, **prior-analytics-grc** / **-en**, **posterior-analytics-grc** / **-en** | Not individually page-scanned (see note below); assessed via the absence of any diagram tradition in the standard Bekker/Teubner/Oxford editions of these works, consistent with their content. | Not applicable - these are argued in continuous prose with no geometric constructions. Prior/Posterior Analytics' "figures" (πρῶτον σχῆμα, δεύτερον σχῆμα, τρίτον σχῆμα) name the three *classificatory patterns* of the categorical syllogism, a term of art, never a drawn geometric image in any edition; De Caelo and Physics discuss shape and place only in prose (De Caelo II does argue the earth and heavens are spherical, but without a constructive diagram in any edition checked in this survey's own prior spot-checks of Bekker-tradition texts); De Anima is a purely psychological/philosophical treatise. | N/A. | Not used - no PD edition with diagrams is known to exist for any of these six/eight works, and none was found. |

**Overall verdict: only `mechanica-grc` gets diagram images in this deliverable.** Every other checked work is recorded above as a genuine, checked negative (edition named, specific check performed), not a guess.

## Step 2 - the five Mechanica diagrams

All from Otto Apelt (ed.), *Aristotelis quae feruntur De plantis, De
mirabilibus auscultationibus, Mechanica, De lineis insecabilibus, Ventorum
situs et nomina, De Melisso Xenophane Gorgia* (Leipzig: Teubner, 1888),
public domain; archive.org identifier `deplantisalia00apelgoog`
(Google-digitised Harvard Library copy). Apelt prints Bekker's page/column
marks in the margin and reproduces Bekker's own text closely, letter for
letter, in the passages checked below.

Fetch method: `https://iiif.archive.org/iiif/deplantisalia00apelgoog$<leaf>/full/full/0/default.jpg`, cached at
`scripts/import-aristotle-rest/raw/diagrams/deplantisalia00apelgoog/leaf<N>.jpg`
(not committed to the repo per instructions - kept only in the working
scratch area used for this task). No IIIF request failed; no 5xx retries
were needed.

**Locating the right leaf.** IIIF leaf number and the printed page number
are *not* a fixed offset apart across the whole scan - two isolated leaves
(145, 146) landed on unrelated pages from *De Mirabilibus Auscultationibus*
(pp. 84-85) sandwiched between two correctly-sequential Mechanica leaves
(144 -> p. 97, 147 -> p. 100), evidently a scan-order quirk in this
particular Google Books digitisation. Because of this, every leaf actually
used below was confirmed by directly viewing the page image and reading
its printed running head/page number and Bekker mark, not by assuming
leaf = page + constant offset. The archive.org "search inside" endpoint
(`https://<server>/fulltext/inside.php?item_id=...&q=...`) was used to
locate candidate leaves by distinctive Greek phrases, then every candidate
was visually confirmed.

### 1. Preface - "wheels within wheels" toy

- **Division:** `mechanica-grc` division id `ch-12`, passage 0 - array
  index **11** of 158 (the treatise's unnumbered preface, its own 12th of
  13 paragraphs).
- **Page:** Apelt p. 97 (Bekker 848a31), archive.org leaf 144.
- **Image:** `data/mechanica-grc/images/preface-ch-12.png`, 365x112px.
- **Text match:** the passage at this division reads (verbatim, this
  library's own transcription) "...κατασκευάζουσί τινες ὥστ' ἀπὸ μιᾶς
  κινήσεως πολλοὺς ὑπεναντίους ἅμα κινεῖσθαι κύκλους, ὥσπερ οὓς ἀνατιθέασιν
  ἐν τοῖς ἱεροῖς ποιήσαντες τροχίσκους χαλκοῦς τε καὶ σιδηρούς." - and the
  NEXT division (`ch-13` in the preface, not used here) opens "Εἰ γὰρ εἴη
  τοῦ Α Β κύκλου ἁπτόμενος ἕτερος κύκλος ἐφ' οὗ Γ Δ... πάλιν αὐτὸς τὸν
  ἐφεξῆς, ἐφ' οὗ Ε Ζ...". The printed diagram, sitting on the page exactly
  between these two sentences, shows three touching circles labelled Α, Β,
  Γ, Δ, Ε, Ζ left to right - the letters named in both passages, in order.
  **No doubt.**

### 2. Problem 1 - the circle/radius construction

- **Division:** division id `ch-7`, passage 0 - array index **19** of 158
  (Problem 1's 7th of 20 paragraphs).
- **Page:** Apelt p. 100 (Bekker 849a1), archive.org leaf 147.
- **Image:** `data/mechanica-grc/images/problem-1-ch-7.png`, 695x736px.
- **Text match:** the passage ends "Ἕστω κύκλος ὁ ΑΒΓ, τὸ δ' ἄκρον τὸ ἐφ'
  οὗ Β φερέσθω ἐπὶ τὸ Δ· ἀφικνεῖται δέ ποτε ἐπὶ τὸ Γ. Εἰ μὲν οὖν ἐν τῷ λόγῳ
  ἐφέρετο ὃν ἔχει ἡ ΒΔ πρὸς τὴν ΔΓ, ἐφέρετο ἄν τὴν διάμετρον τὴν ἐφ' ᾗ ΒΓ."
  The printed diagram shows circle ΑΒΓ with Β at top, a line to Δ (outside
  the circle, upper right), a secant to Γ, and point Ε on the arc between
  Β and Δ - all five letters (Α, Β, Γ, Δ, Ε) appear in this passage or the
  immediately following one (`ch-8`, "...ἐπὶ τὴν περιφέρειαν φέρεται τὴν
  ἐφ' ᾗ ΒΕΓ"). **No doubt about the diagram's content**; see "Known data
  issue" below for the one real caveat (division-id ambiguity, not content).

### 3. Problem 1 - concentric circles (unequal radii trace unequal arcs)

- **Division:** division id `ch-11`, passage 0 - array index **23** of 158
  (Problem 1's 11th of 20 paragraphs).
- **Page:** Apelt p. 101 (Bekker 849a35), archive.org leaf 148.
- **Image:** `data/mechanica-grc/images/problem-1-ch-11.png`, 323x324px.
- **Text match:** the passage reads "Ἕστω κύκλος ἐφ' οὗ ΒΓΔΕ, καὶ ἄλλος ἐν
  τούτῳ ἐλάττων, ἐφ' οὗ Χ Ν Μ Ξ, περὶ τὸ αὐτὸ κέντρον τὸ Α· καὶ
  ἐκβεβλήσθωσαν αἱ διάμετροι, ἐν μὲν τῷ μεγάλῳ, ἐφ' ὧν ΓΔ καὶ ΒΕ, ἐν δὲ τῷ
  ἐλάττονι αἱ Χ ΝΞ· καὶ τὸ ἑτερόμηκες παραπεπληρώσθω, τὸ ΔΨΡΓ." - every one
  of those letters (Β, Γ, Δ, Ε, Χ, Ν, Μ, Ξ, Α, Ψ, Ρ) is visible in the
  printed diagram, plus a few more (Τ, Κ, Ζ, Θ, Η) that belong to the
  following division (`ch-12`/`ch-13`, not used here) continuing the same
  figure. **No doubt about content**; see "Known data issue" below.

### 4. Problem 2 - balance beam and vertical cord (first construction)

- **Division:** division id `ch-2`, passage 0 - array index **34** of 158
  (Problem 2's 2nd of 5 paragraphs).
- **Page:** Apelt p. 104 (Bekker 850a1), archive.org leaf 151.
- **Image:** `data/mechanica-grc/images/problem-2-ch-2.png`, 1174x1016px.
- **Text match:** the passage reads in full "Ὥστε ἀνάγκη ἐστὶ κάτω ῥέπειν
  τὸ πλέον, ἕως ἂν ἔλθῃ ἡ δίχα διαιροῦσα τὸ ζυγὸν ἐπὶ τὴν κάθετον αὐτήν,
  ἐπικειμένου τοῦ βάρους ἐν τῷ ἀνεσπασμένῳ μορίῳ τοῦ ζυγοῦ. Ἕστω ζυγὸν
  ὀρθὸν ἐφ' οὗ ΒΓ, σπαρτίον δὲ τὸ ΑΔ. Ἐκβαλλόμενον δὴ τοῦτο κάτω κάθετος
  ἔσται ἐφ' ἧς ἡ ΑΔΜ." and the printed diagram shows exactly this: a
  horizontal beam Β-Γ crossed by a vertical cord through Δ down to Μ, with
  the beam's tilted position ΔΘ and angle Ω also drawn (belonging to the
  immediately following division `ch-3`, not used here, which continues
  the same figure with "τὸ μὲν Β οὗ τὸ Ε, τὸ δὲ Γ οὗ τὸ Ζ..."). **No doubt.**

### 5. Problem 2 - balance beam and vertical cord (second construction)

- **Division:** division id `ch-4`, passage 0 - array index **36** of 158
  (Problem 2's 4th of 5 paragraphs).
- **Page:** Apelt p. 105 (Bekker 850a26), archive.org leaf 152.
- **Image:** `data/mechanica-grc/images/problem-2-ch-4.png`, 315x281px.
- **Text match:** the passage ends "...πλεῖον γὰρ γίνεται τοῦ ἡμίσεος τοῦ
  ζυγοῦ τὸ κάτω μέρος ἢ ὡς ἡ κάθετος διαιρεῖ ὥστε οὐκ ἀναφέρεται· κουφότερον
  γὰρ τὸ ἐπηρτημένον." and the NEXT division (`ch-5`, not used here) opens
  "Ἕστω ζυγὸν τὸ ἐφ' οὗ ΝΞ, τὸ ὀρθόν, κάθετος δὲ ἡ Κ Λ Μ." The printed
  diagram between them shows beam Ν-Ξ crossed by vertical ΚΛΜ (the crop
  shows the crossing point as "Κ" with "Λ" just below it, and "Μ" at the
  foot of the dashed continuation), plus tilted positions Θ, Ρ, Ο. **No
  doubt.**

## Known data issue - `mechanica-grc` division ids are not globally unique

`data/mechanica-grc/work.json`'s `divisions` array is genuinely flat (no
Book level - confirmed against `data/mechanica-grc/types.ts`, which
documents "where the source has no Book-level division at all, the work
uses a FLAT list of `ch-N` Chapters instead"). In practice, though, its
`id` field restarts at `ch-1` at the start of **every one of the work's 35
traditional sections** (an unnumbered preface, then Problems 1-34 - this
transcription's own chapter count tops out at 35 total top-level XML
`chapter` divs numbered `n="0"` through `n="34"`, i.e. Problem 35 in the
traditional numbering is not separately present here). This was confirmed
three ways: (1) direct inspection of the raw source XML
(`scripts/import-aristotle-rest/raw/tlg0086.tlg023.1st1K-grc1.xml`), which
nests `<div type="textpart" subtype="chapter" n="0">` ... `<div
type="textpart" subtype="chapter" n="1">` ... etc., each with its own
internal `subtype="section"` numbering restarting at 1; (2) direct
inspection of the shipped `work.json`, where `divisions[13].id === 'ch-1'`
again (Problem 1's own first paragraph) even though `divisions[0].id` is
already `'ch-1'` (the preface's first paragraph); (3) counting: the array
resets exactly 35 times, matching the 35 XML `chapter` divs.

This is a real discrepancy with `data/mechanica-grc/types.ts`'s own
documented id scheme ("flat list of `ch-N` chapters" implies global
uniqueness, matching every OTHER work this importer produces - see e.g.
`data/physics-grc/types.ts` for the scheme it says it mirrors) and with the
importer's own `workTable.ts` bibliographic note for `mechanica-grc`
("only a flat, continuously-incrementing `section` numbering (1-158)
survives" - also not what the shipped file actually contains). **This
report does not attempt to fix it** - the task instructions are explicit
that no importer or `work.json` may be edited here, and diagnosing/fixing
the importer itself is a separate piece of work.

Consequence for this deliverable: a lookup that finds "the division whose
`id` equals `divisionId`" and stops at the first match will resolve
correctly for diagram #1 (`ch-12`, which happens to be the FIRST
occurrence of that id in the array) but will resolve **incorrectly** for
diagrams #2-5 (`ch-7`, `ch-11`, `ch-2`, `ch-4`), each of which also occurs
earlier in the array as an unrelated, diagram-less preface paragraph.
Every entry in `aristotle.ts` is annotated with its exact intended 0-based
position in the `divisions` array for this reason, and
`check-aristotle.ts` verifies against that exact position (not just bare
id existence) - see both files' header comments. Whoever wires this map
into the reader should resolve each entry by that array position (or
otherwise disambiguate beyond a bare id match) rather than trust
`divisions.find(d => d.id === divisionId)`.

## Works checked with NO printed figures found (edition checked)

- **meteorologica-grc / meteorologica-en** - F. H. Fobes, *Aristotelis
  Meteorologicorum libri quattuor* (Harvard UP 1919), archive.org
  `aristotelismeteo00arisuoft`; and Julius Ludwig Ideler, *Aristotelis
  Meteorologicorum libri IV* (Leipzig 1834), archive.org
  `meteorologicorum01arisuoft`. Neither edition prints a diagram; Ideler
  explicitly declines to add the one diagram the text itself refers to
  (see table above).
- **de-lineis-insecabilibus-grc** - Apelt 1888 (`deplantisalia00apelgoog`,
  the same volume used for Mechanica). No diagram anywhere in this short,
  purely dialectical treatise.
- **de-motu-animalium-grc / -en, de-incessu-animalium-grc / -en** -
  *The Works of Aristotle*, ed. Smith & Ross, vol. V (Oxford 1912),
  archive.org `bwb_KO-640-935` (Farquharson's translations of both works).
  No "Fig." markers anywhere in the volume.
- **de-caelo-grc / -en, physics-grc, de-anima-grc, prior-analytics-grc /
  -en, posterior-analytics-grc / -en** - not individually page-scanned
  (time-boxed out of this survey once the two most-cited candidates,
  Mechanica and Meteorologica, had been resolved); no diagram tradition
  exists for any of these in the standard critical editions, and their
  content (continuous philosophical/logical prose, with Prior/Posterior
  Analytics' "figures" being the abstract syllogistic-mood classification,
  never a drawn image) gives no reason to expect one. Flagged here as a
  lower-confidence negative than the four checked-by-page-image entries
  above, for transparency.

## Deliverables

1. Five PNGs under `data/mechanica-grc/images/`: `preface-ch-12.png`,
   `problem-1-ch-7.png`, `problem-1-ch-11.png`, `problem-2-ch-2.png`,
   `problem-2-ch-4.png` - black ink on a transparent background, cropped
   to the tight ink bounding box from a thresholded IIIF page scan, same
   technique as `scripts/import-euclid` and `scripts/import-archimedes-shared`.
   Every image was viewed after cropping to confirm it is correct and
   complete (no stray running text, no clipped labels).
2. `scripts/import-aristotle-rest-shared/diagrams/aristotle.ts` - the
   `DIAGRAMS_ARISTOTLE` map.
3. This report.
4. `scripts/import-aristotle-rest-shared/diagrams/check-aristotle.ts` -
   asserts every image exists at its stated pixel size (PNG, with alpha)
   and that every `divisionId`/`passageIndex` resolves correctly at its
   documented array position in `work.json`. Run with:
   `npx tsx scripts/import-aristotle-rest-shared/diagrams/check-aristotle.ts`
   - currently passes (10/10 checks: 5 images + 5 division placements).

No importer, `work.json`, or `about.json` was edited. Nothing was
committed.
