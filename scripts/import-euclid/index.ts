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
 *     to anomalies.json. A <p> that is deleted in its entirety is dropped
 *     from the passages array rather than emitted empty (matching the
 *     isagoge convention of skipping a paragraph that cleans to nothing) -
 *     five such divisions end up with zero passages; this is a documented,
 *     deliberate feature of Heiberg's edition (see structure.ts
 *     EXPECTED_EMPTY_LEAVES and the About page).
 *   - <add> (rare editorial insertion) is INCLUDED in the reading text and
 *     logged individually; the containing Passage also carries `anomaly`.
 *   - <figure/> (498 total) has no legitimately recoverable image via the
 *     TEI (its graphic url points at a dead host). For Book I's 48
 *     propositions, a real diagram image has instead been sourced directly
 *     from the scanned printed edition (Heiberg, Euclidis Opera Omnia vol.
 *     I, archive.org identifier euclidisoperaomn01eucluoft) and cropped to
 *     the diagram's portion of the page - see BOOK_1_DIAGRAMS below and
 *     data/euclid-elements/images/. Every other marker (450 of 498) is
 *     preserved as an honest `figure: { source, note }` on its passage
 *     (never a fabricated image) and logged individually to anomalies.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOK_TITLES,
  EXPECTED_EMPTY_LEAVES,
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

  let totalLeaves = 0;
  let totalFigureMarkers = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalDroppedEmptyParagraphs = 0;

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
    1: [1332, 941], 2: [1180, 1154], 3: [991, 829], 4: [795, 1129], 5: [838, 1046],
    6: [746, 702], 7: [1053, 697], 8: [1046, 677], 9: [513, 1035], 10: [714, 705],
    11: [1108, 754], 12: [1166, 822], 13: [731, 725], 14: [972, 484], 15: [1008, 746],
    16: [779, 806], 17: [1037, 645], 18: [1238, 613], 19: [648, 1026], 20: [873, 980],
    21: [1322, 867], 22: [2371, 797], 23: [892, 1045], 24: [1000, 741], 25: [906, 752],
    26: [1139, 731], 27: [1803, 608], 28: [1060, 832], 29: [1024, 885], 30: [976, 756],
    31: [1004, 555], 32: [740, 608], 33: [1048, 680], 34: [969, 554], 35: [1104, 542],
    36: [1583, 644], 37: [1049, 517], 38: [1044, 534], 39: [875, 613], 40: [985, 506],
    41: [954, 521], 42: [1149, 436], 43: [1164, 714], 44: [953, 1147], 45: [848, 1012],
    46: [662, 830], 47: [1130, 1116], 48: [731, 931],
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
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'number') currentLeafDiv = null;
      else if (kind === 'type') {
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
      if (cleaned.length > 0) {
        const passage: Passage = { n: '', text: cleaned, ref: null };
        if (addExcerptsThisP.length > 0) {
          passage.anomaly = `editorial insertion${addExcerptsThisP.length > 1 ? 's' : ''} <add> printed in the edition, kept verbatim: ${addExcerptsThisP.map((t) => `"${t}"`).join(', ')}`;
        }
        if (figuresThisP > 0) {
          bumpFigure(passage, bookNum, type, number, figuresThisP);
          const citation = citationFor(bookNum, type, number);
          const hasRealImage = citation in BOOK_1_DIAGRAMS;
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
      } else {
        totalDroppedEmptyParagraphs += 1;
        anomalies.push({
          where: currentLeafId,
          note:
            'An entire paragraph in this division is marked <del> in the source (a later interpolation per Heiberg) and is excluded from the reading text in full; the paragraph is dropped rather than emitted empty (see the individual <del> exclusion(s) logged for this division for the excluded text).',
        });
        if (figuresThisP > 0) {
          const prev = currentLeafDiv.passages[currentLeafDiv.passages.length - 1];
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentLeafId,
              note: `<figure/> diagram marker ${i + 1} of ${figuresThisP} appears inside a fully <del>-excluded paragraph in this division (${citationFor(bookNum, type, number)}); attached to the nearest surviving passage in the same division instead.`,
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
      `${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalDroppedEmptyParagraphs} fully-<del> paragraphs dropped\n`,
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

  // --- verify the known zero-passage leaves are exactly the expected five ---
  const emptyLeaves: string[] = [];
  const walk = (ds: Division[]): void => {
    for (const d of ds) {
      if (d.children.length === 0 && d.passages.length === 0) emptyLeaves.push(d.id);
      if (d.children.length > 0) walk(d.children);
    }
  };
  walk(divisions);
  const wantEmpty = [...EXPECTED_EMPTY_LEAVES].sort();
  const gotEmpty = [...emptyLeaves].sort();
  if (JSON.stringify(gotEmpty) !== JSON.stringify(wantEmpty)) {
    fail(
      `zero-passage leaves do not match the documented set.\n  got:  ${gotEmpty.join(', ')}\n  want: ${wantEmpty.join(', ')}`,
    );
  }

  // --- resolve deferred figure counts into actual PassageFigure objects ---
  let totalRealImages = 0;
  for (const [passage, { count, citation }] of figureCounts) {
    const diagram = BOOK_1_DIAGRAMS[citation];
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
    note: `${totalFigureMarkers} <figure/> diagram markers total (the source graphic references a dead heml.mta.ca host, so none is recoverable via the TEI itself). ${totalRealImages} of these - Book I's 48 propositions - instead carry a real diagram image, sourced by rendering the actual printed page from Heiberg's edition (archive.org euclidisoperaomn01eucluoft) and cropping to the diagram; every crop was checked by hand against the source page. The remaining ${totalFigureMarkers - totalRealImages} markers are preserved as honest "not yet available" notes; every occurrence (image or note) is logged individually above.`,
  });
  anomalies.push({
    where: 'euclid-elements / passages',
    note: `${totalDroppedEmptyParagraphs} paragraphs were dropped entirely because their whole content is under <del>; five leaf divisions (${wantEmpty.join(', ')}) consequently carry zero passages. This is a documented, deliberate feature of this edition, not an importer defect.`,
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
