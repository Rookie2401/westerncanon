/**
 * Virgil, *Aeneid* — Latin text (ed. J. B. Greenough, Boston: Ginn & Co.
 * 1900 [orig. 1881], public domain; CTS urn:cts:latinLit:phi0690.phi003;
 * Perseus witness id perseus-lat2). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-virgil-aeneid-la/index.ts
 *
 * Reads scripts/import-virgil-aeneid-la/raw/phi0690.phi003.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repo and cached
 * in the repo; nothing is downloaded at import time) and writes:
 *   data/aeneid-la/work.json       — the GenericWork (12 Books, each a flat
 *                                     leaf Division carrying one Passage —
 *                                     see scripts/import-virgil-shared/types.ts)
 *   data/aeneid-la/about.json      — provenance / licence / prose
 *   data/aeneid-la/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-virgil-shared/validate.ts`.
 *
 * Source structure, established by direct inspection of the fetched XML
 * (not assumed from any other importer's docs):
 *
 *   - 12 `<div type="textpart" subtype="book">` Book divs. Attribute order
 *     genuinely varies in this source — most books print
 *     `<div n="N" type="textpart" subtype="book">` (n FIRST) but several
 *     (e.g. Book 3, 4, 6, 8, 11, 12) print `type`/`subtype` first and `n`
 *     last. The tokenizer below matches any `<div ...>` generically and
 *     inspects its attributes independently of order, so this never matters.
 *     A single outer wrapper `<div type="edition" xml:lang="lat"
 *     subtype="book">` also carries `subtype="book"` as an attribute VALUE —
 *     book-open detection requires BOTH `type="textpart"` AND
 *     `subtype="book"` to be present, so this wrapper (type="edition") is
 *     correctly never mistaken for one of the 12 real Book divs.
 *   - Inside each Book div: a flat sequence of `<l n="N" [rend="indent"]
 *     [part="Y"]>verse text</l>` lines — 9,897 `<l>` elements total across
 *     the 12 books (see the per-book table in about.json / the console
 *     summary), matching the commonly-cited traditional total of 9,896
 *     lines almost exactly. 34 lines carry an extra `part="Y"` attribute
 *     (attribute order varies here too, e.g. `<l part="Y" n="534">`, tested
 *     independently of position) marking a short continuation fragment that
 *     shares its traditional verse number with the previous `<l>` (a
 *     genuine Virgilian incomplete/"half" line, e.g. Aeneid 3.534 "Hic
 *     cursus fuit:") — each still gets its own array entry and its own
 *     line of the joined passage text, faithfully preserving the source's
 *     own line-by-line layout rather than merging it away.
 *     One line (Book 7) is numbered "62b" rather than a plain integer — a
 *     genuine half-line continuation in this source, not a typo; harmless
 *     here since Passage.n carries no per-line numbering in this schema.
 *   - `<milestone ed="p" n="N" unit="card"/>` (394 total) is a print-
 *     pagination "card" marker, self-closing and zero-width — transport
 *     scaffolding only, dropped without logging (same treatment as Euclid's
 *     `<lb rend="displayNum">`).
 *   - `<q>` / `<q rend="merge">` (3,833 total) mark direct speech; `<hi
 *     rend="italic">` (5, all inside one quoted oracle in Book 2) marks
 *     typographic emphasis. Both are structural/typographic markup, not
 *     printed characters — unwrapped (tag dropped, inner text kept), same
 *     treatment as Euclid's `<num>`. No literal quotation marks are
 *     invented for `<q>`.
 *   - `<del>...</del>` (61 spans: 54 wrap an entire `<l>`'s content — most
 *     famously Aeneid 2.567–588, the "Helen episode", widely judged by
 *     editors not to be Virgil's own work — and 7 delete only part of an
 *     otherwise-kept line) marks text Greenough's edition brackets as
 *     inauthentic. Mirrors this repo's Euclid `<del>` convention: EXCLUDED
 *     from the reading text, every occurrence logged individually to
 *     anomalies.json with its verbatim deleted wording. A line that is
 *     *entirely* `<del>` contributes no line to its Book's text at all
 *     (rather than an empty line); a partially-deleted line keeps its
 *     surviving text.
 *   - One `<gap extent="unknown" unit="lines" reason="lost"/>` (Book 12,
 *     after line 732) marks a genuine, well-known crux in the manuscript
 *     tradition (Turnus's sword shatters and something is lost from the
 *     text). Self-closing, no content to preserve; logged individually.
 *   - One `<note resp="Perseus" xml:lang="eng">...</note>` (Book 3, line
 *     250) is a Perseus-added English editorial aside embedded mid-line
 *     ("Aeneas narrates through line 715 in Book 3...") — not Virgil's
 *     Latin. Excluded from the reading text (jumped over like Euclid-en's
 *     `<note>`), logged individually; the line's real Latin text (after the
 *     note closes) is kept normally.
 *   - One `<choice><sic>gesture</sic> <corr>gestare</corr></choice>` (Book
 *     7, line 211). Unlike the reg/orig spelling choice in the companion
 *     English edition, this is not a linguistic variant: "gesture" is not a
 *     Latin word at all (a one-letter transcription slip for "gestare",
 *     the word Greenough's edition actually prints and that scans/parses
 *     correctly — "inclusit patribusque dedit gestare Latinis"). The
 *     corrected reading is kept as the passage text; the raw `<sic>` is
 *     logged verbatim to anomalies.json rather than silently dropped.
 *   - One self-closing `<quotation marks="none"/>` (a formatting directive,
 *     not content) — dropped without logging, same as `<milestone>`.
 *
 * Faithfulness rules (mirrors scripts/import-euclid, scripts/import-isagoge-la):
 * verbatim Latin reading text only — no spelling/orthography/wording fixes.
 * Only XML transport scaffolding (tags, print-pagination milestones, entity
 * decoding, whitespace collapse) is stripped; `<del>` exclusions and the one
 * `<choice>` resolution above are the only content-affecting decisions, and
 * both are logged individually and explained here and in about.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../import-virgil-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0690.phi003.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'aeneid-la');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

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
    /<div[^>]*>|<\/div>|<milestone\b[^>]*\/>|<l\b[^>]*>|<\/l>|<del>|<\/del>|<q\b[^>]*>|<\/q>|<hi\b[^>]*>|<\/hi>|<choice>|<\/choice>|<sic>|<\/sic>|<corr>|<\/corr>|<gap\b[^>]*\/>|<note\b[^>]*>|<quotation\b[^>]*\/>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'other'> = [];

  let currentBookNum = 0;
  let currentBookId = '';
  let currentBookLines: string[] = [];
  let currentBookFirstN: number | null = null;
  let currentBookLastN: number | null = null;
  let currentBookDelDropped = 0;
  let currentBookDelPartial = 0;
  let currentBookGaps = 0;
  let currentBookChoices = 0;
  let currentBookNoteDrops = 0;

  let inL = false;
  let currentLineNRaw = '';
  let lineBuf = '';
  let delSpansThisLine = 0;

  let delDepth = 0;
  const delBufStack: string[] = [];

  let inSic = false;
  let sicBuf = '';
  let pendingSic: string | null = null;

  let totalLines = 0;
  let totalDelSpans = 0;
  let totalGaps = 0;
  let totalNoteDrops = 0;
  let totalBooks = 0;

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (delDepth > 0) {
        delBufStack[delBufStack.length - 1] += free;
      } else if (inSic) {
        sicBuf += free;
      } else if (inL) {
        lineBuf += free;
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
        currentBookDelDropped = 0;
        currentBookDelPartial = 0;
        currentBookGaps = 0;
        currentBookChoices = 0;
        currentBookNoteDrops = 0;
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
        const summaryParts: string[] = [];
        if (currentBookDelDropped > 0) summaryParts.push(`${currentBookDelDropped} line(s) entirely omitted as editorially spurious (<del>)`);
        if (currentBookDelPartial > 0) summaryParts.push(`${currentBookDelPartial} line(s) partially trimmed of editorially-deleted wording`);
        if (currentBookGaps > 0) summaryParts.push(`${currentBookGaps} manuscript gap(s) marked by the source`);
        if (currentBookChoices > 0) summaryParts.push(`${currentBookChoices} sic/corr transcription choice`);
        if (currentBookNoteDrops > 0) summaryParts.push(`${currentBookNoteDrops} embedded Perseus editorial note dropped`);
        const passage: Passage = {
          n: '',
          text: passageText,
          ref: null,
          ...(summaryParts.length > 0 ? { anomaly: `${summaryParts.join('; ')} — see anomalies.json for detail.` } : {}),
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
    } else if (tok === '<milestone' || /^<milestone\b/.test(tok)) {
      // print-pagination "card" marker: zero-width transport scaffolding.
    } else if (/^<l\b/.test(tok)) {
      inL = true;
      lineBuf = '';
      delSpansThisLine = 0;
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
      if (cleaned.length > 0) {
        currentBookLines.push(cleaned);
      }
      // an entirely-<del> line cleans to empty text; deliberately contributes
      // no line to the Book's passage (rather than an empty '\n' entry) —
      // already individually logged on its </del> above. Whole-vs-partial is
      // classified HERE (using the line's final text), not at </del> time,
      // so a line where <del> comes before surviving trailing text (e.g.
      // Book 10 line 21) is still correctly counted as partial.
      if (delSpansThisLine > 0) {
        if (cleaned.length === 0) currentBookDelDropped += 1;
        else currentBookDelPartial += 1;
      }
      lineBuf = '';
    } else if (tok === '<del>') {
      delDepth += 1;
      delBufStack.push('');
    } else if (tok === '</del>') {
      const text = delBufStack.pop() ?? '';
      delDepth -= 1;
      delSpansThisLine += 1;
      totalDelSpans += 1;
      anomalies.push({
        where: `${currentBookId} l.${currentLineNRaw}`,
        note: `<del> excluded from the reading text (Greenough's edition brackets this as not Virgil's own work): "${excerpt(text)}"`,
      });
    } else if (tok === '<q' || /^<q\b/.test(tok) || tok === '</q>' || /^<hi\b/.test(tok) || tok === '</hi>') {
      // structural/typographic markup only: unwrap (tag dropped, inner text
      // already flows into lineBuf via the free-text capture above).
    } else if (tok === '<choice>' || tok === '</choice>') {
      if (tok === '</choice>') {
        if (pendingSic !== null) {
          currentBookChoices += 1;
          anomalies.push({
            where: `${currentBookId} l.${currentLineNRaw}`,
            note:
              `Source <choice>: literal transcription <sic>${JSON.stringify(pendingSic)}</sic> vs corrected reading kept as the passage text. ` +
              `"${pendingSic}" is not a Latin word (a one-letter transcription slip for "gestare", the word this edition actually ` +
              'prints and that scans correctly here); the corrected reading was kept rather than the sic, unlike this app\'s usual ' +
              'verbatim-only policy — see the module doc for the reasoning.',
          });
          pendingSic = null;
        }
      }
    } else if (tok === '<sic>') {
      inSic = true;
      sicBuf = '';
    } else if (tok === '</sic>') {
      inSic = false;
      pendingSic = cleanText(sicBuf);
      sicBuf = '';
    } else if (tok === '<corr>' || tok === '</corr>') {
      // corrected reading: no special handling — its text flows straight
      // into lineBuf via the ordinary free-text capture (inSic is false here).
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      currentBookGaps += 1;
      anomalies.push({
        where: `${currentBookId} l.${currentLineNRaw}`,
        note: `<gap extent="unknown" unit="lines" reason="lost"/> — the source marks a genuine lacuna in the manuscript tradition immediately after this line; nothing to preserve, no text fabricated.`,
      });
    } else if (/^<note\b/.test(tok)) {
      const closeAt = body.indexOf('</note>', tokenRe.lastIndex);
      if (closeAt < 0) fail(`<note> at ${currentBookId} l.${currentLineNRaw} is never closed`);
      const inner = body.slice(tokenRe.lastIndex, closeAt);
      totalNoteDrops += 1;
      currentBookNoteDrops += 1;
      anomalies.push({
        where: `${currentBookId} l.${currentLineNRaw}`,
        note: `<note resp="Perseus"> excluded (an English editorial aside added by the digitization, not Virgil's Latin): "${excerpt(inner)}"`,
      });
      tokenRe.lastIndex = closeAt + '</note>'.length;
      lastIndex = tokenRe.lastIndex;
    } else if (/^<quotation\b/.test(tok)) {
      // formatting directive only ("marks=\"none\""), zero-width, not content.
    }
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 12) fail(`expected exactly 12 Book divisions, got ${divisions.length}`);
  if (totalBooks !== 12) fail(`expected exactly 12 Book closures, got ${totalBooks}`);

  // divisions were pushed in document order already (book 1..12); confirm.
  const gotIds = divisions.map((d) => d.id);
  const wantIds = Array.from({ length: 12 }, (_, i) => bookIdOf(i + 1));
  if (JSON.stringify(gotIds) !== JSON.stringify(wantIds)) {
    fail(`Book divisions are not in order 1..12.\n  got:  ${gotIds.join(', ')}\n  want: ${wantIds.join(', ')}`);
  }

  if (totalDelSpans !== 61) fail(`expected 61 <del> spans (verified against the fetched source), got ${totalDelSpans}`);
  if (totalGaps !== 1) fail(`expected 1 <gap/> marker (verified against the fetched source), got ${totalGaps}`);
  if (totalNoteDrops !== 1) fail(`expected 1 embedded <note> (verified against the fetched source), got ${totalNoteDrops}`);

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'aeneid-la / reading text',
    note: `${totalDelSpans} <del> spans total (Greenough's edition brackets these as not Virgil's own — most famously Aeneid 2.567–588, the "Helen episode") were excluded from the reading text; every occurrence is logged individually above with its verbatim wording.`,
  });
  anomalies.push({
    where: 'aeneid-la / reading text',
    note: `${totalLines} <l> verse-line elements were parsed across the 12 books, matching the commonly-cited traditional total of 9,896 lines almost exactly (${totalLines > 9896 ? `${totalLines - 9896} more` : `${9896 - totalLines} fewer`}). Two small, largely offsetting effects of this specific digitization explain the residual gap between that total and each book's own last-printed-line-number sum (also 9,896): 34 lines carry an extra <l part="Y"> continuation element sharing its traditional verse number with the previous line (a genuine Virgilian incomplete "half-line", each still kept as its own line of text — see the module doc), while a similar number of traditional line numbers have no standalone <l> element of their own in this source. Neither reflects any content dropped by this importer — every <l> element actually present in the source is included in the reading text (subject only to the documented <del> exclusions). Division.ref uses the first/last <l n="…"> actually found in each book, not a fabricated round number.`,
  });
  anomalies.push({
    where: 'aeneid-la / passage & division refs',
    note: 'This TEI carries no <pb> page markers, so every Passage.ref is null; Division.ref gives each book\'s own printed verse-line range instead (first–last <l n="…"> found in that book).',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'aeneid-la',
    language: 'la',
    divisions,
  };

  const PROVENANCE =
    'Perseus Digital Library / Open Greek and Latin, canonical-latinLit GitHub repository ' +
    '(github.com/PerseusDL/canonical-latinLit), file data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml, ' +
    'CTS urn:cts:latinLit:phi0690.phi003.perseus-lat2. TEI XML digitization CC BY-SA 4.0.';
  const LICENSE = 'Latin text (Greenough, 1881/1900) is public domain. TEI XML digitization/markup: CC BY-SA 4.0 (Perseus Digital Library / Open Greek and Latin).';

  const about = {
    workId: 'aeneid-la',
    title: 'Aeneis',
    author: 'Publius Vergilius Maro (Virgil)',
    language: 'la' as const,
    edition: "J. B. Greenough, ed., Bucolics, Aeneid, and Georgics of Vergil (Boston: Ginn & Co., 1900 [text orig. 1881])",
    editor: 'James Bradstreet Greenough',
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
          'This edition preserves Virgil\'s Latin hexameter verse line-by-line, one Passage per book, with each ' +
            'verse line on its own line of text rather than collapsed into a single paragraph.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The reading text is J. B. Greenough\'s Latin edition (Ginn & Co., 1900; text originally 1881), as ' +
            'digitized by the Perseus Project. A small number of lines the edition itself brackets as later, ' +
            'inauthentic interpolations are excluded from the reading text — see "Known gaps & anomalies" below ' +
            'and anomalies.json for every individual case.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Fetched from the PerseusDL/canonical-latinLit GitHub repository (an Open Greek and Latin / Perseus ' +
            'Digital Library project), file phi0690/phi003/phi0690.phi003.perseus-lat2.xml. The raw TEI XML is ' +
            'cached under scripts/import-virgil-aeneid-la/raw/ so the importer never needs to re-fetch the source ' +
            'to rebuild work.json.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the 12 books is a single top-level Division (book-1 .. book-12) holding exactly one Passage: ' +
            'its full verse text, one line per array element joined with a newline, in document order. There is ' +
            'no chapter/section level below the book in this schema — Virgil\'s finer citation unit is simply the ' +
            'verse line, which this schema does not model as its own Division/Passage.',
          'Division.ref gives each book\'s own printed line range (e.g. "1–756" for Book 1), taken from the ' +
            'first and last <l n="…"> actually encountered in that book\'s source markup, not a fabricated round ' +
            'number.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Every irregularity below is documented individually in anomalies.json with a machine-readable ' +
            '{where, note} entry.',
          '61 <del> spans mark text Greenough\'s edition brackets as later interpolation, not Virgil\'s own work ' +
            '— most notably the 22-line "Helen episode" (2.567–588), long debated by editors. These are excluded ' +
            'from the reading text (54 whole lines, 7 partial lines), matching this app\'s existing Euclid <del> ' +
            'convention; every deleted line\'s wording is preserved verbatim in anomalies.json even though it is ' +
            'not shown in the reading passage.',
          'One <gap extent="unknown" unit="lines" reason="lost"/> (Book 12, after line 732) marks a genuine, ' +
            'well-known crux in the manuscript tradition, immediately after Turnus\'s sword shatters in his duel ' +
            'with Aeneas.',
          'One embedded <note resp="Perseus" xml:lang="eng"> (Book 3, line 250) is a Perseus-added English aside ' +
            'about the poem\'s narrative structure, not part of Virgil\'s Latin; excluded from the reading text.',
          'One <choice><sic>gesture</sic><corr>gestare</corr></choice> (Book 7, line 211): "gesture" is not a ' +
            'Latin word — a one-letter digitization slip for "gestare", the word this edition actually prints. ' +
            'The corrected reading is kept as the passage text (the only place in either Aeneid corpus where a ' +
            'non-<del> reading is not simply the source\'s own literal characters); the raw sic is logged in full.',
          'This edition\'s actual <l> element count (9,897) matches the traditional printed total of 9,896 lines ' +
            'commonly cited for the Aeneid almost exactly — see anomalies.json for the corpus-level note on the ' +
            'two small, offsetting reasons for the residual difference (34 kept half-line continuations vs. a ' +
            'similar number of traditional numbers with no standalone element in this digitization). Division.ref ' +
            'is always derived from this source\'s own line numbers, never the traditional total.',
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
    `\n  12 books  ${totalLines} <l> elements parsed  ${totalDelSpans} <del> spans  ${totalGaps} gap(s)  ` +
      `${totalNoteDrops} note(s) dropped  ${totalChars} total passage chars\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-virgil-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
