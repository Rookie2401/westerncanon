/**
 * Virgil, *Aeneid* — English verse translation (Theodore C. Williams,
 * Boston: Houghton Mifflin, 1910, public domain; CTS
 * urn:cts:latinLit:phi0690.phi003; Perseus witness id perseus-eng2).
 * Text-only companion to the bundled Latin edition
 * (scripts/import-virgil-aeneid-la) — same 12-book structure, independent
 * parser (this witness's markup vocabulary and nesting differ from the
 * Latin one).
 *
 *   npx tsx scripts/import-virgil-aeneid-en/index.ts
 *
 * Reads scripts/import-virgil-aeneid-en/raw/phi0690.phi003.perseus-eng2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repo and cached
 * in the repo; nothing is downloaded at import time) and writes:
 *   data/aeneid-en/work.json       — the GenericWork (12 Books, each a flat
 *                                     leaf Division carrying one Passage —
 *                                     see scripts/import-virgil-shared/types.ts)
 *   data/aeneid-en/about.json      — provenance / licence / prose
 *   data/aeneid-en/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-virgil-shared/validate.ts`.
 *
 * Is Williams' translation verse or prose? Confirmed by direct inspection of
 * the actual fetched XML (not assumed): every line of running English text
 * is wrapped in its own `<l n="N">...</l>`, exactly like the Latin witness —
 * e.g. book 1: `<l n="1">Arms and the man I sing, who first made way,</l>`.
 * Williams' 1910 translation is itself English BLANK VERSE (unrhymed
 * pentameter-ish lines), not prose — unlike, say, a deliberately prose Homer
 * translation. So, per the task's instruction to preserve verse line breaks
 * when the translation is itself verse, this importer joins Williams' own
 * `<l>` lines with '\n', exactly as the Latin importer does for Virgil's
 * hexameters — never collapsed into flowing prose. Williams' English line
 * count (13,336) is much higher than Virgil's own (9,863): free translation
 * into a different metrical tradition routinely expands a Latin line into
 * more than one English line, which is expected and not an error.
 *
 * Source structure, established by direct inspection of the fetched XML:
 *
 *   - 12 `<div type="textpart" subtype="book" n="N">` Book divs, consistent
 *     attribute order in this particular witness (n always last) — the
 *     detection logic below still checks attribute VALUES independently of
 *     order/position, matching the Latin importer's tolerance, in case any
 *     future re-fetch of this source ever varies it.
 *   - Inside each Book div, 327 nested `<div type="textpart" subtype="card"
 *     resp="p" n="N">` sub-divisions across the whole work — Loeb-style
 *     print-pagination "cards", not meaningful structure (confirmed: no
 *     narrative/sentence significance, just where the 1910 print's page
 *     numbering falls). Transparently unwrapped: recognized only so the
 *     `<div>`/`</div>` nesting stack stays balanced, otherwise ignored.
 *   - `<milestone ed="p" unit="card"/>` (69) and `<milestone ed="P"
 *     unit="para"/>` (12) are further print-pagination/paragraph markers,
 *     self-closing and zero-width — dropped without logging, same treatment
 *     as the Latin witness's `<milestone ed="p" n="N" unit="card"/>`.
 *   - `<placeName key="…">…</placeName>` (598) and one `<persName>…
 *     </persName>` mark proper nouns with Perseus gazetteer/prosopography
 *     keys — structural markup, not printed characters; unwrapped (tag
 *     dropped, inner text kept), same treatment as `<q>`/`<hi>` in the Latin
 *     importer.
 *   - `<choice><reg>…</reg><orig>…</orig></choice>` (4 occurrences: Book 6
 *     "Pasiphaë"/"Deïphobus" ×2/"Aloïdae") is a genuine spelling variant —
 *     `<orig>` is the diaeresis spelling actually printed in this 1910
 *     edition's typography, `<reg>` a plain-ASCII regularization added by
 *     the encoder. The `<orig>` reading is kept as the passage text (most
 *     faithful to the real print, and the opposite convention from the
 *     companion Latin edition's one sic/corr case, which is a transcription
 *     error rather than a spelling variant — see that importer's module
 *     doc); the `<reg>` alternate is logged to anomalies.json, not silently
 *     dropped.
 *   - No `<del>`, `<gap>`, or `<note>` anywhere in this source (0
 *     occurrences of each, unlike the companion Latin witness) — confirmed
 *     by a corpus-wide scan before writing this importer.
 *
 * Faithfulness rules (mirrors scripts/import-virgil-aeneid-la): verbatim
 * English reading text only — no spelling/wording modernization. Only XML
 * transport scaffolding (tags, the card print-layout divs, print-pagination
 * milestones, entity decoding, whitespace collapse) is stripped; the one
 * reg/orig spelling choice above is the only content-affecting decision,
 * logged individually and explained here and in about.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../import-virgil-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0690.phi003.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'aeneid-en');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

function bookIdOf(n: number): string {
  return `book-${n}`;
}

function hasAttrValue(tag: string, name: string, value: string): boolean {
  return new RegExp(`\\s${name}="${value}"`).test(tag);
}
function attrValue(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}
function isBookOpen(tag: string): boolean {
  return hasAttrValue(tag, 'type', 'textpart') && hasAttrValue(tag, 'subtype', 'book');
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div[^>]*>|<\/div>|<milestone\b[^>]*\/>|<l\b[^>]*>|<\/l>|<placeName\b[^>]*>|<\/placeName>|<persName\b[^>]*>|<\/persName>|<choice>|<\/choice>|<reg>|<\/reg>|<orig>|<\/orig>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'other'> = [];

  let currentBookNum = 0;
  let currentBookId = '';
  let currentBookLines: string[] = [];
  let currentBookFirstN: number | null = null;
  let currentBookLastN: number | null = null;
  let currentBookChoices = 0;

  let inL = false;
  let currentLineNRaw = '';
  let lineBuf = '';

  let inReg = false;
  let regBuf = '';
  let inOrig = false;
  let origBuf = '';

  let totalLines = 0;
  let totalChoices = 0;
  let totalBooks = 0;

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inReg) {
        regBuf += free;
      } else if (inL) {
        lineBuf += free;
        if (inOrig) origBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;

    const tok = m[0];

    if (tok.startsWith('<div')) {
      if (isBookOpen(tok)) {
        const rawN = attrValue(tok, 'n');
        const n = rawN != null ? Number(rawN) : NaN;
        if (!Number.isFinite(n) || n < 1 || n > 12) fail(`unexpected book number "${rawN}" in div "${tok}"`);
        stack.push('book');
        currentBookNum = n;
        currentBookId = bookIdOf(n);
        currentBookLines = [];
        currentBookFirstN = null;
        currentBookLastN = null;
        currentBookChoices = 0;
      } else {
        stack.push('other');
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'book') {
        totalBooks += 1;
        if (currentBookFirstN === null || currentBookLastN === null) {
          fail(`${currentBookId}: no <l> lines found`);
        }
        const passageText = currentBookLines.join('\n');
        if (passageText.length === 0) fail(`${currentBookId}: passage text is empty`);
        const passage: Passage = {
          n: '',
          text: passageText,
          ref: null,
          ...(currentBookChoices > 0 ? { anomaly: `${currentBookChoices} reg/orig spelling choice(s) resolved to the original diacritic spelling — see anomalies.json for detail.` } : {}),
        };
        const division: Division = {
          id: currentBookId,
          number: String(currentBookNum),
          ref: `${currentBookFirstN}–${currentBookLastN}`,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [passage],
        };
        divisions.push(division);
      }
    } else if (/^<milestone\b/.test(tok)) {
      // print-pagination "card"/paragraph marker: zero-width transport scaffolding.
    } else if (/^<l\b/.test(tok)) {
      inL = true;
      lineBuf = '';
      currentLineNRaw = attrValue(tok, 'n') ?? '';
      const nNum = Number.parseInt(currentLineNRaw, 10);
      if (Number.isFinite(nNum)) {
        if (currentBookFirstN === null) currentBookFirstN = nNum;
        currentBookLastN = nNum;
      }
      totalLines += 1;
    } else if (tok === '</l>') {
      inL = false;
      const cleaned = cleanText(lineBuf);
      if (cleaned.length === 0) {
        fail(`${currentBookId} l.${currentLineNRaw}: line cleaned to empty text (unexpected — this source has no <del>/<gap>)`);
      }
      currentBookLines.push(cleaned);
      lineBuf = '';
    } else if (/^<placeName\b/.test(tok) || tok === '</placeName>' || /^<persName\b/.test(tok) || tok === '</persName>') {
      // proper-noun gazetteer markup only: unwrap (tag dropped, inner text
      // already flows into lineBuf via the free-text capture above).
    } else if (tok === '<choice>') {
      // no action: reg/orig content handled individually below.
    } else if (tok === '</choice>') {
      totalChoices += 1;
      currentBookChoices += 1;
      const reg = cleanText(regBuf);
      const orig = cleanText(origBuf);
      anomalies.push({
        where: `${currentBookId} l.${currentLineNRaw}`,
        note: `Source <choice>: kept the original diacritic spelling "${orig}" as printed (Williams' 1910 edition); the digitization also offers a plain-ASCII regularized spelling "${reg}", not used here.`,
      });
      regBuf = '';
      origBuf = '';
    } else if (tok === '<reg>') {
      inReg = true;
      regBuf = '';
    } else if (tok === '</reg>') {
      inReg = false;
    } else if (tok === '<orig>') {
      inOrig = true;
      origBuf = '';
    } else if (tok === '</orig>') {
      inOrig = false;
    }
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 12) fail(`expected exactly 12 Book divisions, got ${divisions.length}`);
  if (totalBooks !== 12) fail(`expected exactly 12 Book closures, got ${totalBooks}`);

  const gotIds = divisions.map((d) => d.id);
  const wantIds = Array.from({ length: 12 }, (_, i) => bookIdOf(i + 1));
  if (JSON.stringify(gotIds) !== JSON.stringify(wantIds)) {
    fail(`Book divisions are not in order 1..12.\n  got:  ${gotIds.join(', ')}\n  want: ${wantIds.join(', ')}`);
  }

  if (totalChoices !== 4) fail(`expected 4 reg/orig <choice> spans (verified against the fetched source), got ${totalChoices}`);

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'aeneid-en / reading text',
    note: `${totalChoices} <choice><reg>/<orig></choice> spelling variants (Book 6 underworld catalogue: Pasiphaë, Deïphobus ×2, Aloïdae) were resolved to the <orig> (as-printed, diacritic) spelling; every occurrence is logged individually above alongside the <reg> alternate.`,
  });
  anomalies.push({
    where: 'aeneid-en / reading text',
    note: `${totalLines} <l> verse-line elements were parsed across the 12 books, well above Virgil's own 9,863 Latin <l> elements (see the companion Latin importer) — Williams' free English verse translation routinely expands a single Latin hexameter into more than one English line; this is expected, not an error.`,
  });
  anomalies.push({
    where: 'aeneid-en / passage & division refs',
    note: 'This TEI carries no <pb> page markers, so every Passage.ref is null; Division.ref gives each book\'s own translated verse-line range instead (first–last <l n="…"> found in that book, Williams\' own line numbering, which tracks the Latin closely but not exactly).',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'aeneid-en',
    language: 'en',
    divisions,
  };

  const PROVENANCE =
    'Perseus Digital Library / Open Greek and Latin, canonical-latinLit GitHub repository ' +
    '(github.com/PerseusDL/canonical-latinLit), file data/phi0690/phi003/phi0690.phi003.perseus-eng2.xml, ' +
    'CTS urn:cts:latinLit:phi0690.phi003.perseus-eng2. TEI XML digitization CC BY-SA 4.0.';
  const LICENSE = 'English translation (Williams, 1910) is public domain. TEI XML digitization/markup: CC BY-SA 4.0 (Perseus Digital Library / Open Greek and Latin).';

  const about = {
    workId: 'aeneid-en',
    title: 'The Aeneid of Virgil',
    author: 'Publius Vergilius Maro (Virgil)',
    language: 'en' as const,
    edition: 'Theodore C. Williams, trans., The Aeneid of Virgil, Translated into English Verse (Boston: Houghton Mifflin Co., 1910)',
    translator: 'Theodore Chickering Williams',
    provenance: PROVENANCE,
    license: LICENSE,
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'The Aeneid is Virgil\'s twelve-book Latin epic, composed between roughly 29 and 19 BC and left ' +
            'unfinished at his death. It follows the Trojan prince Aeneas from the fall of Troy, through his ' +
            'wanderings and love for Dido at Carthage (Books 1–6, an "Odyssean" half modeled on the Odyssey), to ' +
            'his war in Italy and the founding of the people who would become Rome (Books 7–12, an "Iliadic" ' +
            'half modeled on the Iliad).',
          'Theodore C. Williams (1855–1915) rendered the poem into unrhymed English verse, published in 1910; ' +
            'this edition preserves his own line-by-line verse structure, one Passage per book, with each of ' +
            'his English lines on its own line of text rather than collapsed into a single paragraph.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The reading text is Theodore C. Williams\' 1910 verse translation, as digitized by the Perseus ' +
            'Project. Williams translated freely rather than line-for-line, so his own line numbering, while ' +
            'close to Virgil\'s, does not match the Latin exactly — see about.json\'s "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Fetched from the PerseusDL/canonical-latinLit GitHub repository (an Open Greek and Latin / Perseus ' +
            'Digital Library project), file phi0690/phi003/phi0690.phi003.perseus-eng2.xml. The raw TEI XML is ' +
            'cached under scripts/import-virgil-aeneid-en/raw/ so the importer never needs to re-fetch the source ' +
            'to rebuild work.json.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the 12 books is a single top-level Division (book-1 .. book-12) holding exactly one Passage: ' +
            'its full verse text, one line per array element joined with a newline, in document order. There is ' +
            'no chapter/section level below the book in this schema, matching the companion Latin edition.',
          'The source nests every line inside a further "card" div (a Loeb-style print-pagination marker, 327 ' +
            'of them across the work) — these carry no narrative significance and are transparently unwrapped, ' +
            'never surfaced in the schema.',
          'Division.ref gives each book\'s own translated line range (e.g. Book 1\'s), taken from the first and ' +
            'last <l n="…"> actually encountered in that book\'s source markup, not a fabricated round number.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Every irregularity below is documented individually in anomalies.json with a machine-readable ' +
            '{where, note} entry.',
          '4 <choice><reg>/<orig></choice> spelling variants, all in Book 6\'s catalogue of the dead ' +
            '(Pasiphaë, Deïphobus ×2, Aloïdae): the diacritic <orig> spelling actually printed in the 1910 ' +
            'edition is kept as the reading text; the plain-ASCII <reg> regularization added by the digitization ' +
            'is logged as an alternate, not shown.',
          'Williams translated freely, not line-for-line: his English carries 13,336 verse lines against ' +
            'Virgil\'s own 9,863 Latin lines. This is an expected feature of a free verse translation, not a ' +
            'transcription problem, and Division.ref for each book reflects Williams\' own line numbering, not ' +
            'the Latin\'s.',
          'Unlike the companion Latin edition, this source contains no <del> (editorially-excluded lines), no ' +
            '<gap> (manuscript lacuna marker), and no embedded editorial <note> — confirmed by a corpus-wide scan.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalChars = 0;
  for (const d of divisions) totalChars += d.passages[0]!.text.length;

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  ${b.number!.padEnd(4)} ${b.id.padEnd(9)} ref ${b.ref!.padEnd(10)} ${b.passages[0]!.text.split('\n').length} lines  ${b.passages[0]!.text.length} chars\n`);
  }
  process.stdout.write(
    `\n  12 books  ${totalLines} <l> elements parsed  ${totalChoices} reg/orig choice(s)  ${totalChars} total passage chars\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-virgil-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
