/**
 * Newton importer driver - Principia (Latin 1687 + English 1846) and Opticks
 * (English 4th ed., 1730). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-newton/fetchRaw.ts     (once; caches raw/)
 *   npx tsx scripts/import-newton/index.ts
 *   npx tsx scripts/import-newton/validate.ts
 *
 * Writes data/newton-principia-la/{work,about,anomalies}.json + types.ts,
 * data/newton-principia-en/{...}, data/newton-opticks-en/{...}.
 *
 * See fetchRaw.ts/pages.ts for the source pages, classify.ts/walk.ts/
 * assemble.ts/buildPrincipia.ts for the Principia page-scan structural
 * parser, and buildOpticks.ts for the Opticks plain-text parser. Every
 * module's own doc comment records exactly what was found by direct
 * inspection and why each parsing rule exists - nothing here is guessed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnglishPrincipia, buildLatinPrincipia } from './buildPrincipia.ts';
import { buildOpticks } from './buildOpticks.ts';
import type { Anomaly, Division, GenericWork, WorkAbout } from './sharedTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

const SHARED_TYPES_SRC = readFileSync(join(HERE, 'sharedTypes.ts'), 'utf8');

function writeWork(workId: string, language: 'la' | 'en', divisions: Division[], about: WorkAbout, anomalies: Anomaly[]): void {
  const dir = join(DATA_ROOT, workId);
  mkdirSync(dir, { recursive: true });
  const work: GenericWork = { workId, language, divisions };
  writeFileSync(join(dir, 'work.json'), JSON.stringify(work, null, 2) + '\n', 'utf8');
  writeFileSync(join(dir, 'about.json'), JSON.stringify(about, null, 2) + '\n', 'utf8');
  writeFileSync(join(dir, 'anomalies.json'), JSON.stringify(anomalies, null, 2) + '\n', 'utf8');
  writeFileSync(join(dir, 'types.ts'), SHARED_TYPES_SRC.replace(
    '/**\n * Structural types shared by both Newton works',
    `/**\n * Generated (do not hand-edit) by scripts/import-newton/index.ts for ${workId}.\n * Structural types shared by both Newton works`,
  ), 'utf8');
  let chars = 0;
  let divCount = 0;
  const walk = (d: Division) => { divCount += 1; for (const p of d.passages) chars += p.text.length; for (const c of d.children) walk(c); };
  for (const d of divisions) walk(d);
  process.stdout.write(`  wrote data/${workId}/  (${divCount} divisions, ${chars} chars, ${anomalies.length} anomalies)\n`);
}

// ===========================================================================
// newton-principia-la
// ===========================================================================
function runLatinPrincipia(): void {
  const r = buildLatinPrincipia(join(HERE, 'raw', 'la'));
  const anomalies = [...r.anomalies];

  const about: WorkAbout = {
    workId: 'newton-principia-la',
    title: 'Philosophiæ Naturalis Principia Mathematica',
    author: 'Isaac Newton',
    language: 'la',
    edition: 'Editio princeps (London: Jussu Societatis Regiae ac Typis Josephi Streater, 1687)',
    provenance:
      'Latin Wikisource, page "Philosophiae Naturalis Principia Mathematica" and its subpages (a proofread page-scan transclusion of djvu "Principia newton la.djvu"), fetched once via the MediaWiki action=parse&prop=text API (rendered HTML, needed for this source\'s <figure> diagram markers and <math> MathML) and cached under scripts/import-newton/raw/la/; imported by scripts/import-newton.',
    license:
      "Newton's 1687 first edition is in the public domain. The digital transcription (a proofread page-scan of a public-domain copy) is distributed by Wikisource / the Wikimedia Foundation under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is the editio princeps of Newton\'s Philosophiæ Naturalis Principia Mathematica - the FIRST edition, published in 1687 under the imprimatur of the Royal Society, edited for the press by Edmond Halley. It is not the 1713 (2nd, ed. Roger Cotes) or 1726 (3rd, ed. Henry Pemberton) edition; see "Known gaps & anomalies" below for exactly what that means for this text\'s contents (most importantly: no General Scholium, and Book III opens with nine "Hypotheses" rather than the four-rule "Regulae Philosophandi" plus separate "Phaenomena" of later editions).',
          'The text here is Newton\'s Latin, verbatim throughout. Nothing is translated, modernised, or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Isaac Newton, Philosophiæ Naturalis Principia Mathematica (London: Jussu Societatis Regiae ac Typis Josephi Streater, 1687). Edmond Halley saw the work through the press and also contributed his own prefatory Latin ode, "In viri praestantissimi D. Isaaci Newtoni opus hocce mathematico physicum" - printed immediately after Newton\'s own preface in every edition since, and imported here (Division id prefaces-halley-ode) with its authorship clearly disclosed.',
          'The work is divided into an Author\'s Preface, Definitions (8), Axioms/Laws of Motion (3 Laws + 6 Corollaries), and three Books: Book I (14 numbered Sections, 98 Propositions, 29 Lemmas), Book II (9 numbered Sections, 51 Propositions in this edition, 4 Lemmas), and Book III (no numbered Sections - opens directly with 9 unnumbered-group "Hypotheses", then 42 Propositions and 11 Lemmas, ending "FINIS.").',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is Latin Wikisource\'s proofread page-scan transclusion of a public-domain copy of the 1687 first edition (djvu "Principia newton la.djvu"; individual page quality levels inspected were "4" - validated twice - confirming a genuine proofread transcription, not raw/uncorrected OCR). Every page used by this import was fetched once (rendered HTML, via action=parse&prop=text, since the plain wikitext of a page-scan transclusion carries only a `<pages .../>` marker and none of the actual text, diagram markers, or MathML) and is cached under scripts/import-newton/raw/la/; nothing is loaded from the network at runtime.',
          'IMPORTANT DISCOVERED DEFECT in this Wikisource work\'s own front-page index. The work\'s own top-level index page links to a subpage titled "Philosophiae Naturalis Principia Mathematica - DE MUNDI SYSTEMATE LIBER TERTIUS." for Book III. Direct inspection shows that page is NOT Newton\'s text at all - it holds a single paragraph of unrelated Spanish-language content with no connection to the Principia, created in a single edit (dated 2026-01-16, by an anonymous/temporary editor) that never touched any genuine Newton text; its own one-entry page-history confirms this is spam/vandalism, not a damaged transcription. The REAL, complete, proofread page-scan text for Book III - covering djvu pages 240 to 306 - was located instead at a differently-named page, "Philosophiae Naturalis Principia Mathematica/Liber III", found via a full census (`action=query&list=allpages`) of every subpage of this work rather than by following the work\'s own (broken) index link. This importer reads ONLY that real page; the vandalised stub was never used for a single word of this import.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each fetched page renders its structural headings (Lemma/Proposition/Definition/Law/Corollary/Scholium/Hypotheses) as centred lines (`<div align="center"><p>...</p></div>`), sometimes several to a block (e.g. a Section\'s Roman-numeral banner, its Latin subtitle, and its first Proposition\'s heading can all sit inside one wrapping centred div, each its own `<p>`). This importer walks every page\'s content in document order, classifying each centred line by a fixed heading vocabulary (see scripts/import-newton/classify.ts, built by direct inspection of every fetched page, never guessed) and treating everything else as reading text.',
          'A numbered Proposition, Lemma, Definition, Law, Corollary or (in Book III) Hypothesis becomes its own reader Division, in the source\'s own numbering (continuous through each Book: Book I\'s Lemmas run I-XXIX and its Propositions I-XCVIII across all 14 Sections without resetting; Book III\'s Hypotheses, Lemmas and Propositions each have their own separate count). A Scholium - always printed as its own centred heading, "Scholium." (occasionally abbreviated "Schol.", or headed "Scholium Generale."/"Idem aliter." for an alternate proof) - is NOT a new Division: per this batch\'s brief, it is folded into the PRECEDING item\'s own Division as a further Passage, with the printed heading word kept literally at the start of that passage\'s text (Passage carries no separate heading field). A Corollary/Case/Hypothesis-numbered marker printed INLINE at a paragraph\'s own start ("Corol. 1.", "Cas. 2.", "Hypoth. V.") rather than as its own centred heading is treated the same way when it is a Corollary or Case (a further Passage in the current Division); an inline "Hypoth. N." specifically (Book III only) opens a fresh top-level Division instead, since each Hypothesis is independently numbered and cross-referenced throughout the work exactly like a Proposition. The source sometimes runs two such inline items together in one physical paragraph with no tag break (e.g. Book III\'s Hypoth. IV and Hypoth. V.); a boundary is only ever recognised at the text\'s own start or immediately after a sentence-ending period, specifically so that Newton\'s own constant mid-proof CITATIONS of an earlier item ("per Hypoth. V.", "juxta Legum Corol. I.") are never mistaken for a new one.',
          'Two genuine markup irregularities, confirmed by direct inspection and corrected structurally (not textually): several Propositions/Lemmas print their italicised enunciation as a bare `<i>...</i>` with no wrapping `<p>` at all (e.g. Book I Proposition XLVIII, Book II Section VII Lemma IV) - recovered explicitly, since a naive `<p>`-only reader would silently lose that item\'s entire enunciation. A displayed equation occasionally sits directly under a page\'s content root with no wrapping `<p>` either (e.g. several formulas in Book I Section II) - likewise recovered explicitly.',
        ],
      },
      {
        heading: 'Mathematical notation',
        paragraphs: [
          'This source renders every in-line formula as real MathML (`<math>...<mfrac>/<msup>/<msub>/<msqrt>...</math>`), not as an image or plain text. Since this app\'s Passage.text is plain text with no rich-notation field, every formula is flattened to a fixed, disclosed ASCII convention: a superscript/exponent "x^y" is written "x^y"; a subscript "x_y"; a fraction "a/b" is written "(a/b)"; a square root is written "sqrt(...)"; an nth root "root(x,n)". HTML `<sup>`/`<sub>` elements (used for a handful of plain exponents outside MathML) use the same "^"/"_" convention. Nothing is evaluated, simplified, or re-derived - this is a typographic flattening of exactly what the page prints, never a computation on it.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book, Section (where the source has one) and the item\'s own printed number, exactly as Newton\'s own edition prints it - the scheme used by nearly every reference to the Principia since. This source carries no finer page/line milestone marker inside the running text, so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Diagrams',
        paragraphs: [
          'The source page-scan carries a real, high-resolution scanned diagram image at every point the printed edition places one (confirmed: every `<figure>` marker links to an actual, loadable image, unlike this library\'s Euclid import, whose figure host is defunct). Per this batch\'s brief, diagrams are nonetheless deferred uniformly to a later phase: every diagram marker\'s Passage carries a `figure` field with the honest note "A diagram appears here in the printed edition; not yet available in this build." and a `source` citation (e.g. "Newton, Philosophiae Naturalis Principia Mathematica (1687) Prop. XLVII. Theor. XV."). Every marker is additionally logged individually in anomalies.json, including the (rare) case of more than one diagram at a single point, where only the first is represented structurally but all are logged.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `Completeness. This edition's Author's Preface, Halley's dedicatory ode, all 8 Definitions, all 3 Laws of Motion and their 6 Corollaries, all 14 Sections of Book I (98 Propositions, 29 Lemmas), all 9 Sections of Book II (51 Propositions, 4 Lemmas in this edition), and the whole of Book III (9 Hypotheses, 42 Propositions, 11 Lemmas) are present, matching this edition's own printed numbering exactly, with no item merged, reordered, or renumbered.`,
          'No General Scholium. The famous General Scholium ("Hypotheses non fingo...") was written for, and first appeared in, the 1713 second edition - it simply does not exist in this 1687 first edition. This edition\'s Book III ends, correctly, straight after Proposition XLII with the printed word "FINIS." No general-scholium Division is emitted for this work (contrast data/newton-principia-en, which is a later edition and does carry one).',
          'Book III opens with "HYPOTHESES," not "Regulae Philosophandi" + "Phaenomena." This first edition\'s Book III begins with nine unnumbered-group Hypotheses (Hypoth. I-IX) rather than the four numbered "Rules of Reasoning in Philosophy" and separately-numbered "Phaenomena" that Newton introduced starting with the 1713 second edition. This is preserved exactly as printed: a Division "book-3-hypotheses" (sourceHeading "HYPOTHESES.") holds all nine as its children, ahead of Book III\'s Propositions and Lemmas. Comparing this with the English edition\'s (1726-derived) Book III independently confirms the historical reorganisation: two of the nine original Hypotheses (the immovability of the system\'s centre, and a comet postulate) survive into the later edition still labelled "Hypothesis," while most of the rest become "Phaenomena."',
          'A genuine printed numbering gap in Book II: Propositions XIII and XV are consecutive in this edition - Proposition XIV does not appear on either the page that ends Section III (with Proposition XIII\'s proof) or the page that begins Section IV (with Lemma III then Proposition XV), confirmed by direct inspection of both pages\' full content. Nothing is renumbered or invented to fill the gap. The independently-parsed English edition (a later, substantially revised edition of Book II) DOES have a Proposition XIV at the equivalent point, consistent with Book II being one of the sections of the Principia Newton revised most heavily between 1687 and 1726.',
          "Diagrams. See the \"Diagrams\" section above - every marker is logged individually in anomalies.json.",
          'Mathematical notation. See the dedicated section above for the printed-notation convention used for every fraction, exponent, and radical.',
        ],
      },
    ],
  };

  writeWork('newton-principia-la', 'la', r.divisions, about, anomalies);
  process.stdout.write(`    Book I: ${r.bookPropCounts['book-1']} props, ${r.bookLemmaCounts['book-1']} lemmas\n`);
  process.stdout.write(`    Book II: ${r.bookPropCounts['book-2']} props, ${r.bookLemmaCounts['book-2']} lemmas\n`);
  process.stdout.write(`    Book III: ${r.bookPropCounts['book-3']} props, ${r.bookLemmaCounts['book-3']} lemmas\n`);
}

// ===========================================================================
// newton-principia-en
// ===========================================================================
function runEnglishPrincipia(): void {
  const r = buildEnglishPrincipia(join(HERE, 'raw', 'en'));
  const anomalies = [...r.anomalies];

  const about: WorkAbout = {
    workId: 'newton-principia-en',
    title: 'The Mathematical Principles of Natural Philosophy',
    author: 'Isaac Newton',
    language: 'en',
    translator: 'Andrew Motte (1729)',
    editor: 'N. W. Chittenden (1846 American edition)',
    edition:
      'The Mathematical Principles of Natural Philosophy, translated by Andrew Motte (1729) from the 3rd Latin edition (1726, ed. Henry Pemberton), "A New Edition, Carefully Revised and Corrected, with a Life of the Author, by N. W. Chittenden" (New York: Daniel Adee, 1846)',
    provenance:
      'English Wikisource, page "The Mathematical Principles of Natural Philosophy (1846)" and its subpages (a proofread page-scan transclusion of djvu "Newton\'s Principia (1846).djvu"), fetched once via the MediaWiki action=parse&prop=text API and cached under scripts/import-newton/raw/en/; imported by scripts/import-newton.',
    license:
      "Motte's 1729 translation and this 1846 revision are both in the public domain. The digital transcription (a proofread page-scan of a public-domain copy) is distributed by Wikisource / the Wikimedia Foundation under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is Andrew Motte\'s 1729 English translation of the Principia - the first, and for a very long time the only, complete English version - as revised for "the first American edition," edited with a biographical Life of Newton by N. W. Chittenden and published by Daniel Adee in 1846. It translates the THIRD Latin edition (1726, ed. Henry Pemberton), so - unlike data/newton-principia-la, the 1687 first edition - it includes the General Scholium (added 1713) and Book III\'s four "Rules of Reasoning in Philosophy" plus separately-numbered "Phaenomena" (the 1713-onward reorganisation of the first edition\'s nine "Hypotheses").',
          "NOTE on Gutenberg #28233: that Project Gutenberg edition of Motte's Principia carries Book I ONLY (its own file explicitly ends after Book I) - it is not a complete text. This import uses English Wikisource's page-scan transcription of the 1846 edition instead, which is complete through Book III and the General Scholium (see \"The edition\" below for exactly what is and is not included).",
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Isaac Newton, The Mathematical Principles of Natural Philosophy, translated by Andrew Motte (London, 1729); this text is the 1846 American revision, "A New Edition, Carefully Revised and Corrected, with a Life of the Author, by N. W. Chittenden" (New York: Daniel Adee, 1846).',
          'This import covers the Principia proper: Newton\'s own Author\'s Preface; Definitions (8); Axioms, or Laws of Motion (3 Laws + 6 Corollaries); Book I (14 Sections, 98 Propositions, 29 Lemmas); Book II (9 Sections, 53 Propositions, 7 Lemmas); Book III (Rules of Reasoning in Philosophy - 4 Rules; Phaenomena - 6; then 42 Propositions and 11 Lemmas, with 2 of the first edition\'s original Hypotheses surviving under that name); and the General Scholium. Two further items this 1846 volume prints AFTER the Principia proper - "The System of the World" (a separate popular treatise Newton wrote) and the volume\'s own back-of-book Index - are NOT part of the Principia\'s own text and are not imported here.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is English Wikisource\'s proofread page-scan transclusion of a public-domain copy of the 1846 edition (djvu "Newton\'s Principia (1846).djvu"; page quality levels inspected were "4" - validated twice). Every page used by this import was fetched once (rendered HTML, for the same reason as the Latin edition - see data/newton-principia-la/about.json) and is cached under scripts/import-newton/raw/en/; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'Excluded front matter (this edition\'s own, not Newton\'s)',
        paragraphs: [
          "This 1846 volume's own \"Dedication\" page (fetched and inspected: the editors dedicate this printing \"TO THE TEACHERS OF THE NORMAL SCHOOL OF THE STATE OF NEW-YORK\") is Chittenden and Adee's own modern dedication of their edition, not Newton's, and not part of any edition Newton prepared himself. Per this import's brief, only the author's/edition's own historical front matter is imported; this 1846-specific editorial dedication is excluded and disclosed rather than silently imported as if it were Newton's own words. The volume's \"Introduction to the American Edition\" and \"Life of Sir Isaac Newton\" are, even more clearly, the editors' own modern biographical/editorial matter and were never fetched at all.",
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Structurally identical to data/newton-principia-la (see that work\'s "How it was imported" for the full account of the shared parser); this English edition renders its centred headings as font-size-styled `<span>`s rather than the Latin edition\'s plain centred `<p>`s, and prints its running corollaries in small caps ("COR. 1.") rather than italics - both handled by the same shared classifier (scripts/import-newton/classify.ts). One markup irregularity specific to this source, confirmed and corrected: Axioms Corollary IV prints its heading `<span>` directly inside its centring `<div>` with no wrapping `<p>` at all (every other Corollary on that page does wrap it) - recovered explicitly rather than silently dropping that Corollary.',
          'Book III\'s structure differs from Book I/II\'s: the source itself has no numbered Sections in Book III, only a Rules-of-Reasoning group, a Phaenomena group, and then a flat run of Hypotheses/Lemmas/Propositions across six page-scan chunks (fetched as separate Wikisource subpages, "BookIII-Prop1" through "-Prop6", concatenated here in document order) - reflected directly in the Division tree (book-3-rules, book-3-phaenomena, then flat siblings), never forced into a false Section structure the source does not have.',
        ],
      },
      {
        heading: 'Mathematical notation',
        paragraphs: [
          'Identical convention to data/newton-principia-la: MathML fractions/roots/superscripts/subscripts and this source\'s plain HTML `<sup>`/`<sub>` exponents are all flattened to the same fixed ASCII notation ("x^y", "x_y", "(a/b)", "sqrt(...)", "root(x,n)"). See that work\'s about.json for the full statement; nothing is evaluated or re-derived here either.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book, Section/group (where the source has one) and the item\'s own printed number. This source carries no finer page/line milestone marker inside the running text, so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Diagrams',
        paragraphs: [
          'Identical convention and disclosure to data/newton-principia-la: this source carries a real scanned diagram image at every marked point, but every diagram is deferred uniformly to a later phase - each such Passage carries a `figure` field with the "not yet available" note and a citation, and every marker is logged individually in anomalies.json.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `Completeness. Newton's Author's Preface, all 8 Definitions, all 3 Laws of Motion and their 6 Corollaries, all 14 Sections of Book I (98 Propositions, 29 Lemmas), all 9 Sections of Book II (53 Propositions, 7 Lemmas), Book III's 4 Rules, 6 Phaenomena, 2 surviving Hypotheses, 42 Propositions and 11 Lemmas, and the General Scholium are all present, matching this edition's own printed numbering exactly.`,
          'Relation to the Latin first edition. See data/newton-principia-la/about.json\'s "Known gaps & anomalies" for the two most notable textual differences confirmed by comparing the two independently-parsed editions: this (later) edition has a Proposition XIV in Book II Section III/IV where the 1687 first edition has a genuine printed numbering gap: skipping straight from XIII to XV; and this edition\'s Book III opens with the four-rule "Regulae Philosophandi" and separately-numbered "Phaenomena" (with 2 of the original 9 Hypotheses surviving under that name) where the first edition has nine undifferentiated "Hypotheses" instead.',
          'Excluded editorial front matter. See the dedicated section above: this 1846 printing\'s own Dedication, Introduction to the American Edition, and Life of Sir Isaac Newton are the editors\' own modern matter, not Newton\'s, and are excluded.',
          'Excluded appended matter. "The System of the World" (a separate Newton treatise this volume also happens to print) and the volume\'s back-of-book Index are not part of the Principia\'s own text and are not imported here.',
          'Diagrams and mathematical notation. See the dedicated sections above.',
        ],
      },
    ],
  };

  writeWork('newton-principia-en', 'en', r.divisions, about, anomalies);
  process.stdout.write(`    Book I: ${r.bookPropCounts['book-1']} props, ${r.bookLemmaCounts['book-1']} lemmas\n`);
  process.stdout.write(`    Book II: ${r.bookPropCounts['book-2']} props, ${r.bookLemmaCounts['book-2']} lemmas\n`);
  process.stdout.write(`    Book III: ${r.bookPropCounts['book-3']} props, ${r.bookLemmaCounts['book-3']} lemmas\n`);
}

// ===========================================================================
// newton-opticks-en
// ===========================================================================
function runOpticks(): void {
  const rawFile = join(HERE, 'raw', 'opticks', 'pg33504.txt');
  if (!existsSync(rawFile)) throw new Error(`STOP: missing ${rawFile} - copy the Gutenberg #33504 text there first`);
  const r = buildOpticks(rawFile);
  const anomalies = [...r.anomalies];

  const about: WorkAbout = {
    workId: 'newton-opticks-en',
    title: 'Opticks: or, A Treatise of the Reflections, Refractions, Inflections and Colours of Light',
    author: 'Isaac Newton',
    language: 'en',
    edition: 'The Fourth Edition, corrected (London: printed for William Innys, 1730)',
    provenance:
      'Project Gutenberg eBook #33504 ("Opticks", produced by Suzanne Lybarger, Steve Harris, Josephine Paolucci and the Online Distributed Proofreading Team at pgdp.net), fetched once (gutenberg.org/cache/epub/33504/pg33504.txt) and cached at scripts/import-newton/raw/opticks/pg33504.txt; imported by scripts/import-newton. pgdp.net is a page-by-page proofreading process (not raw/uncorrected OCR); nothing is loaded from the network at runtime.',
    license: 'This is a Project Gutenberg eBook: the underlying 1730 text is in the public domain, and Project Gutenberg\'s own terms permit free use of the eBook text itself (see the licence text bundled inside the source file); the standard Project Gutenberg boilerplate/licence header and footer are stripped from the reading text.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'Newton\'s Opticks, in its final, most complete form: the Fourth Edition ("corrected"), published in 1730, three years after Newton\'s death, from his own final manuscript revisions. It is written in English (unlike the Principia) and is Newton\'s other great work: the nature of light and colour (Books I-II) and, in Book III, diffraction and the celebrated 31 Queries - increasingly speculative, increasingly wide-ranging discussion questions covering optics, matter theory, chemistry, and natural philosophy generally, that grew from 16 in the first (1704) edition to 31 here.',
          'The text here is Newton\'s English, verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Isaac Newton, Opticks: or, A Treatise of the Reflections, Refractions, Inflections and Colours of Light. The Fourth Edition, corrected (London: printed for William Innys, 1730).',
          'The front matter carries Newton\'s own signed "Advertisements" - Advertisement I (1704, signed "I. N.", explaining the work\'s long-delayed publication) and Advertisement II (1717, signed "I. N.", on the Queries added to the Second Edition) - imported here as a "prefaces" Division, exactly like the Principia\'s own Author\'s Preface. A third, UNSIGNED "Advertisement to this Fourth Edition" follows in the source; since it describes events after Newton\'s own death in 1727, it cannot be his, and is the publisher\'s own editorial note - excluded, and disclosed below, on the same principle as this batch\'s exclusion of the Principia\'s 1846 editorial Dedication.',
          'The work is divided into three Books. Book I: Part I (Definitions - 8, Axioms - 8, Propositions I-VIII) and Part II (Propositions I-XI with supporting numbered Experiments, no further Definitions/Axioms). Book II: Part I (24 Observations), Part II ("Remarks upon the foregoing Observations" - discursive prose with no numbered items of its own), Part III (Propositions I-XX, printed without the "Theorem/Problem" sub-label Book I uses), and Part IV (13 Observations, with further Propositions and Experiments interleaved). Book III: one single Part ("Part I"), 11 Observations concerning diffraction, followed directly by the 31 Queries - Newton explicitly says in his own Advertisements that he left the Third Book "imperfect," and no further Part was ever written.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is Project Gutenberg eBook #33504, a plain-text transcription produced through Distributed Proofreaders (pgdp.net) - a page-by-page human proofreading process against page scans, not raw/uncorrected OCR. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime. Project Gutenberg\'s own boilerplate (licence header/footer, "Produced by..." credit block) is stripped as transport furniture; none of Newton\'s own text is altered.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This source is plain text (unlike the Principia\'s page-scan HTML), so structure is read from the printed labels themselves: "DEFIN. N." / "AX. N." (Book I Part I only), "_PROP._ N. THEOR./PROB. N." (Book I, italicised in the source) or the plainer "PROP. N." (Book II Part III only - a genuinely different typesetting, confirmed by direct inspection: Book II Parts I/II/IV and Book III carry no Propositions of their own at all), "_Obs._ N." (Observation), "_Exper._ N." (Experiment), and "_Query_ N." / "_Qu._ N." / "_Quest._ N." (three different abbreviation styles the source itself uses for different Query numbers - all three preserved verbatim in each item\'s own heading, never normalised to one form). Each becomes its own reader Division, numbered exactly as printed.',
          'Newton\'s own proofs constantly CITE an earlier Observation/Experiment/Hypothesis mid-sentence ("by the 13th Observation...", "as appears by Exper. 4."), which reads identically to the marker that introduces a NEW item of the same kind. A citation is only ever treated as a new item when it sits at the very start of its paragraph, or immediately after a sentence-ending period - the same rule, and the same reasoning, this importer uses for the Principia\'s "Hypoth."/"Corol." citations (see data/newton-principia-la/about.json).',
          'Book II Part II ("Remarks upon the foregoing Observations") and the short lead-in prose that opens several other Parts before their first numbered item carry no item numbering of the source\'s own. This text is never discarded: where a whole Part has no numbered items at all, its full text is held directly as that Part\'s own Passages; where only a short lead-in precedes the first numbered item, it becomes that Part\'s own "-intro" leaf Division. Either way the reading text is complete - nothing before a Part\'s first marker is dropped as if it were furniture.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book, Part, and the item\'s own printed number/label (Definition/Axiom/Proposition/Observation/Experiment/Query), exactly as this edition prints it. This plain-text digitisation carries no page-number markers in the running text, so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Diagrams',
        paragraphs: [
          'This source is a plain-text digitisation and carries no diagram images or markers of any kind (confirmed: Newton\'s own figure references, e.g. "[in Fig. 6.]", are plain inline text citing a printed plate, not a machine-readable marker this importer can act on). No `figure` field is set anywhere in this work; nothing is fabricated.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All three Books, all Parts, all 8 Definitions, 8 Axioms, 19 Propositions and 31 supporting Experiments of Book I, all of Book II (37 Observations across Parts I/IV, 20 Propositions in Part III, and Part II\'s discursive prose), all 11 Observations of Book III, and all 31 Queries are present, matching this edition\'s own printed numbering and labelling exactly.',
          "Query abbreviation is inconsistent IN THE SOURCE ITSELF, and this is preserved rather than normalised: Query 1 is headed \"Query 1\", Queries 2-29 are headed \"Qu. N\", and Queries 30-31 are headed \"Quest. N\" - three different abbreviations for the same word, printed exactly this way in the 1730 edition. Each Division's sourceHeading keeps whichever form that Query actually uses.",
          'Excluded front/back matter. The UNSIGNED "Advertisement to this Fourth Edition" (describing events after Newton\'s 1727 death - certainly not his own words) and Project Gutenberg\'s own "Transcriber\'s Note" are excluded; see "The edition" above. Newton\'s own SIGNED Advertisements I and II are imported, under the "prefaces" Division.',
          'No diagrams. See the dedicated section above.',
        ],
      },
    ],
  };

  writeWork('newton-opticks-en', 'en', r.divisions, about, anomalies);
  process.stdout.write(`    counts: ${JSON.stringify(r.bookCounts)}\n`);
}

runLatinPrincipia();
runEnglishPrincipia();
runOpticks();
process.stdout.write('\nDone. Run `npx tsx scripts/import-newton/validate.ts` next.\n');
