# Phase 4 sources — the statics reading list and the Einstein corpus

Compiled 2026-09-23 from the Phase 4 research pass (source availability, edition, licence and
transcription quality for every item on the user's 17-stage statics list, plus Einstein). Every
lane below is to be imported **in its entirety** (never excerpts), verified against its raw source
by the orchestrator, and disclosed on the work's About page. Items already in the library (Euclid,
Archimedes, Aristotle's Mechanica/Physics, Ptolemy, Newton) are not repeated here.

Legend for the *Text* column: **PD-en** = public-domain English available and usable as reading
text; **orig-only** = ship the original language only, with an About-page note that no
public-domain English translation of adequate quality exists (the policy already applied to
Physics, De Legibus, Mechanica); **OCR** = the only source is a scanned printing whose OCR must be
proofread page by page (OCR-base + correction files, residual vocabulary audit — see the
Monarchia-la / Vita Nuova-it lanes).

## A. The statics list

| # | Author, work | Original text | English | Notes |
|---|---|---|---|---|
| 1 | Pappus of Alexandria, *Collection* Book VIII (mechanics) | Hultsch, *Pappi Alexandrini Collectionis quae supersunt* vol. III (Berlin 1878), archive.org scan; Greek is **OCR** only — First1KGreek's tlg2032 directory holds no Book VIII text | none PD (Ver Eecke's French 1933 and later English are in copyright) | orig-only + OCR. Proposition/figure structure must be rebuilt from the printed heads; diagrams via IIIF as for Archimedes. |
| 2 | Jordanus de Nemore, *De ratione ponderis* / *Elementa super demonstrationem ponderum* | no usable transcription found; the 1565 Tartaglia printing (*Iordani opusculum de ponderositate*) exists as a scan but is early-modern typography that OCRs unusably; Moody & Clagett 1952 edition is in copyright | none PD | **not available** — record on the About page as a known gap rather than ship an unverifiable OCR. |
| 3 | Simon Stevin, *De Beghinselen der Weeghconst* (1586) | DBNL (dbnl.org) has a full digital text of the 1586 Dutch edition, proofread, free for non-commercial reuse (check DBNL's terms at import); also the Wisconstige Gedachtenissen scans | none PD (the 1955–66 Principal Works translation is in copyright) | orig-only (Dutch). Diagrams from the 1586 scan (archive.org / Google Books) via IIIF where available. |
| 4 | Galileo, *Le mecaniche* (c. 1600) and *Discorsi* (1638) | it.wikisource: Favaro's Edizione Nazionale text of the *Discorsi* (four Days + the appendix on centres of gravity) and *Le mecaniche* (the "Sixth Day" material is under *Le mecaniche*, not the Discorsi) — wikitext, proofread against Favaro | Crew & de Salvio, *Dialogues Concerning Two New Sciences* (Macmillan 1914), PD; source en.wikisource (transcluded page-scans) or the archive.org scan — **not** Project Gutenberg #37729, whose text has silent edits | both. Verify the wikitext against Favaro's page numbering; math typeset in LaTeX on Wikisource must be flattened to readable text and disclosed. |
| 5 | Descartes, mechanics letters / *Discours* + *Essais* (1637) | fr.wikisource: 1637 Leiden text (Adam–Tannery numbering), proofread | the Smith & Latham *Geometry* (1925, PD in the US) is **OCR** only (archive.org); the 1637 letter to Huygens on mechanics ("Explication des engins") has no PD English | French from Wikisource; English *Geometry* via OCR-proofread lane, or orig-only for the mechanics letter. |
| 6 | Varignon, *Nouvelle mécanique ou statique* (1725) | Google Books / archive.org scans only — **OCR**, 18th-c. French typography (long s) | none PD | orig-only + OCR (heavy). Consider deferring; if imported, the residual audit must use a modern French wordlist plus the long-s substitution. |
| 7 | Lagrange, *Mécanique analytique* (1788 / 1811–15) | fr.wikisource has the complete 1811–15 second edition (Œuvres, Serret ed.), proofread, formulas in LaTeX `<math>` | none PD (the 1997 Boissonnade–Vagliente translation is in copyright) | orig-only (French). Flatten `<math>` to a readable linear form and keep the TeX in a `math` field for later rendering; disclose. |
| 8 | Coulomb, *Essai sur une application des règles de maximis et minimis à quelques problèmes de statique* (1773) | Mémoires de mathématique et de physique présentés à l'Académie (1776) — scans only, **OCR** | Heyman's 1972 translation is in copyright | orig-only + OCR. |
| 9 | Poinsot, *Éléments de statique* (1803; later eds.) | Google Books / archive.org scans of the 1803 or 1877 (12th) edition — **OCR** | none PD | orig-only + OCR; the theory of couples chapters carry figures (IIIF). |
| 10 | Maxwell, "On Reciprocal Figures, Frames, and Diagrams of Forces" (1870) and "On reciprocal figures and diagrams of forces" (1864) | *Scientific Papers* vol. I/II (Cambridge 1890), archive.org — **OCR** (English), with many plates | same | English via OCR-proofread lane; the reciprocal-figure plates are essential and must be cropped from the scan. |
| 11 | Gibbs & Wilson, *Vector Analysis* (1901) | archive.org scans (Yale 1901 / 1913 printings) — **OCR**, dense vector notation | same | English via OCR-proofread lane; notation (bold vectors, dot/cross) must be encoded explicitly and disclosed. |
| 12 | Baker & Haynes, *Engineering Statics: Open and Interactive* | PreTeXt source, GitHub `dantheboatman/EngineeringStatics`, authors Daniel W. Baker and William Haynes, licence CC BY-NC-SA 4.0 | same | Include under its licence with full attribution and a note that the app's own licence terms for that work are BY-NC-SA. Convert PreTeXt to the GenericWork shape (chapters → sections; keep example/exercise structure; images from the repo). |

Stages of the user's list not represented above (Euclid, Archimedes, Aristotle *Mechanica* and
*Physics*, Ptolemy, Newton) are already imported.

## B. Einstein — pre-1931 corpus (public domain)

Policy (user, 2026-09-23): ship everything published up to 1930 that has a public-domain text,
and list explicitly what misses the cut.

| Work | Original | English | Notes |
|---|---|---|---|
| "Zur Elektrodynamik bewegter Körper" (1905) | de.wikisource, proofread, clean | "On the Electrodynamics of Moving Bodies" in *The Principle of Relativity* (Calcutta 1920, trans. Saha & Bose), Project Gutenberg #66944 | both |
| "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?" (1905) | de.wikisource, proofread | same volume (PG #66944) | both |
| "Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt" (1905, photoelectric effect) | de.wikisource page-scan transclusion, proofread | none PD found | orig-only |
| "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung…" (1905, Brownian motion) | scan only (Annalen der Physik) — **OCR** | Cowper's 1926 translation (*Investigations on the Theory of the Brownian Movement*, Methuen) is PD in the US but only as OCR | orig via OCR; English via OCR-proofread lane |
| "Die Grundlage der allgemeinen Relativitätstheorie" (1916) | scan only — **OCR** | "The Foundation of the General Theory of Relativity", also in PG #66944 (Calcutta 1920) | English from PG; German via OCR |
| *Über die spezielle und die allgemeine Relativitätstheorie (gemeinverständlich)* (1917) | scan only — **OCR** | *Relativity: The Special and General Theory*, trans. R. W. Lawson (1920; 1924 revised ed.), Project Gutenberg #30155 | English from PG (state which edition); German via OCR |
| *Sidelights on Relativity* (1922: "Ether and the Theory of Relativity", "Geometry and Experience") | German originals 1920/1921, scan only | Project Gutenberg #7333 (trans. Jeffery & Perrett) | English from PG |
| *The Meaning of Relativity* (Princeton lectures, 1922 first edition) | — | Project Gutenberg #36276 (1922 first edition only; later editions add copyrighted appendices) | English from PG, first edition only |
| "Time, Space, and Gravitation" (1920) and "A Brief Outline of the Development of the Theory of Relativity" (1921, *Nature*) | — | en.wikisource, proofread | English from Wikisource |
| Nobel lecture "Fundamental ideas and problems of the theory of relativity" (1923) | — | © The Nobel Foundation | **excluded** (Nobel Foundation copyright, not PD) |

### Misses the cut (post-1930 or still in copyright) — to be listed on the About page

- Einstein, Podolsky & Rosen, "Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?" (1935).
- Einstein & Infeld, *The Evolution of Physics* (1938).
- *Mein Weltbild* (1934) / *The World As I See It* (1934 English).
- *Out of My Later Years* (1950).
- *Ideas and Opinions* (1954).
- The 1923 Nobel lecture (Nobel Foundation copyright).
- Later editions of *The Meaning of Relativity* (appendices 1945–1955).

## C. Order of work

1. Wikisource/Gutenberg lanes first (Galileo it+en, Descartes fr, Lagrange fr, Einstein de+en, Baker & Haynes): mechanical, verifiable against the raw wikitext/HTML.
2. OCR lanes (Pappus, Stevin scan diagrams, Coulomb, Poinsot, Varignon, Maxwell, Gibbs & Wilson, Einstein German scans, Brownian English): OCR base + per-page correction files, residual vocabulary audit, page-image confirmation of every suspect, diagrams via IIIF.
3. Record Jordanus as unavailable on the About page.
