/**
 * Assembles the Principia GenericWork (Latin or English) from the cached raw
 * pages, using walk.ts (tokenizer) + assemble.ts (per-page structural
 * assembler) + classify.ts (heading/marker vocabulary). See pages.ts for the
 * page plan and this batch's module docs (fetchRaw.ts, classify.ts) for the
 * research this rests on.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokenizePage, type Token } from './walk.ts';
import { assemblePage, type LeafItem, type RawPassage } from './assemble.ts';
import { romanToArabic } from './classify.ts';
import type { Anomaly, Division, Passage } from './sharedTypes.ts';
import { ENGLISH_PAGES, LATIN_PAGES, type PagePlan } from './pages.ts';

const KIND_SLUG: Record<string, string> = {
  lemma: 'lemma', prop: 'prop', def: 'def', law: 'law', corol: 'corol',
  rule: 'rule', phaenomenon: 'phaenomenon', hypoth: 'hypoth',
};

function loadPage(rawDir: string, plan: PagePlan): { tokens: Token[]; warnings: string[] } {
  const j = JSON.parse(readFileSync(join(rawDir, plan.file), 'utf8')) as { title: string; html: string };
  const { tokens, warnings } = tokenizePage(j.html);
  return { tokens, warnings };
}

function itemDivisionId(idBase: string, item: LeafItem): string {
  const slug = KIND_SLUG[item.kind] ?? item.kind;
  const arabic = item.roman ? romanToArabic(item.roman) : null;
  return arabic !== null && Number.isFinite(arabic) ? `${idBase}-${slug}-${arabic}` : `${idBase}-${slug}`;
}

function convertPassages(raw: RawPassage[], divisionId: string, citationBase: string, anomalies: Anomaly[]): Passage[] {
  return raw.map((rp) => {
    const passage: Passage = { n: '', text: rp.text.trim(), ref: null };
    if (rp.figureAlts.length > 0) {
      passage.figure = { source: citationBase, note: 'A diagram appears here in the printed edition; not yet available in this build.' };
      const extra = rp.figureAlts.length > 1 ? ` (${rp.figureAlts.length} diagram markers here; only the first is represented structurally in the figure field, all logged)` : '';
      passage.anomaly = `Diagram marker at ${citationBase}${extra}: not yet available in this build.`;
      for (const alt of rp.figureAlts) {
        anomalies.push({ where: divisionId, note: `Diagram marker (${alt || 'untitled'}) at ${citationBase}: "A diagram appears here in the printed edition; not yet available in this build."` });
      }
    }
    return passage;
  });
}

function assertNoOrphans(label: string, preItemParagraphs: string[]): void {
  if (preItemParagraphs.length > 0) {
    throw new Error(`STOP: "${label}" carries ${preItemParagraphs.length} paragraph(s) of text before its first numbered item, which this call site does not expect/handle: ${preItemParagraphs[0]!.slice(0, 80)}`);
  }
}

/** A synthetic leaf Division holding CONTENT that precedes a group's/book's first numbered item (see AssembleResult.preItemParagraphs) - never discarded. */
function introChild(id: string, paragraphs: string[], anomalies: Anomaly[]): Division | null {
  if (paragraphs.length === 0) return null;
  anomalies.push({ where: id, note: `${paragraphs.length} paragraph(s) of reading text precede this Division's first numbered item in the source (e.g. an introductory/transitional remark); kept as this leading "-intro" leaf Division rather than being dropped as if it were furniture.` });
  return {
    id, number: null, ref: null, sourceHeading: null, editorialTitle: null, children: [],
    passages: paragraphs.map((t) => ({ n: '', text: t.trim(), ref: null })),
  };
}

function convertItem(item: LeafItem, idBase: string, editionLabel: string, anomalies: Anomaly[]): Division {
  const id = itemDivisionId(idBase, item);
  const citation = `${editionLabel} ${item.headingRaw.replace(/\s+/g, ' ').trim()}`;
  const passages = convertPassages(item.passages, id, citation, anomalies);
  if (passages.length === 0) {
    throw new Error(`STOP: division "${id}" has zero passages (heading "${item.headingRaw}") - parsing gap, not a real empty item`);
  }
  return { id, number: item.roman, ref: null, sourceHeading: item.headingRaw, editorialTitle: null, children: [], passages };
}

/** Front-matter pages (prefaces) carry no Lemma/Prop/etc. markers: every heading line becomes reading text (title/epigraph), one Division, passages = title line(s) + each content paragraph in order. */
export function buildFrontMatterDivision(tokens: Token[], id: string, sourceHeading: string | null): Division {
  const passages: RawPassage[] = [];
  let pendingFigures: string[] = [];
  for (const tok of tokens) {
    if (tok.kind === 'figure') {
      pendingFigures.push(tok.alt || '(untitled figure)');
      continue;
    }
    const text = tok.text.trim();
    if (text.length === 0) continue;
    passages.push({ text, figureAlts: pendingFigures });
    pendingFigures = [];
  }
  if (passages.length === 0) throw new Error(`STOP: front-matter division "${id}" has zero passages`);
  const anomalies: Anomaly[] = [];
  const converted = convertPassages(passages, id, sourceHeading ?? id, anomalies);
  return { id, number: null, ref: null, sourceHeading, editorialTitle: null, children: [], passages: converted };
}

export interface BuildResult {
  divisions: Division[];
  anomalies: Anomaly[];
  warnings: string[];
  bookPropCounts: Record<string, number>;
  bookLemmaCounts: Record<string, number>;
}

export function buildLatinPrincipia(rawDir: string): BuildResult {
  const anomalies: Anomaly[] = [];
  const warnings: string[] = [];
  const editionLabel = 'Newton, Philosophiae Naturalis Principia Mathematica (1687)';
  const byFile = new Map(LATIN_PAGES.map((p) => [p.file, p]));

  const get = (file: string) => loadPage(rawDir, byFile.get(file)!);

  // --- prefaces --------------------------------------------------------
  const prefNewton = get('preface-auctoris.json');
  const prefHalley = get('preface-halley-ode.json');
  warnings.push(...prefNewton.warnings.map((w) => `preface-auctoris: ${w}`), ...prefHalley.warnings.map((w) => `preface-halley-ode: ${w}`));
  const prefacesDiv: Division = {
    id: 'prefaces', number: null, ref: null, sourceHeading: null, editorialTitle: null, children: [
      buildFrontMatterDivision(prefNewton.tokens, 'prefaces-newton', 'PRÆFATIO AD LECTOREM.'),
      buildFrontMatterDivision(prefHalley.tokens, 'prefaces-halley-ode', 'IN VIRI PRÆSTANTISSIMI D. ISAACI NEWTONI OPUS HOCCE MATHEMATICO PHYSICUM.'),
    ], passages: [],
  };
  anomalies.push({
    where: 'newton-principia-la / prefaces',
    note: "The front matter includes Edmond Halley's own dedicatory Latin ode (\"IN VIRI PRÆSTANTISSIMI...\"), printed immediately after Newton's preface in every edition since 1687. It is Halley's own composition, not Newton's, and this is disclosed on its Division (id prefaces-halley-ode) as with any authorship distinction elsewhere in this corpus (cf. De Bello Gallico Book 8/Hirtius).",
  });

  // --- definitions -------------------------------------------------------
  const defPage = get('definitiones.json');
  warnings.push(...defPage.warnings.map((w) => `definitiones: ${w}`));
  const defResult = assemblePage(defPage.tokens);
  assertNoOrphans('definitions', defResult.preItemParagraphs);
  const definitionsDiv: Division = {
    id: 'definitions', number: null, ref: null, sourceHeading: 'Definitiones.', editorialTitle: null,
    children: defResult.items.map((it) => convertItem(it, 'definitions', editionLabel, anomalies)),
    passages: [],
  };

  // --- axioms --------------------------------------------------------
  const axPage = get('axiomata.json');
  warnings.push(...axPage.warnings.map((w) => `axiomata: ${w}`));
  const axResult = assemblePage(axPage.tokens);
  assertNoOrphans('axioms', axResult.preItemParagraphs);
  const axiomsDiv: Division = {
    id: 'axioms', number: null, ref: null, sourceHeading: 'Axiomata, sive Leges Motus.', editorialTitle: null,
    children: axResult.items.map((it) => convertItem(it, 'axioms', editionLabel, anomalies)),
    passages: [],
  };

  // --- Book I / Book II: 14 + 9 Section pages --------------------------
  const bookPropCounts: Record<string, number> = {};
  const bookLemmaCounts: Record<string, number> = {};

  function buildBookOfSections(bookNum: 1 | 2, sectionFiles: string[]): Division {
    const idBase = `book-${bookNum}`;
    const sections: Division[] = [];
    let propCount = 0;
    let lemmaCount = 0;
    for (let i = 0; i < sectionFiles.length; i++) {
      const { tokens, warnings: w } = get(sectionFiles[i]!);
      warnings.push(...w.map((x) => `${sectionFiles[i]}: ${x}`));
      const r = assemblePage(tokens);
      if (r.strayHeadings.length > 0) {
        anomalies.push({ where: `${idBase}-sec-${i + 1}`, note: `Unclassified centred heading(s) with no open item to attach to: ${r.strayHeadings.join(' | ')}` });
      }
      const intro = introChild(`${idBase}-sec-${i + 1}-intro`, r.preItemParagraphs, anomalies);
      const children = r.items.map((it) => {
        if (it.kind === 'prop') propCount += 1;
        if (it.kind === 'lemma') lemmaCount += 1;
        return convertItem(it, idBase, editionLabel, anomalies);
      });
      sections.push({
        id: `${idBase}-sec-${i + 1}`, number: String(i + 1), ref: null,
        sourceHeading: r.leadingHeading, editorialTitle: null, children: intro ? [intro, ...children] : children, passages: [],
      });
    }
    bookPropCounts[idBase] = propCount;
    bookLemmaCounts[idBase] = lemmaCount;
    return { id: idBase, number: bookNum === 1 ? 'I' : 'II', ref: null, sourceHeading: null, editorialTitle: null, children: sections, passages: [] };
  }

  const book1 = buildBookOfSections(1, Array.from({ length: 14 }, (_, i) => `book1-sect${i + 1}.json`));
  const book2 = buildBookOfSections(2, Array.from({ length: 9 }, (_, i) => `book2-sect${i + 1}.json`));

  // --- Book III: one page, HYPOTHESES group + flat Lemmas/Propositions --
  const b3 = get('book3.json');
  warnings.push(...b3.warnings.map((w) => `book3: ${w}`));
  const b3r = assemblePage(b3.tokens);
  if (b3r.strayHeadings.length > 0) anomalies.push({ where: 'book-3', note: `Unclassified centred heading(s): ${b3r.strayHeadings.join(' | ')}` });
  const hypothesesEndIndex = b3r.groupMarkers.length > 0 ? b3r.items.findIndex((it) => it.kind !== 'hypoth') : 0;
  const hypothItems = hypothesesEndIndex === -1 ? b3r.items : b3r.items.slice(0, hypothesesEndIndex);
  const restItems = hypothesesEndIndex === -1 ? [] : b3r.items.slice(hypothesesEndIndex);
  bookPropCounts['book-3'] = restItems.filter((it) => it.kind === 'prop').length;
  bookLemmaCounts['book-3'] = restItems.filter((it) => it.kind === 'lemma').length;
  const hypothesesGroup: Division = {
    id: 'book-3-hypotheses', number: null, ref: null,
    sourceHeading: b3r.groupMarkers[0]?.label ?? 'HYPOTHESES.', editorialTitle: null,
    children: hypothItems.map((it) => convertItem(it, 'book-3', editionLabel, anomalies)),
    passages: [],
  };
  const b3Intro = introChild('book-3-intro', b3r.preItemParagraphs, anomalies);
  const book3: Division = {
    id: 'book-3', number: 'III', ref: null, sourceHeading: null, editorialTitle: null,
    children: [...(b3Intro ? [b3Intro] : []), hypothesesGroup, ...restItems.map((it) => convertItem(it, 'book-3', editionLabel, anomalies))],
    passages: [],
  };
  anomalies.push({
    where: 'newton-principia-la / book-3',
    note: 'This FIRST edition (1687) opens Book III with nine unnumbered-group "HYPOTHESES" rather than the four-rule "Regulae Philosophandi" + separate "Phaenomena" that Newton introduced starting with the 1713 second edition. This is a genuine, well-documented feature of the first edition\'s text, preserved exactly as printed - not a parsing gap. See about.json.',
  });
  anomalies.push({
    where: 'newton-principia-la / general scholium',
    note: 'The famous General Scholium ("Hypotheses non fingo...") does not exist in this FIRST edition (1687) at all - it was written for and first appeared in the 1713 second edition. This edition\'s Book III ends, correctly, straight after Proposition XLII with the printed word "FINIS." No general-scholium Division is emitted for this work; see about.json.',
  });

  const divisions: Division[] = [prefacesDiv, definitionsDiv, axiomsDiv, book1, book2, book3];
  return { divisions, anomalies, warnings, bookPropCounts, bookLemmaCounts };
}

export function buildEnglishPrincipia(rawDir: string): BuildResult {
  const anomalies: Anomaly[] = [];
  const warnings: string[] = [];
  const editionLabel = "Newton/Motte/Chittenden, The Mathematical Principles of Natural Philosophy (1846 American ed.)";
  const byFile = new Map(ENGLISH_PAGES.map((p) => [p.file, p]));
  const get = (file: string) => loadPage(rawDir, byFile.get(file)!);

  // --- prefaces (Newton's own only; the 1846 editors' Dedication and the
  //     "Introduction to the American Edition"/"Life of Sir Isaac Newton"
  //     are the EDITION's own modern front matter, not Newton's, and are
  //     excluded per the import brief - never fetched, see pages.ts) -------
  const prefNewton = get('preface-authors.json');
  warnings.push(...prefNewton.warnings.map((w) => `preface-authors: ${w}`));
  const prefacesDiv: Division = {
    id: 'prefaces', number: null, ref: null, sourceHeading: null, editorialTitle: null,
    children: [buildFrontMatterDivision(prefNewton.tokens, 'prefaces-newton', "THE AUTHOR'S PREFACE")],
    passages: [],
  };
  const dedication = get('dedication.json');
  anomalies.push({
    where: 'newton-principia-en / prefaces',
    note: 'This 1846 American edition\'s own "Dedication" page (fetched and inspected: dedicated by the editors "TO THE TEACHERS OF THE NORMAL SCHOOL OF THE STATE OF NEW-YORK") is the EDITORS\' (Chittenden/Adee\'s) own modern dedication, not Newton\'s and not part of any edition Newton himself prepared. Per this import\'s brief, only the author\'s/edition\'s own historical front matter is imported (Newton\'s Author\'s Preface); this 1846-specific editorial dedication is excluded, along with the "Introduction to the American Edition" and "Life of Sir Isaac Newton" (never fetched at all - both are explicitly modern editorial/biographical matter, not the Principia\'s own text).',
  });
  void dedication; // fetched only to verify its content before excluding it; not imported

  // --- definitions / axioms ------------------------------------------
  const defPage = get('definitions.json');
  const defResult = assemblePage(defPage.tokens);
  assertNoOrphans('definitions', defResult.preItemParagraphs);
  const definitionsDiv: Division = {
    id: 'definitions', number: null, ref: null, sourceHeading: 'DEFINITIONS.', editorialTitle: null,
    children: defResult.items.map((it) => convertItem(it, 'definitions', editionLabel, anomalies)),
    passages: [],
  };
  const axPage = get('axioms.json');
  const axResult = assemblePage(axPage.tokens);
  assertNoOrphans('axioms', axResult.preItemParagraphs);
  const axiomsDiv: Division = {
    id: 'axioms', number: null, ref: null, sourceHeading: 'AXIOMS, OR LAWS OF MOTION.', editorialTitle: null,
    children: axResult.items.map((it) => convertItem(it, 'axioms', editionLabel, anomalies)),
    passages: [],
  };

  const bookPropCounts: Record<string, number> = {};
  const bookLemmaCounts: Record<string, number> = {};

  function buildBookOfSections(bookNum: 1 | 2, sectionFiles: string[]): Division {
    const idBase = `book-${bookNum}`;
    const sections: Division[] = [];
    let propCount = 0;
    let lemmaCount = 0;
    for (let i = 0; i < sectionFiles.length; i++) {
      const { tokens, warnings: w } = get(sectionFiles[i]!);
      warnings.push(...w.map((x) => `${sectionFiles[i]}: ${x}`));
      const r = assemblePage(tokens);
      if (r.strayHeadings.length > 0) anomalies.push({ where: `${idBase}-sec-${i + 1}`, note: `Unclassified centred heading(s): ${r.strayHeadings.join(' | ')}` });
      const intro = introChild(`${idBase}-sec-${i + 1}-intro`, r.preItemParagraphs, anomalies);
      const children = r.items.map((it) => {
        if (it.kind === 'prop') propCount += 1;
        if (it.kind === 'lemma') lemmaCount += 1;
        return convertItem(it, idBase, editionLabel, anomalies);
      });
      sections.push({ id: `${idBase}-sec-${i + 1}`, number: String(i + 1), ref: null, sourceHeading: r.leadingHeading, editorialTitle: null, children: intro ? [intro, ...children] : children, passages: [] });
    }
    bookPropCounts[idBase] = propCount;
    bookLemmaCounts[idBase] = lemmaCount;
    return { id: idBase, number: bookNum === 1 ? 'I' : 'II', ref: null, sourceHeading: null, editorialTitle: null, children: sections, passages: [] };
  }

  const book1 = buildBookOfSections(1, Array.from({ length: 14 }, (_, i) => `book1-sect${i + 1}.json`));
  const book2 = buildBookOfSections(2, Array.from({ length: 9 }, (_, i) => `book2-sect${i + 1}.json`));

  // --- Book III: intro (fly-title, no real content) + Rules + Phaenomena
  //     + 6 Proposition-group pages (flat Hypothesis/Lemma/Proposition items
  //     in document order) + the dedicated General Scholium page ------------
  const introPage = get('book3-intro.json');
  const introResult = assemblePage(introPage.tokens);
  if (introResult.items.length !== 0) throw new Error('STOP: expected BookIII intro page to carry no structural items');
  // This page carries Newton's own famous transitional paragraph opening
  // Book III ("In the preceding Books I have laid down the principles of
  // philosophy...") as plain content before any item - never discarded.
  const b3IntroDiv = introChild('book-3-intro', introResult.preItemParagraphs, anomalies);

  const rulesPage = get('book3-rules.json');
  const rulesResult = assemblePage(rulesPage.tokens);
  const rulesIntro = introChild('book-3-rules-intro', rulesResult.preItemParagraphs, anomalies);
  const rulesGroup: Division = {
    id: 'book-3-rules', number: null, ref: null, sourceHeading: 'RULES OF REASONING IN PHILOSOPHY.', editorialTitle: null,
    children: [...(rulesIntro ? [rulesIntro] : []), ...rulesResult.items.map((it) => convertItem(it, 'book-3', editionLabel, anomalies))], passages: [],
  };

  const phaenPage = get('book3-phaenomena.json');
  const phaenResult = assemblePage(phaenPage.tokens);
  const phaenIntro = introChild('book-3-phaenomena-intro', phaenResult.preItemParagraphs, anomalies);
  const phaenomenaGroup: Division = {
    id: 'book-3-phaenomena', number: null, ref: null, sourceHeading: 'PHÆNOMENA, OR APPEARANCES.', editorialTitle: null,
    children: [...(phaenIntro ? [phaenIntro] : []), ...phaenResult.items.map((it) => convertItem(it, 'book-3', editionLabel, anomalies))], passages: [],
  };

  const propGroupFiles = ['book3-prop1.json', 'book3-prop2.json', 'book3-prop3.json', 'book3-prop4.json', 'book3-prop5.json', 'book3-prop6.json'];
  const flatItems: Division[] = [];
  let b3PropCount = 0;
  let b3LemmaCount = 0;
  for (const file of propGroupFiles) {
    const { tokens, warnings: w } = get(file);
    warnings.push(...w.map((x) => `${file}: ${x}`));
    const r = assemblePage(tokens);
    if (r.strayHeadings.length > 0) anomalies.push({ where: `book-3 (${file})`, note: `Unclassified centred heading(s): ${r.strayHeadings.join(' | ')}` });
    const intro = introChild(`book-3-${file.replace('.json', '')}-intro`, r.preItemParagraphs, anomalies);
    if (intro) flatItems.push(intro);
    for (const it of r.items) {
      if (it.kind === 'prop') b3PropCount += 1;
      if (it.kind === 'lemma') b3LemmaCount += 1;
      flatItems.push(convertItem(it, 'book-3', editionLabel, anomalies));
    }
  }
  bookPropCounts['book-3'] = b3PropCount;
  bookLemmaCounts['book-3'] = b3LemmaCount;

  const book3: Division = {
    id: 'book-3', number: 'III', ref: null, sourceHeading: null, editorialTitle: null,
    children: [...(b3IntroDiv ? [b3IntroDiv] : []), rulesGroup, phaenomenaGroup, ...flatItems], passages: [],
  };

  // --- General Scholium (this edition only; see the Latin builder for why
  //     the first edition has none at all) --------------------------------
  const gsPage = get('book3-general-scholium.json');
  const gsContentTokens = gsPage.tokens.filter((t) => t.kind !== 'heading' || !/^(GENERAL SCHOLIUM\.?|END OF THE MATHEMATICAL PRINCIPLES\.?)$/i.test(t.text.trim()));
  const generalScholium = buildFrontMatterDivision(gsContentTokens, 'general-scholium', 'GENERAL SCHOLIUM.');

  const divisions: Division[] = [prefacesDiv, definitionsDiv, axiomsDiv, book1, book2, book3, generalScholium];
  return { divisions, anomalies, warnings, bookPropCounts, bookLemmaCounts };
}
