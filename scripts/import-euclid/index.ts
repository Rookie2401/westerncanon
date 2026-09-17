/**
 * Euclid, *Elements* - Greek text (ed. J. L. Heiberg, Euclidis Opera Omnia,
 * Leipzig: Teubner 1883-88; CTS urn:cts:greekLit:tlg1799.tlg001). Run-once
 * ingestion pipeline.
 *
 *   npm run import:euclid
 *
 * Reads scripts/import-euclid/raw/tlg1799.tlg001.perseus-grc2.xml (already in
 * the repo; nothing is downloaded) and writes:
 *   data/euclid-elements/work.json       - the GenericWork (13 Books, each a
 *                                           2-level tree of section-type
 *                                           groups and 611 leaf divisions)
 *   data/euclid-elements/about.json      - provenance / licence / prose
 *   data/euclid-elements/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:euclid`.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-grc):
 *   - verbatim Greek reading text only; no accent/spelling/orthography fixes.
 *   - <num> point-letter wrappers are unwrapped to plain text (tag dropped).
 *   - <lb rend="displayNum" n="N"/> line-numbering artefacts are stripped
 *     (replaced with a single space, matching the isagoge <pb>/<lb> convention).
 *   - <del> (editorially deleted text, not authentic to the original) is
 *     EXCLUDED from the reading text but every occurrence is logged verbatim
 *     to anomalies.json. A <p> that is deleted in its entirety is a special
 *     case: Heiberg's own printed edition brackets this material rather than
 *     omitting it (verified against the actual 1883 page images - see
 *     structure.ts BRACKETED_INTERPOLATION_LEAVES), so the importer keeps
 *     his bracketed wording as the passage text instead of leaving the
 *     division blank, flagging it with a Passage.anomaly - five divisions
 *     get this treatment; see the About page.
 *   - <add> (rare editorial insertion) is INCLUDED in the reading text and
 *     logged individually; the containing Passage also carries `anomaly`.
 *   - <figure/> (498 total) has no legitimately recoverable image via the
 *     TEI (its graphic url points at a dead host). For Book I's 48
 *     propositions, Book II's 14, and Book III's 37 (99 total), a real
 *     diagram image has instead been sourced directly from the scanned
 *     printed edition (Heiberg, Euclidis Opera Omnia vol. I, archive.org
 *     identifier euclidisoperaomn01eucluoft) and cropped to the diagram's
 *     portion of the page - see BOOK_1_DIAGRAMS/BOOK_2_DIAGRAMS/
 *     BOOK_3_DIAGRAMS below and data/euclid-elements/images/. Every other
 *     marker (399 of 498) is preserved as an honest `figure: { source, note }`
 *     on its passage (never a fabricated image) and logged individually to
 *     anomalies.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOK_TITLES,
  BRACKETED_INTERPOLATION_ANOMALY_PREFIX,
  BRACKETED_INTERPOLATION_LEAVES,
  EXPECTED_TOTAL_FIGURES,
  EXPECTED_TOTAL_LEAVES,
  GROUND_TRUTH,
  TYPE_META,
  expectedNumbers,
  isTypeCode,
  type TypeCode,
} from '../import-euclid-shared/structure.ts';
import { ABOUT_SECTIONS, LICENSE, PROVENANCE } from '../import-euclid-shared/aboutText.ts';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/euclid-elements/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg1799.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'euclid-elements');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

function bookIdOf(bookNum: number): string {
  return `book-${bookNum}`;
}
function groupIdOf(bookNum: number, type: TypeCode): string {
  return `${bookIdOf(bookNum)}-${TYPE_META[type].groupIdSuffix}`;
}
function leafIdOf(bookNum: number, type: TypeCode, number: string): string {
  return `${bookIdOf(bookNum)}-${TYPE_META[type].leafInfix}-${number}`;
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

/**
 * Four propositions are genuinely present in the source but mis-nested: the
 * TEI never opens a fresh `<div type="textpart" subtype="number" n="…">` for
 * them, so their enunciation+proof paragraphs sit as extra `<p>` siblings
 * inside the still-open PREVIOUS proposition's div. Confirmed by direct
 * inspection of the real fetched XML (not inferred from secondary sources):
 * in each case the div that should have closed after the previous prop's
 * "ὅπερ ἔδει δεῖξαι" instead runs straight into the next prop's enunciation
 * before finally closing. Keyed by the id of the (mis-nested-into) PREVIOUS
 * leaf; `incipit` is the verbatim opening of the misplaced proposition's
 * enunciation, used to detect exactly where to split.
 */
const MISPLACED_SPLITS: Record<string, { newNumber: string; incipit: string }> = {
  'book-1-prop-29': { newNumber: '30', incipit: 'αἱ τῇ αὐτῇ εὐθείᾳ παράλληλοι' },
  'book-2-prop-6': { newNumber: '7', incipit: 'ἐὰν εὐθεῖα γραμμὴ τμηθῇ, ὡς ἔτυχεν, τὸ ἀπὸ' },
  'book-10-prop1-5': { newNumber: '6', incipit: 'ἐὰν δύο μεγέθη πρὸς ἄλληλα λόγον ἔχῃ' },
  'book-12-prop-6': { newNumber: '7', incipit: 'πᾶν πρίσμα τρίγωνον ἔχον βάσιν διαιρεῖται' },
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div type="textpart" subtype="(book|type|number)" n="([^"]*)">|<div[^>]*>|<\/div>|<p>|<\/p>|<del>|<\/del>|<add>|<\/add>|<num>|<\/num>|<figure\/>|<lb rend="displayNum" n="[^"]*"\/>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'other' | 'book' | 'type' | 'number'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentType: TypeCode | null = null;
  let currentGroupDiv: Division | null = null;
  let currentLeafDiv: Division | null = null;
  let currentLeafId = '';

  let inP = false;
  let visibleBuf = '';
  let delDepth = 0;
  const delBufStack: string[] = [];
  let addDepth = 0;
  const addBufStack: string[] = [];
  let figuresThisP = 0;
  let addExcerptsThisP: string[] = [];
  /** Raw text of each top-level <del> span closed so far within the current
   *  <p> - used only when the whole paragraph turns out to be deleted (see
   *  the </p> handler), to recover Heiberg's own bracketed wording rather
   *  than dropping the paragraph. */
  let delExcerptsThisP: string[] = [];
  /**
   * A fully-<del> paragraph is never decided on the spot: whether it's a
   * genuine "whole leaf is bracketed interpolation" case (the five
   * documented leaves - keep, flagged) or an isolated bracketed aside inside
   * a leaf that has other real content (the remaining ~18 instances -
   * silently excluded, matching the other 507 <del> spans) depends on
   * whether the LEAF ends up with zero other passages, which isn't known
   * until the leaf's closing </div>. So each candidate is queued here at
   * </p> and only resolved into either a real Passage or a dropped-anomaly
   * log entry when the leaf closes (see the </div> "number" handler).
   */
  let pendingBracketed: Array<{ text: string; figuresThisP: number; bookNum: number; type: TypeCode; number: string }> = [];

  let totalLeaves = 0;
  let totalFigureMarkers = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalBracketedInterpolations = 0;
  const bracketedInterpolationLeavesSeen = new Set<string>();

  /**
   * Real diagram images for Book I's 48 propositions, keyed by the exact
   * citation string `citationFor` produces (e.g. "Heiberg, Elements I.1").
   * Sourced by rendering the actual scanned pages of Heiberg's printed
   * edition (archive.org identifier euclidisoperaomn01eucluoft, PD) at high
   * resolution and cropping tightly to just the diagram's own ink; every
   * crop was checked by hand against the source page before being
   * committed. The PNG is pure black ink on a transparent background (the
   * aged-paper background is dropped, not merely recolored) so the reader
   * can tint it live via CSS mask-image + the app's own accent colour,
   * matching the current theme automatically. `imageWidth`/`imageHeight`
   * are each PNG's exact pixel size, needed because a CSS mask carries no
   * intrinsic size of its own - the reader uses them to reserve the
   * figure's aspect ratio before the mask image loads. Any citation not in
   * this map (all other books, and any Book I marker this map doesn't
   * cover) keeps the honest "not yet available" note below.
   */
  const BOOK_1_DIAGRAM_SIZE: Record<number, [number, number]> = {
    1: [1332, 941], 2: [1180, 1154], 3: [295, 274], 4: [249, 415], 5: [246, 317],
    6: [225, 210], 7: [825, 620], 8: [1046, 677], 9: [513, 1035], 10: [262, 222],
    11: [326, 230], 12: [414, 295], 13: [636, 722], 14: [972, 484], 15: [1008, 746],
    16: [245, 275], 17: [1037, 645], 18: [1059, 613], 19: [205, 357], 20: [873, 980],
    21: [1243, 727], 22: [2371, 797], 23: [823, 893], 24: [892, 741], 25: [906, 752],
    26: [1059, 650], 27: [1803, 608], 28: [879, 752], 29: [879, 751], 30: [919, 641],
    31: [909, 362], 32: [642, 540], 33: [316, 178], 34: [307, 147], 35: [335, 185],
    36: [471, 203], 37: [1049, 517], 38: [332, 170], 39: [823, 532], 40: [820, 429],
    41: [801, 505], 42: [1149, 436], 43: [328, 207], 44: [766, 1078], 45: [692, 989],
    46: [662, 830], 47: [1120, 1116], 48: [731, 931],
  };
  const BOOK_1_DIAGRAMS: Record<string, { image: string; width: number; height: number }> =
    Object.fromEntries(
      Array.from({ length: 48 }, (_, i) => i + 1).map((n) => [
        `Heiberg, Elements I.${n}`,
        {
          image: `images/book-1-prop-${n}.png`,
          width: BOOK_1_DIAGRAM_SIZE[n]![0],
          height: BOOK_1_DIAGRAM_SIZE[n]![1],
        },
      ]),
    );

  /** Same treatment, extended to Book II's 14 propositions (all 14 have a
   *  real diagram - unlike Book I, Book II's diagrams sit only on the
   *  Latin-facing page of this print, not the Greek page; sourced and
   *  hand-checked the same way). */
  const BOOK_2_DIAGRAM_SIZE: Record<number, [number, number]> = {
    1: [262, 218], 2: [180, 180], 3: [212, 179], 4: [235, 227], 5: [478, 310],
    6: [303, 198], 7: [224, 226], 8: [321, 303], 9: [278, 179], 10: [303, 189],
    11: [174, 215], 12: [211, 179], 13: [192, 228], 14: [299, 245],
  };
  const BOOK_2_DIAGRAMS: Record<string, { image: string; width: number; height: number }> =
    Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => i + 1).map((n) => [
        `Heiberg, Elements II.${n}`,
        {
          image: `images/book-2-prop-${n}.png`,
          width: BOOK_2_DIAGRAM_SIZE[n]![0],
          height: BOOK_2_DIAGRAM_SIZE[n]![1],
        },
      ]),
    );
  /** Same treatment again, extended to Book III's 37 propositions (all 37
   *  have a real diagram, sourced and hand-checked the same way; like Book
   *  II, these sit only on the Latin-facing page of this print). Two
   *  propositions (35 and 36) print two illustrative sub-case diagrams each
   *  on the page - the fuller, more general-case figure was chosen for each
   *  rather than the degenerate through-the-centre special case. */
  const BOOK_3_DIAGRAM_SIZE: Record<number, [number, number]> = {
    1: [276, 266], 2: [270, 261], 3: [266, 255], 4: [256, 187], 5: [259, 222],
    6: [249, 274], 7: [301, 266], 8: [290, 448], 9: [420, 418], 10: [489, 407],
    11: [280, 325], 12: [198, 354], 13: [341, 282], 14: [272, 275], 15: [213, 257],
    16: [287, 237], 17: [241, 264], 18: [342, 306], 19: [307, 250], 20: [319, 302],
    21: [220, 206], 22: [209, 202], 23: [105, 335], 24: [281, 227], 25: [183, 188],
    26: [393, 178], 27: [379, 208], 28: [640, 279], 29: [598, 244], 30: [539, 210],
    31: [324, 293], 32: [299, 269], 33: [186, 316], 34: [390, 315], 35: [298, 276],
    36: [257, 245], 37: [360, 267],
  };
  const BOOK_3_DIAGRAMS: Record<string, { image: string; width: number; height: number }> =
    Object.fromEntries(
      Array.from({ length: 37 }, (_, i) => i + 1).map((n) => [
        `Heiberg, Elements III.${n}`,
        {
          image: `images/book-3-prop-${n}.png`,
          width: BOOK_3_DIAGRAM_SIZE[n]![0],
          height: BOOK_3_DIAGRAM_SIZE[n]![1],
        },
      ]),
    );
  const REAL_DIAGRAMS: Record<string, { image: string; width: number; height: number }> = {
    ...BOOK_1_DIAGRAMS,
    ...BOOK_2_DIAGRAMS,
    ...BOOK_3_DIAGRAMS,
  };

  /** figures seen inside a <p> that cleaned to empty text, keyed by leaf id, awaiting a surviving passage to attach to */
  const pendingFigures = new Map<string, number>();
  /** deferred figure counts per surviving Passage object; resolved into a single PassageFigure after the whole document is parsed, so an orphan reattachment can never clobber a passage's own inline figure */
  const figureCounts = new Map<Passage, { count: number; citation: string }>();

  function citationFor(bookNum: number, type: TypeCode, number: string): string {
    const roman = BOOK_TITLES[bookNum - 1]!.number;
    if (type.startsWith('prop')) return `Heiberg, Elements ${roman}.${number}`;
    return `Heiberg, Elements ${roman}, ${TYPE_META[type].singular} ${number}`;
  }

  function bumpFigure(passage: Passage, bookNum: number, type: TypeCode, number: string, add: number): void {
    const citation = citationFor(bookNum, type, number);
    const prev = figureCounts.get(passage);
    figureCounts.set(passage, { count: (prev?.count ?? 0) + add, citation });
  }

  /** Shared wording for every passage carrying Heiberg's bracketed-interpolation
   *  flag, whether resolved immediately (a trivial punctuation-only remainder
   *  survives outside the <del>) or deferred to leaf-close (nothing at all
   *  survives) - see resolvePendingBracketed and the </p> handler below. */
  function bracketedInterpolationAnomaly(): string {
    return (
      `${BRACKETED_INTERPOLATION_ANOMALY_PREFIX} as a probable later interpolation, not Euclid's ` +
      'original wording - encoded <del> in this digital transcription, printed in square brackets ' +
      "in Heiberg's own 1883 page. Shown here as Heiberg gives it rather than left blank; excluded " +
      'from his critical judgement of the authentic text.'
    );
  }

  /**
   * Resolves this leaf's queued fully-<del> paragraphs (see pendingBracketed
   * above) now that its full passage list is known:
   *   - leaf ends up with NO other passage -> a genuine "whole leaf is
   *     bracketed interpolation" case (the five documented leaves). Heiberg
   *     PRINTS this material (in square brackets), so it becomes real
   *     passage text, flagged with Passage.anomaly, rather than a blank
   *     division.
   *   - leaf has other surviving text -> this was an isolated bracketed
   *     aside (a spurious corollary/porism, typically) inside an otherwise
   *     normal leaf; excluded silently, exactly like the other 507 partial
   *     <del> exclusions elsewhere in this edition (every occurrence is
   *     still individually logged either way).
   */
  function resolvePendingBracketed(leaf: Division): void {
    if (pendingBracketed.length === 0) return;
    const keep = leaf.passages.length === 0;
    for (const cand of pendingBracketed) {
      if (keep) {
        totalBracketedInterpolations += 1;
        bracketedInterpolationLeavesSeen.add(leaf.id);
        const passage: Passage = {
          n: '',
          text: cand.text,
          ref: null,
          anomaly: bracketedInterpolationAnomaly(),
        };
        if (cand.figuresThisP > 0) {
          bumpFigure(passage, cand.bookNum, cand.type, cand.number, cand.figuresThisP);
          for (let i = 0; i < cand.figuresThisP; i++) {
            anomalies.push({
              where: leaf.id,
              note: `<figure/> diagram marker ${i + 1} of ${cand.figuresThisP} appears inside this bracketed-interpolation paragraph (${citationFor(cand.bookNum, cand.type, cand.number)}).`,
            });
          }
        }
        leaf.passages.push(passage);
      } else {
        anomalies.push({
          where: leaf.id,
          note:
            'An entire paragraph in this division is marked <del> in the source (a later interpolation per Heiberg); this leaf has other surviving text, so - matching the other partial <del> exclusions elsewhere - the paragraph is silently excluded rather than shown (see the individual <del> exclusion logged for this division for its verbatim text).',
        });
        if (cand.figuresThisP > 0) {
          const prev = leaf.passages[leaf.passages.length - 1];
          for (let i = 0; i < cand.figuresThisP; i++) {
            anomalies.push({
              where: leaf.id,
              note: `<figure/> diagram marker ${i + 1} of ${cand.figuresThisP} appears inside a fully <del>-excluded paragraph in this division (${citationFor(cand.bookNum, cand.type, cand.number)}); attached to the nearest surviving passage in the same division instead.`,
            });
          }
          if (prev) {
            bumpFigure(prev, cand.bookNum, cand.type, cand.number, cand.figuresThisP);
          } else {
            pendingFigures.set(leaf.id, (pendingFigures.get(leaf.id) ?? 0) + cand.figuresThisP);
          }
        }
      }
    }
    pendingBracketed = [];
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (inP && m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (delDepth === 0) {
        visibleBuf += free;
      }
      if (delDepth > 0) {
        for (let i = 0; i < delBufStack.length; i++) delBufStack[i] += free;
      }
      if (addDepth > 0) {
        for (let i = 0; i < addBufStack.length; i++) addBufStack[i] += free;
      }
    }
    lastIndex = tokenRe.lastIndex;

    const tok = m[0];

    if (m[1] !== undefined) {
      // specific book/type/number div-open
      const kind = m[1] as 'book' | 'type' | 'number';
      const n = m[2] ?? '';
      stack.push(kind);
      if (kind === 'book') {
        currentBookNum = Number(n);
        if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 13) {
          fail(`unexpected book number "${n}"`);
        }
        const meta = BOOK_TITLES[currentBookNum - 1];
        if (!meta) fail(`no BOOK_TITLES entry for book ${currentBookNum}`);
        currentBookDiv = {
          id: bookIdOf(currentBookNum),
          number: meta.number,
          ref: null,
          sourceHeading: null,
          editorialTitle: meta.en,
          children: [],
          passages: [],
        };
        divisions.push(currentBookDiv);
        currentType = null;
        currentGroupDiv = null;
      } else if (kind === 'type') {
        if (!isTypeCode(n)) fail(`unknown section-type code "${n}" in book ${currentBookNum}`);
        currentType = n;
        if (!currentBookDiv) fail(`type div "${n}" encountered outside any book`);
        currentGroupDiv = {
          id: groupIdOf(currentBookNum, currentType),
          number: null,
          ref: null,
          sourceHeading: null,
          editorialTitle: TYPE_META[currentType].groupLabel,
          children: [],
          passages: [],
        };
        currentBookDiv.children.push(currentGroupDiv);
        currentLeafDiv = null;
      } else {
        // number
        if (!currentGroupDiv || !currentType) fail(`number div "${n}" encountered outside any section-type group`);
        currentLeafId = leafIdOf(currentBookNum, currentType, n);
        currentLeafDiv = {
          id: currentLeafId,
          number: n,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        currentGroupDiv.children.push(currentLeafDiv);
        totalLeaves += 1;
        pendingBracketed = [];
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'number') {
        if (currentLeafDiv) resolvePendingBracketed(currentLeafDiv);
        currentLeafDiv = null;
      } else if (kind === 'type') {
        currentGroupDiv = null;
        currentType = null;
      } else if (kind === 'book') currentBookDiv = null;
    } else if (tok === '<p>') {
      inP = true;
      visibleBuf = '';
      delDepth = 0;
      addDepth = 0;
      delBufStack.length = 0;
      addBufStack.length = 0;
      figuresThisP = 0;
      addExcerptsThisP = [];
      delExcerptsThisP = [];
    } else if (tok === '</p>') {
      inP = false;
      if (!currentLeafDiv || !currentType) fail(`</p> encountered outside any numbered division (book ${currentBookNum})`);
      const cleaned = cleanText(visibleBuf);

      // --- split out a mis-nested proposition (see MISPLACED_SPLITS) -------
      const split = MISPLACED_SPLITS[currentLeafId];
      if (split && cleaned.startsWith(split.incipit)) {
        if (!currentGroupDiv) fail(`misplaced-split leaf "${currentLeafId}" has no parent section-type group`);
        const newLeafId = leafIdOf(currentBookNum, currentType, split.newNumber);
        const newLeafDiv: Division = {
          id: newLeafId,
          number: split.newNumber,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        currentGroupDiv.children.push(newLeafDiv);
        totalLeaves += 1;
        anomalies.push({
          where: newLeafId,
          note:
            `This proposition is genuinely present in the source but mis-nested: its enunciation and proof ` +
            `paragraphs sit as extra <p> siblings inside the still-open "${currentLeafId}" div rather than under ` +
            `their own <div type="textpart" subtype="number" n="${split.newNumber}">. Confirmed by direct ` +
            `inspection of the source XML; this importer splits it out into its own division here so the ` +
            `traditional numbering (${split.newNumber}) is preserved with its real text rather than shown as a gap.`,
        });
        currentLeafDiv = newLeafDiv;
        currentLeafId = newLeafId;
      }

      const bookNum = currentBookNum;
      const type = currentType;
      const number = currentLeafDiv.number ?? '';
      // A paragraph whose only surviving (non-<del>) text carries no letters at
      // all - e.g. a lone "." - is not real reading content of its own; every
      // known case (5, across Books II/V/VII/X) is a fully-<del> corollary,
      // porism, or spurious extra definition whose closing punctuation happens
      // to fall just outside the </del> tag. Verified letter-for-letter against
      // Heiberg's own 1883 page for all five instances (see structure.ts
      // BRACKETED_INTERPOLATION_LEAVES): the bracket closes right before that
      // same trailing period, every time. So this is handled as bracketed-interpolation
      // text too - always shown with the flag, never left as an orphaned dot -
      // unlike the whole-paragraph case below, this doesn't depend on whether
      // the leaf has other passages, since real (if trivial) visible content
      // survived here; dropping it would lose something Heiberg himself left
      // visible.
      const hasLetters = /\p{L}/u.test(cleaned);
      if (cleaned.length > 0 && !hasLetters && delExcerptsThisP.length > 0) {
        totalBracketedInterpolations += 1;
        bracketedInterpolationLeavesSeen.add(currentLeafId);
        const passage: Passage = {
          n: '',
          text: cleanText(delExcerptsThisP.join(' ') + cleaned),
          ref: null,
          anomaly: bracketedInterpolationAnomaly(),
        };
        if (figuresThisP > 0) {
          bumpFigure(passage, bookNum, type, number, figuresThisP);
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentLeafId,
              note: `<figure/> diagram marker ${i + 1} of ${figuresThisP} appears inside this bracketed-interpolation paragraph (${citationFor(bookNum, type, number)}).`,
            });
          }
        }
        currentLeafDiv.passages.push(passage);
      } else if (cleaned.length > 0) {
        const passage: Passage = { n: '', text: cleaned, ref: null };
        if (addExcerptsThisP.length > 0) {
          passage.anomaly = `editorial insertion${addExcerptsThisP.length > 1 ? 's' : ''} <add> printed in the edition, kept verbatim: ${addExcerptsThisP.map((t) => `"${t}"`).join(', ')}`;
        }
        if (figuresThisP > 0) {
          bumpFigure(passage, bookNum, type, number, figuresThisP);
          const citation = citationFor(bookNum, type, number);
          const hasRealImage = citation in REAL_DIAGRAMS;
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentLeafId,
              note: hasRealImage
                ? `<figure/> diagram marker ${i + 1} of ${figuresThisP} in this division (${citation}); a real diagram image is shown, sourced from the printed edition's scanned page (see data/euclid-elements/images/).`
                : `<figure/> diagram marker ${i + 1} of ${figuresThisP} in this division (${citation}); no legitimate image available (source graphic points to a dead heml.mta.ca host), so an honest "not yet available" note is shown instead.`,
            });
          }
        }
        const pending = pendingFigures.get(currentLeafId);
        if (pending) {
          bumpFigure(passage, bookNum, type, number, pending);
          pendingFigures.delete(currentLeafId);
        }
        currentLeafDiv.passages.push(passage);
      } else if (delExcerptsThisP.length > 0) {
        // The whole paragraph was inside <del>. Whether this becomes real
        // (kept, flagged) passage text or a silent exclusion depends on
        // whether the LEAF this paragraph belongs to ends up with any OTHER
        // surviving passage - not knowable until the leaf closes - so it's
        // queued here and resolved by resolvePendingBracketed() at the
        // leaf's closing </div>.
        pendingBracketed.push({
          text: cleanText(delExcerptsThisP.join(' ')),
          figuresThisP,
          bookNum,
          type,
          number,
        });
      } else {
        // Defensive fallback: a paragraph that cleans to nothing without any
        // <del> span accounting for it. Not currently reachable (every
        // known empty-after-cleaning paragraph in this source is fully
        // <del>-wrapped - see the branch above), but kept honest rather than
        // silently dropped if the source ever contains one.
        anomalies.push({
          where: currentLeafId,
          note:
            'A paragraph in this division cleaned to empty text without being <del>-wrapped; dropped from the reading text rather than emitted empty. Investigate if this ever appears - it was not expected when this importer was written.',
        });
        if (figuresThisP > 0) {
          const prev = currentLeafDiv.passages[currentLeafDiv.passages.length - 1];
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentLeafId,
              note: `<figure/> diagram marker ${i + 1} of ${figuresThisP} appears inside an unexpectedly-empty paragraph in this division (${citationFor(bookNum, type, number)}); attached to the nearest surviving passage in the same division instead.`,
            });
          }
          if (prev) {
            bumpFigure(prev, bookNum, type, number, figuresThisP);
          } else {
            pendingFigures.set(currentLeafId, (pendingFigures.get(currentLeafId) ?? 0) + figuresThisP);
          }
        }
      }
    } else if (tok === '<del>') {
      delDepth += 1;
      delBufStack.push('');
    } else if (tok === '</del>') {
      const text = delBufStack.pop() ?? '';
      delDepth -= 1;
      totalDelSpans += 1;
      // Only a top-level (non-nested) span - true of every case in this
      // source - is recorded for the "whole paragraph deleted" fallback
      // below; a nested <del> would otherwise be double-counted.
      if (delDepth === 0 && inP) delExcerptsThisP.push(text);
      anomalies.push({
        where: currentLeafId || `book-${currentBookNum}`,
        note: `<del> excluded from the reading text: "${excerpt(text)}"`,
      });
    } else if (tok === '<add>') {
      addDepth += 1;
      addBufStack.push('');
    } else if (tok === '</add>') {
      const text = addBufStack.pop() ?? '';
      addDepth -= 1;
      totalAddSpans += 1;
      addExcerptsThisP.push(excerpt(text));
      anomalies.push({
        where: currentLeafId,
        note: `<add> editorial insertion, kept verbatim in the reading text: "${excerpt(text)}"`,
      });
    } else if (tok === '<figure/>') {
      totalFigureMarkers += 1;
      figuresThisP += 1;
    }
    // <num>, </num>, <lb .../>, the generic <div ...> (edition wrapper): no
    // structural action beyond token recognition (so their raw tag text is
    // never appended to visibleBuf). <lb> is a line artefact only; unlike
    // isagoge/aristotle it needs no inserted space here because every
    // occurrence in this source already sits next to natural whitespace on
    // at least one side (verified against the real file before writing this
    // importer) - <num>/<div> are zero-width unwraps by design.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 13) fail(`expected exactly 13 Book divisions, got ${divisions.length}`);
  if (pendingFigures.size > 0) {
    fail(
      `${pendingFigures.size} figure marker(s) never found a surviving passage to attach to: ` +
        [...pendingFigures.entries()].map(([id, n]) => `${id} (${n})`).join(', '),
    );
  }

  process.stdout.write(
    `  ${totalLeaves} numbered leaf divisions  ${totalFigureMarkers} <figure/>  ` +
      `${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalBracketedInterpolations} fully-<del> paragraphs kept as bracketed interpolations\n`,
  );

  // --- cross-check against the independently-researched ground truth --------
  if (totalLeaves !== EXPECTED_TOTAL_LEAVES) {
    fail(`expected ${EXPECTED_TOTAL_LEAVES} total numbered leaf divisions, parsed ${totalLeaves}`);
  }
  if (totalFigureMarkers !== EXPECTED_TOTAL_FIGURES) {
    fail(`expected ${EXPECTED_TOTAL_FIGURES} total <figure/> markers, parsed ${totalFigureMarkers}`);
  }

  for (const bgt of GROUND_TRUTH) {
    const bookDiv = divisions[bgt.book - 1];
    if (!bookDiv) fail(`missing Book ${bgt.book}`);
    const gotGroupIds = bookDiv.children.map((g) => g.id);
    const wantGroupIds = bgt.groups.map((g) => groupIdOf(bgt.book, g.type));
    if (gotGroupIds.length !== wantGroupIds.length || gotGroupIds.some((id, i) => id !== wantGroupIds[i])) {
      fail(
        `Book ${bgt.book}: section-type groups do not match ground truth.\n` +
          `  got:  ${gotGroupIds.join(', ')}\n  want: ${wantGroupIds.join(', ')}`,
      );
    }
    bgt.groups.forEach((g, gi) => {
      const groupDiv = bookDiv.children[gi]!;
      const want = expectedNumbers(g);
      const got = groupDiv.children.map((leaf) => leaf.number);
      if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
        fail(
          `Book ${bgt.book} / ${g.type}: leaf numbers do not match ground truth.\n` +
            `  got:  ${got.join(',')}\n  want: ${want.join(',')}`,
        );
      }
    });
  }

  // --- no leaf should ever be empty now; verify the bracketed-interpolation
  //     flag landed on exactly the five documented leaves and nowhere else ---
  const emptyLeaves: string[] = [];
  const walk = (ds: Division[]): void => {
    for (const d of ds) {
      if (d.children.length === 0 && d.passages.length === 0) emptyLeaves.push(d.id);
      if (d.children.length > 0) walk(d.children);
    }
  };
  walk(divisions);
  if (emptyLeaves.length > 0) {
    fail(`leaf division(s) unexpectedly carry zero passages: ${emptyLeaves.sort().join(', ')}`);
  }
  const wantInterpolation = [...BRACKETED_INTERPOLATION_LEAVES].sort();
  const gotInterpolation = [...bracketedInterpolationLeavesSeen].sort();
  if (JSON.stringify(gotInterpolation) !== JSON.stringify(wantInterpolation)) {
    fail(
      `bracketed-interpolation leaves do not match the documented set.\n  got:  ${gotInterpolation.join(', ')}\n  want: ${wantInterpolation.join(', ')}`,
    );
  }

  // --- resolve deferred figure counts into actual PassageFigure objects ---
  let totalRealImages = 0;
  for (const [passage, { count, citation }] of figureCounts) {
    const diagram = REAL_DIAGRAMS[citation];
    if (diagram) {
      totalRealImages += 1;
      passage.figure = {
        source: citation,
        image: diagram.image,
        imageWidth: diagram.width,
        imageHeight: diagram.height,
        alt: `Diagram for ${citation}, from the printed edition (Heiberg, Euclidis Opera Omnia vol. I).`,
      };
    } else {
      passage.figure = {
        source: citation,
        note:
          count > 1
            ? `${count} diagrams appear here in the printed edition; not yet available in this build.`
            : 'A diagram appears here in the printed edition; not yet available in this build.',
      };
    }
  }

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'euclid-elements / reading text',
    note: `${totalDelSpans} <del> spans (editorially deleted text, mostly corollaries/lemmas Heiberg judged spurious) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: 'euclid-elements / reading text',
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: 'euclid-elements / diagrams',
    note: `${totalFigureMarkers} <figure/> diagram markers total (the source graphic references a dead heml.mta.ca host, so none is recoverable via the TEI itself). ${totalRealImages} of these - Book I's 48 propositions and Book II's 14 - instead carry a real diagram image, sourced by rendering the actual printed page from Heiberg's edition (archive.org euclidisoperaomn01eucluoft) and cropping to the diagram; every crop was checked by hand against the source page. The remaining ${totalFigureMarkers - totalRealImages} markers are preserved as honest "not yet available" notes; every occurrence (image or note) is logged individually above.`,
  });
  anomalies.push({
    where: 'euclid-elements / passages',
    note: `${totalBracketedInterpolations} paragraphs are entirely <del> in the source; five leaf divisions (${wantInterpolation.join(', ')}) consist of nothing else. Verified against Heiberg's 1883 printed page: he brackets this material as a probable interpolation but PRINTS it, rather than omitting it, so the importer keeps his bracketed wording as these five leaves' passage text (each flagged with Passage.anomaly) instead of leaving them blank.`,
  });
  anomalies.push({
    where: 'euclid-elements / mis-nested propositions',
    note:
      'Four propositions - Book I.30, Book II.7, Book X (first proposition-group).6, and Book XII.7 - were ' +
      'investigated and found genuinely present in the source, but mis-nested: the TEI never opens a fresh ' +
      'numbered <div> for them, so their text sits as extra <p> siblings inside the still-open previous ' +
      'proposition\'s div. Confirmed by direct inspection of the source XML, not inferred; this importer splits ' +
      'each one out into its own division (see MISPLACED_SPLITS in scripts/import-euclid/index.ts and the ' +
      'individually-logged split anomaly for each), so all four appear with their real Greek text rather than as ' +
      'numbering gaps.',
  });
  anomalies.push({
    where: 'euclid-elements / character encoding',
    note: 'The source is already NFC-normalised polytonic Greek; no normalisation pass was applied.',
  });
  anomalies.push({
    where: 'book-11-prop-31',
    note:
      'This passage contains nine "#N" transcription-placeholder artefacts (e.g. "Τ#5", "#22α", "Ω#4") and one ' +
      'stray standalone combining diacritic (U+0342 COMBINING GREEK PERISPOMENI, in "Σο͂") - the proof runs past the ' +
      '24-letter Greek alphabet for its point-labels, and the digital transcription apparently could not render ' +
      'whatever special/primed-letter notation Heiberg\'s print uses at that point. Preserved verbatim; not corrected.',
  });
  anomalies.push({
    where: 'euclid-elements / passage & division refs',
    note: 'This TEI carries no <pb> page markers and no other milestone tags, so every passage and division ref is null; cite by Book and printed number.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'euclid-elements',
    language: 'grc',
    divisions,
  };

  const about = {
    workId: 'euclid-elements',
    title: 'Στοιχεῖα',
    author: 'Euclid',
    language: 'grc' as const,
    edition: 'Heiberg 1883-88',
    editor: 'Johan Ludvig Heiberg',
    provenance: PROVENANCE,
    license: LICENSE,
    sections: ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  const countRec = (ds: Division[]): void => {
    for (const d of ds) {
      totalPassages += d.passages.length;
      totalChars += d.passages.reduce((n, p) => n + p.text.length, 0);
      countRec(d.children);
    }
  };
  countRec(divisions);

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  ${b.number!.padEnd(6)} ${b.id.padEnd(9)} ${b.children.length} group(s)  "${b.editorialTitle}"\n`);
  }
  process.stdout.write(
    `\n  13 books  ${totalLeaves} leaf divisions (expected ${EXPECTED_TOTAL_LEAVES})  ` +
      `${totalFigureMarkers} figure markers (expected ${EXPECTED_TOTAL_FIGURES}), ${totalRealImages} with a real image  ` +
      `${totalPassages} passages  ${totalChars} chars\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:euclid` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
