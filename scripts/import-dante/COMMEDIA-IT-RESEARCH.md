# Research: Italian originals for Commedia and Convivio

Research only. No data/ directory or importer code was created or touched as part of this
document. All findings below come from direct inspection of primary sources (live-fetched
catalog pages, downloaded djvu.txt OCR transcriptions, and archive.org page images viewed
directly), not from memory or guesswork. Every quote is verbatim and kept to the session's
~15-word copyright limit; longer descriptions are paraphrased.

---

## D. La Divina Commedia (Italian)

### D1. Liber Liber's e-text

Liber Liber actually hosts **two** separate Commedia e-texts, at two different URLs:

1. `https://www.liberliber.it/online/autori/autori-a/dante-alighieri/la-divina-commedia-edizione-petrocchi/`
   — explicitly the Petrocchi edition (already known/rejected: Petrocchi is post-1931 and
   copyrighted).
2. `https://www.liberliber.it/online/autori/autori-a/dante-alighieri/la-divina-commedia-edizione-scartazzini-e-vandelli/`
   — the older, previously-considered candidate, labelled "Edizione Scartazzini e Vandelli."

For (2), the page's own short description ("descrizione breve") states:

> "Il testo della presente edizione riproduce quello curato da Scartazzini e Vandelli."

However, the same scheda's **"opera di riferimento"** (reference-work) field — the field that
actually states what printed source the digitisation was made from — reads, verbatim:

> Dante Alighieri, "La Divina Commedia : Le Rime, i Versi della Vita Nuova e le Canzoni del
> Convivio", a cura di **Cesare Gàrboli**, Torino, Giulio **Einaudi** Editore, **1954**,
> PARNASO ITALIANO/II

This is the key finding: despite the page's title/description invoking the historic
Scartazzini–Vandelli commentary tradition, Liber Liber's own bibliographic record states the
actual text was keyed from **Cesare Gàrboli's 1954 Einaudi edition** — a 20th-century,
post-1931 edited text, copyrighted on exactly the same grounds that caused this app to already
reject the Petrocchi edition. Digitisation/publication credits on the scheda: digitalizzazione
Lorenzo Moretti; pubblicazione/revisione Catia Righi; data pubblicazione 21 giugno 2005.

**Conclusion for D1:** Liber Liber offers no faithful pre-1931 Commedia text. Both of its
Commedia e-texts trace to 20th-century copyrighted editions (Petrocchi 1966–67; Gàrboli/Einaudi
1954), regardless of the older editorial names in the page titles/descriptions.

### D2. Project Gutenberg #1000

Fetched `https://www.gutenberg.org/ebooks/1000.txt.utf-8` (full text, 20,251 lines) and the
catalog page `https://www.gutenberg.org/ebooks/1000`.

**No edition/transcriber statement exists anywhere.** The PG boilerplate header/footer contains
only the generic PG License text ("Project Gutenberg volunteers and employees expend
considerable effort to identify, do copyright research on, transcribe and proofread works...");
there is no "Produced by," no named transcriber, and the catalog page's Credits field is empty.
eBook #1000 was first released August 1, 1997 — one of PG's earliest Italian texts, predating
PG's later convention of citing a specific source edition. This absence of provenance is itself
a red flag.

**Collation methodology.** To determine which critical tradition PG1000 actually follows, I did
not rely on secondary summaries (which proved hard to find with citable, line-specific detail
via web search). Instead I directly collated PG1000 against two primary texts, line by line,
for three full cantos (Inferno I, Inferno XXVI, Purgatorio XXXIII):

- The **1921 SDI/Vandelli text**, transcribed from archive.org's own djvu.txt of item
  `leoperedidantebarbi` (see D4) — this is the actual 1921 vulgate text, not a paraphrase of it.
- **Petrocchi's actual critical text**, fetched live from `danteonline.it`, the Società
  Dantesca Italiana's own digital edition (`opera=Commedia - ed. Petrocchi`), for the same
  three cantos.

**The three lines the task asked to spot-check are NOT divergence loci at all** — all three
sources agree substantively:

- **Inferno I.105**: 1921 "Questi non ciberà terra nè peltro," / Petrocchi & PG1000 "Questi non
  ciberà terra né peltro," — same wording (only the accent-grave/acute convention differs,
  which is a house-style choice in the 1921 print, not a textual variant).
- **Inferno XXVI.90**: 1921 "gittò voce di fuori, e disse: «Quando" / Petrocchi & PG1000 "gittò
  voce di fuori e disse: «Quando" — identical wording, comma only.
- **Purgatorio XXXIII.84**: 1921 "che più la perde quanto più s'aiuta ? »" / Petrocchi & PG1000
  "che più la perde quanto più s'aiuta?»." — identical wording.

**But the same three cantos contain at least 14 genuine word-level divergences** between the
1921 text and Petrocchi's text (verified directly against both primary sources, and against
1921's actual page images for the Inferno I instances — see D4). At **every single one**,
PG1000 follows Petrocchi, never the 1921/Vandelli reading:

| Locus | 1921 SDI/Vandelli | Petrocchi | PG1000 follows |
|---|---|---|---|
| Inf. I.42 | fera | fiera | Petrocchi |
| Inf. I.45 | venesse | venisse | Petrocchi |
| Inf. I.48 | temesse | tremesse | Petrocchi |
| Inf. I.72 | al tempo | nel tempo | Petrocchi |
| Inf. I.74 | da Troia | di Troia | Petrocchi |
| Inf. I.113 | per luogo etterno | per loco etterno | Petrocchi |
| Inf. I.136 | tenni retro | tenni dietro | Petrocchi |
| Inf. XXVI.48 | ciascun ... ch'egli | catun ... ch'elli | Petrocchi |
| Inf. XXVI.64 | ten prego | ten priego | Petrocchi |
| Inf. XXVI.74 | perchè fuor greci (no pronoun) | perch'e' fuor greci | Petrocchi |
| Inf. XXVI.96 | poter dentro da me | potero dentro a me | Petrocchi |
| Purg. XXXIII.21 | com'io doveva | com'io dovëa | Petrocchi |
| Purg. XXXIII.36 | l'aquila | l'aguglia | Petrocchi |
| Purg. XXXIII.48 | monstro | mostro | Petrocchi |

**Conclusion for D2:** PG1000 is, at the word level, Petrocchi's critical text (or a direct
descendant of it), not an independent pre-1931 witness. It carries no edition statement, but
its readings track Petrocchi's editorial choices exactly and diverge from the 1921 vulgate at
every tested crux. This means PG1000 — despite being hosted as a "public domain" e-text —
appears to reproduce Giorgio Petrocchi's 1966–67 critical edition (Mondadori, for the Società
Dantesca Italiana's Edizione Nazionale), which is the same 20th-century, post-1931, editorially
copyrighted category this app already rejected once directly. It should **not** be treated as a
safe stand-in for the rejected Petrocchi edition; it is that edition wearing a different
wrapper.

### D3. Perseus Digital Library

Perseus does list a Dante Comoedia text:
`https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:2011.01.0191`. The catalog title
itself states the edition, verbatim:

> Alighieri, Dante ... Comoedia, Comoedia Com. incipit Comoedia **(S. Bellomo, 2004)**, section 1

(A direct fetch of the page for further scheda text returned HTTP 503; the catalog listing
itself, however, already answers the edition question.) **S. Bellomo, 2004** is Saverio
Bellomo's modern critical/commented edition — another 20th/21st-century, post-1931, copyrighted
text. Perseus's Italian Comoedia is not a usable route either.

**Conclusion for D3:** No pre-1931 edition available through Perseus.

### D4. The 1921 SDI (Vandelli) edition on archive.org

**Identifier: `leoperedidantebarbi`** — "Le opere di Dante, testo critico della Società
dantesca italiana a cura di M. Barbi, E. G. Parodi, F. Pellegrini, E. Pistelli, P. Rajna, E.
Rostagno, G. Vandelli. Con indice analitico ... di Mario Casella." Firenze: R. Bemporad e
figlio, **1921**. 1,034 pages; djvu.txt, JP2 page images, and IIIF access all present; Public
Domain Mark 1.0. This is the genuine one-volume 1921 SDI critical edition (Commedia + Vita
Nuova + Rime + Convivio + De Vulgari Eloquentia + Monarchia + Epistole + Egloge + Quaestio, plus
Casella's analytical index), the volume the app's own established policy already treats as the
pre-1931 benchmark.

**Method:** used archive.org's search-inside API to locate the leaf/page for each sample
canto's opening, downloaded the actual page images via the IIIF endpoint
(`https://iiif.archive.org/iiif/leoperedidantebarbi$<leaf>/full/1600,/0/default.jpg`), viewed
them directly, and counted every discrepancy against the djvu.txt transcription line by line.
Three cantos spread across the work were sampled:

**Inferno I** (leaves 526–527, lines 1–69 checked against images): **14 OCR errors in 69
lines ≈ 20 errors/100 lines.** Examples: "ma" OCR'd as "m8"; "Ed" OCR'd as "Fd"; the elided
article "'l" systematically misread as the digit-string "'1" (occurs repeatedly); "si"/"mi"
picking up spurious accents ("sì"/"mì"); "Rispuosemi" garbled to "Rispuoseini"; the marginal
line-number "69" bleeding into the text as a stray "GI" prefix.

**Purgatorio XVI** (leaf 696, Purg. XV.118–144 + XVI.1–9, 36 lines checked): **5 errors ≈ 14
errors/100 lines.** Examples: marginal line-number "135" misread as "155"; a closing quote mark
OCR'd as a degree sign "°"; "ci" garbled to "cì"; a doubled stray apostrophe in "s'' accostò".

**Paradiso XXX** (leaf 865, Par. XXIX.142–145 + XXX.1–33, 37 lines checked): **2 errors ≈ 5
errors/100 lines.** Examples: "l'" (etterno) OCR'd as "]'"; "vidi" OCR'd as "vidì".

Error rates varied noticeably by canto/page (roughly 5–20 per 100 lines in this sample), mostly
single-character substitutions in accents, apostrophes and elisions, plus occasional garbled
whole words and marginal line-numbers bleeding into the verse text — not evenly distributed,
and worse in the earlier (Inferno) sample than the later (Paradiso) one in this small sample.
The **underlying page images themselves are clean, sharp, and fully legible** at 1600px width;
every error found was an OCR/transcription fault, not a scan-quality problem, meaning manual
correction against the images is straightforward in principle, just labor-intensive.

**Conclusion for D4:** This is the one genuinely pre-1931, faithful, publicly-available Italian
Commedia critical text with both OCR text and viewable page scans. Its djvu.txt is usable as a
first draft but is not reliable as-is; every line would need checking against the page images.

---

## E. Il Convivio (Italian)

Two pre-1931 candidates were checked and **both exist on archive.org with usable OCR text and
viewable page scans.**

**E. Moore & P. Toynbee, "Tutte le opere di Dante Alighieri"** (Oxford, Clarendon Press; 1st
ed. 1894, 2nd ed. 1897, reprinted through 1904 — the "Oxford Dante"). Multiple archive.org
scans exist: `dli.bengal.10689.6485` and `in.ernet.dli.2015.318626` (1894, 1st ed.);
`tutteleoperedid00aliggoog` and `tutteleoperedid00toyngoog` (1897, 2nd ed.);
`tutteleoperedida00dant`, `tutteleoperedid01aliggoog`/`tutteleoperedid01toyngoog`,
`tutteleoperedid02aliggoog`/`tutteleoperedid02toyngoog` (1904 reprints). Checked
`tutteleoperedid00aliggoog` directly: its table of contents (extracted from djvu.txt) confirms
"IL CONVITO" (Convivio) occupies pages 235–338 of that printing, as its own section distinct
from the Commedia (1–154), Canzoniere (155–182), Vita Nuova (203–234), De Monarchia (339–376)
and De Vulgari Eloquio (377–400). I located and viewed the actual page images for this section
via IIIF: leaf 251 is the "IL CONVITO" section title page; leaves 253–254 are genuine Convivio
body text (Trattato I, cc. 1–2), clearly legible. A spot-check of the djvu.txt against the leaf
254 image found it substantively accurate with occasional clear character-level OCR faults
(e.g. "misericordevolmente" OCR'd as "xaisericordevolmente"), similar in kind and rough rate to
the 1921 Commedia sample above. Full djvu.txt, hOCR, and page-image formats (JP2/Text PDF) are
all present.

**G. B. Giuliani, "Il convito di Dante Alighieri reintegrato nel testo con nuovo commento"**
(Firenze, Successori Le Monnier, **1874**). Found at archive.org identifier
**`ilconvitodidant00dant`** (952 page images; djvu.txt, hOCR and JP2 scans all present; also
catalogued at the Library of Congress). Confirmed via djvu.txt that the genuine Convivio
incipit — "Siccome dice il Filosofo nel principio della Prima [Filosofia]..." — and the
"TRATTATO PRIMO" heading are present at the expected location. Directly viewed a body page
(leaf 80 = printed page 26, Trattato I): the scan is a crisp, fully legible 19th-century
typeset page with marginal Convivio line-numbers, easily readable and well-suited to manual
OCR-correction. Because this is a heavily annotated "reintegrato nel testo con nuovo commento"
edition, Dante's actual text is interleaved with substantial 19th-century commentary (hence 952
images for a work that occupies ~104 pages in Moore's plain edition) — a future importer would
need to separate primary text from Giuliani's notes.

**Conclusion for E:** A pre-1931 Convivio transcription with both usable OCR text and viewable
page scans is realistically available, via two independent, cross-checkable routes.

---

## Recommendation

**Commedia (Italian):** Not practical to import right now from any of the three "easy" routes
checked (Liber Liber, PG1000, Perseus) — all three ultimately trace to post-1931 copyrighted
critical editions (Gàrboli/Einaudi 1954, Petrocchi 1966–67, and Bellomo 2004, respectively),
the exact problem that caused the original rejections. The **only faithful pre-1931 route** is
a fresh transcription from the 1921 SDI/Vandelli scan itself (`leoperedidantebarbi` on
archive.org), built against its page images rather than trusting its existing OCR. Budget
realistically: this is a ~14,300-line, 100-canto work; at the observed 5–20-error-per-100-lines
range (worse in Inferno than Paradiso in this sample, but not tested exhaustively canto-by-
canto), expect on the order of many hundreds to roughly a thousand-plus individual line
corrections against page images across the full poem — comparable in scale to the other
from-scratch verified transcriptions already shipped in this app, not a quick copy-paste job.
Note also that the 1921 text's orthography and several substantive readings (fera/fiera,
temesse/tremesse, aquila/aguglia, ciascun/catun, etc.) differ systematically from the
Petrocchi-descended text most modern readers expect, which is a legitimate pre-1931 critical
text but will read as "old-fashioned" next to standard modern printings — worth flagging to the
user as an editorial-tone decision, not a blocker.

**Convivio (Italian):** Practical. Recommend **Moore & Toynbee's Oxford "Tutte le opere"
(1894/97/1904)** as the primary source — it is a plain scholarly text without interleaved
commentary, matching the format already used elsewhere in this app, and multiple independent
archive.org scans of it exist for cross-checking. Use **Giuliani's 1874 "Il convito"** (archive.org
`ilconvitodidant00dant`) as a secondary source to cross-check individual readings, keeping in
mind its text is interleaved with heavy commentary that must be stripped. Scale: Convivio's "Il
Convito" section is ~104 pages in the Moore printing (pp. 235–338, four trattati) — a
single-cantica-sized correction task at similar per-page OCR-error rates to what was measured
for the Commedia sample above, i.e. bounded and comparable to (smaller than) one cantica of the
Commedia effort.
