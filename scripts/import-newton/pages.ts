/**
 * Page plans for the Newton importer (Principia Latin + English, Opticks).
 *
 * LATIN: Philosophiae Naturalis Principia Mathematica, EDITIO PRINCEPS (1687),
 * la.wikisource, djvu "Principia newton la.djvu". Confirmed by direct
 * inspection of the work's own wikitext ({{titulus2|...|Annus=1687|...}} on
 * every subpage) — this is the FIRST edition, not the 2nd (1713) or 3rd
 * (1726). It therefore has NO General Scholium (first added in 1713) and
 * opens Book III with "HYPOTHESES" (9 hypotheses), not the four-rule
 * "Regulæ Philosophandi" + separate "Phænomena" that later editions use —
 * both genuine textual facts about this edition, not importer gaps.
 *
 * IMPORTANT DISCOVERED DEFECT: the work's own front-page index links to
 * "Philosophiae Naturalis Principia Mathematica - DE MUNDI SYSTEMATE LIBER
 * TERTIUS." for Book III — that page is NOT Newton's text at all. Direct
 * inspection (and its own one-revision page history, dated 2026-01-16, by an
 * anonymous/temporary user) shows it is unrelated Spanish-language spam/
 * vandalism, never any part of the Principia. The REAL, complete, proofread
 * page-scan text for Book III lives at a differently-named page,
 * "Philosophiae Naturalis Principia Mathematica/Liber III" (djvu pp
 * 240-306), which is NOT linked from the work's own front-page index but was
 * located via a full `list=allpages` census of the work's subpages. This
 * importer uses ONLY the real page; the vandalised stub is never read or
 * imported, and the discrepancy is disclosed in about.json/anomalies.json.
 *
 * ENGLISH: "The Mathematical Principles of Natural Philosophy" (1846), the
 * first American edition, en.wikisource, djvu "Newton's Principia (1846).djvu"
 * — Andrew Motte's 1729 translation (of the 3rd, 1726, Latin edition),
 * revised/edited by N. W. Chittenden. Confirmed complete through Book III and
 * the General Scholium (see the work's own table of contents, captured in
 * research). "The System of the World" and the back-of-book "Index" are
 * separate matter and are NOT imported (outside the Principia proper).
 *
 * All pages are MediaWiki ProofreadPage ".../<pages index=... />" page-scan
 * transclusions; fetched once each via action=parse&prop=text (rendered HTML,
 * needed for the <figure>/diagram and <math> MathML markup) and cached under
 * raw/la/ or raw/en/. Never re-fetched once cached.
 */

export interface PagePlan {
  /** exact Wikisource page title (as it must be requested from the API) */
  title: string;
  /** cache file name under raw/<lang>/ */
  file: string;
  /** which reader Division this page's content belongs under */
  section: string;
}

export const LATIN_PAGES: PagePlan[] = [
  { title: "Philosophiae Naturalis Principia Mathematica/Auctoris præfatio ad lectorem", file: 'preface-auctoris.json', section: 'prefaces' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Viri Præstantissimi', file: 'preface-halley-ode.json', section: 'prefaces' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Definitiones', file: 'definitiones.json', section: 'definitions' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Axiomata, sive Leges Motus', file: 'axiomata.json', section: 'axioms' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. I. DE Methodo rationum primarum & ultima rum.', file: 'book1-sect1.json', section: 'book-1-sec-1' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. II. De inventione Virium centripetarum.', file: 'book1-sect2.json', section: 'book-1-sec-2' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. III. De motu corporum in Conicis sectionibus eccentri cis.', file: 'book1-sect3.json', section: 'book-1-sec-3' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. IV. De inventione Orbium Elliptieorum, Parabolieorum & Hyperbolieorum ex Umbilico dato.', file: 'book1-sect4.json', section: 'book-1-sec-4' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. V. De inventione Orbium ubi Umbilicus neuter datur.', file: 'book1-sect5.json', section: 'book-1-sec-5' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. VI. De inventione Motuum in Orbibus datis.', file: 'book1-sect6.json', section: 'book-1-sec-6' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. VII. De corporum Ascensu & Descensu rectilineo.', file: 'book1-sect7.json', section: 'book-1-sec-7' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. VIII. De inventione Orbium in quibus corpora Viribus quibuscunque centripetis agitata revolvuntur.', file: 'book1-sect8.json', section: 'book-1-sec-8' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. IX. De Motu corporum in Orbibus mobilibus, deque Motu Apsidum.', file: 'book1-sect9.json', section: 'book-1-sec-9' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. X. De Motu corporum in Superficiebus datis, deque Funependulorum Motu reciproco.', file: 'book1-sect10.json', section: 'book-1-sec-10' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. XI. De Motu corporum Viribus centripetis se mutuo pe tentium.', file: 'book1-sect11.json', section: 'book-1-sec-11' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. XII. De corporum Sphærieorum Viribus attractivis.', file: 'book1-sect12.json', section: 'book-1-sec-12' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. XIII. De corporum non Sphærieorum Viribus attracti vis.', file: 'book1-sect13.json', section: 'book-1-sec-13' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber I/Sect. XIV. De Motu corporum Minimorum, quæ Veribus cen tripetis ad singulas Magni alicujus corporis partes ten dentibus agitantur.', file: 'book1-sect14.json', section: 'book-1-sec-14' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. I. De Motu corporum quibus resistitur in ratione velocitatis.', file: 'book2-sect1.json', section: 'book-2-sec-1' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. II. De motu corporum quibus resistitur in duplicata ratione velocitatum.', file: 'book2-sect2.json', section: 'book-2-sec-2' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. III. De motu corporum quæ resistuntur partim in ratione velocitatis, partim in ejusdem ratione duplicata.', file: 'book2-sect3.json', section: 'book-2-sec-3' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. IV. De Corporum circulari Motu in Mediis resistentibus.', file: 'book2-sect4.json', section: 'book-2-sec-4' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. V. De Densitate & compressione Fluidorum, deque Hydrostatica.', file: 'book2-sect5.json', section: 'book-2-sec-5' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. VI. De Motu & resistentia Corporum Funependulorum.', file: 'book2-sect6.json', section: 'book-2-sec-6' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. VII. De Motu Fluidorum & resistentia Projectilium.', file: 'book2-sect7.json', section: 'book-2-sec-7' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. VIII. De Motu per Fluida propagato.', file: 'book2-sect8.json', section: 'book-2-sec-8' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber II/Sect. IX. De motu Circulari Fluidorum.', file: 'book2-sect9.json', section: 'book-2-sec-9' },
  { title: 'Philosophiae Naturalis Principia Mathematica/Liber III', file: 'book3.json', section: 'book-3' },
];

export const ENGLISH_PAGES: PagePlan[] = [
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/The Author\'s Preface', file: 'preface-authors.json', section: 'prefaces' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/Dedication', file: 'dedication.json', section: 'prefaces-check' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/Definitions', file: 'definitions.json', section: 'definitions' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/Axioms, or Laws of Motion', file: 'axioms.json', section: 'axioms' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-I', file: 'book1-sect1.json', section: 'book-1-sec-1' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-II', file: 'book1-sect2.json', section: 'book-1-sec-2' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-III', file: 'book1-sect3.json', section: 'book-1-sec-3' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-IV', file: 'book1-sect4.json', section: 'book-1-sec-4' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-V', file: 'book1-sect5.json', section: 'book-1-sec-5' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-VI', file: 'book1-sect6.json', section: 'book-1-sec-6' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-VII', file: 'book1-sect7.json', section: 'book-1-sec-7' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-VIII', file: 'book1-sect8.json', section: 'book-1-sec-8' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-IX', file: 'book1-sect9.json', section: 'book-1-sec-9' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-X', file: 'book1-sect10.json', section: 'book-1-sec-10' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-XI', file: 'book1-sect11.json', section: 'book-1-sec-11' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-XII', file: 'book1-sect12.json', section: 'book-1-sec-12' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-XIII', file: 'book1-sect13.json', section: 'book-1-sec-13' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookI-XIV', file: 'book1-sect14.json', section: 'book-1-sec-14' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-I', file: 'book2-sect1.json', section: 'book-2-sec-1' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-II', file: 'book2-sect2.json', section: 'book-2-sec-2' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-III', file: 'book2-sect3.json', section: 'book-2-sec-3' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-IV', file: 'book2-sect4.json', section: 'book-2-sec-4' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-V', file: 'book2-sect5.json', section: 'book-2-sec-5' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-VI', file: 'book2-sect6.json', section: 'book-2-sec-6' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-VII', file: 'book2-sect7.json', section: 'book-2-sec-7' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-VIII', file: 'book2-sect8.json', section: 'book-2-sec-8' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookII-IX', file: 'book2-sect9.json', section: 'book-2-sec-9' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII', file: 'book3-intro.json', section: 'book-3-intro' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Rules', file: 'book3-rules.json', section: 'book-3-rules' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Phaenomena', file: 'book3-phaenomena.json', section: 'book-3-phaenomena' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop1', file: 'book3-prop1.json', section: 'book-3-prop1' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop2', file: 'book3-prop2.json', section: 'book-3-prop2' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop3', file: 'book3-prop3.json', section: 'book-3-prop3' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop4', file: 'book3-prop4.json', section: 'book-3-prop4' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop5', file: 'book3-prop5.json', section: 'book-3-prop5' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-Prop6', file: 'book3-prop6.json', section: 'book-3-prop6' },
  { title: 'The Mathematical Principles of Natural Philosophy (1846)/BookIII-General Scholium', file: 'book3-general-scholium.json', section: 'general-scholium' },
];
