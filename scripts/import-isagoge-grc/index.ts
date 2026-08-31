/**
 * Porphyry, *Isagoge* - Greek text (ed. Adolf Busse, Berlin: Reimer 1887,
 * Commentaria in Aristotelem Graeca IV.1). Run-once ingestion pipeline.
 *
 *   npm run import:isagoge-grc
 *
 * Reads scripts/import-isagoge-grc/raw/tlg2034.tlg006.opp-grc1.xml (already in
 * the repo; nothing is downloaded) and writes:
 *   data/isagoge-grc/work.json       - the GenericWork (27 divisions, one level deep)
 *   data/isagoge-grc/about.json      - provenance / licence metadata
 *   data/isagoge-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:isagoge`.
 *
 * Faithfulness rules (mirrors scripts/import-summa):
 *   - verbatim original-language reading text only; no accent / spelling /
 *     orthography fixes, nothing discarded or silently corrected.
 *   - <note type="footnote"> (apparatus criticus) is dropped from the READING
 *     text but counted in the report.
 *   - <note type="marginal"> (Brandis pagination) is stripped from the reading
 *     text but recorded; Busse pagination is the only canonical scheme here.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS } from '../import-isagoge-shared/sections.ts';
import {
  GRC_ABOUT_SECTIONS,
  GRC_LICENSE,
  GRC_PROVENANCE,
} from '../import-isagoge-shared/aboutText.ts';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/isagoge-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg2034.tlg006.opp-grc1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'isagoge-grc');

/** A heading <p> begins with "Περὶ " and is short (all real rubrics are <= 60 chars). */
const HEADING_RE = /^Περὶ\s/u;
const HEADING_MAX_LEN = 90;

/** The section whose printed heading carries the source misspelling "ἰδίιου". */
const IDIIOU_MARKER = 'ἰδίιου';

interface RawParagraph {
  /** verbatim reading text: entities decoded, apparatus + marginalia removed, ws collapsed */
  text: string;
  /** Busse page current at this paragraph's first character */
  startPage: string;
  /** Busse page current at this paragraph's last character */
  endPage: string;
}

interface WalkResult {
  paragraphs: RawParagraph[];
  footnoteCount: number;
  marginalCount: number;
  marginalTexts: string[];
  pbValues: string[];
}

/**
 * Single-pass tokeniser over the one <div type="textpart" subtype="chapter">.
 * Tracks the current Busse page (<pb n>). Line-level tracking (<lb n>) is
 * deliberately NOT used for refs - see note in main().
 */
function walkChapter(xml: string): WalkResult {
  const bodyStart = xml.indexOf('<body>');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) throw new Error('no <body> in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const chOpen = body.indexOf('<div type="textpart"');
  if (chOpen < 0) throw new Error('no <div type="textpart" ...> chapter div found');
  const chClose = body.indexOf('</div>', chOpen);
  if (chClose < 0) throw new Error('chapter <div> is not closed');
  const chapter = body.slice(chOpen, chClose);

  const tokenRe =
    /<pb\s+n="([^"]*)"\s*\/>|<lb\s+n="[^"]*"\s*\/>|<note\s+type="(marginal|footnote)"\s*>([\s\S]*?)<\/note>|<head>[\s\S]*?<\/head>|<p>|<\/p>|<[^>]+>/g;

  let curPage = '';
  let inP = false;
  let buf = '';
  let pStartPage = '';
  const paragraphs: RawParagraph[] = [];
  let footnoteCount = 0;
  let marginalCount = 0;
  const marginalTexts: string[] = [];
  const pbValues: string[] = [];

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(chapter))) {
    // free text between the previous token and this one
    if (inP && m.index > lastIndex) buf += chapter.slice(lastIndex, m.index);
    lastIndex = tokenRe.lastIndex;

    const tok = m[0];
    if (m[1] !== undefined) {
      // <pb n="N"/>
      curPage = m[1];
      pbValues.push(curPage);
      if (inP) buf += ' ';
    } else if (m[2] === 'footnote') {
      footnoteCount += 1;
      if (inP) buf += ' ';
    } else if (m[2] === 'marginal') {
      marginalCount += 1;
      marginalTexts.push(cleanText(m[3] ?? ''));
      if (inP) buf += ' ';
    } else if (tok === '<p>') {
      inP = true;
      buf = '';
      pStartPage = curPage;
    } else if (tok === '</p>') {
      inP = false;
      paragraphs.push({ text: cleanText(buf), startPage: pStartPage, endPage: curPage });
    } else if (tok.startsWith('<lb')) {
      if (inP) buf += ' ';
    }
    // any other tag (<head>...</head>, stray tags): ignored
  }

  return { paragraphs, footnoteCount, marginalCount, marginalTexts, pbValues };
}

function pageRef(page: string): string {
  return page ? `Busse p. ${page}` : 'Busse p. ?';
}

function spanRef(pages: string[]): string | null {
  const nums = pages.filter((p) => p !== '');
  if (nums.length === 0) return null;
  const lo = nums[0];
  const hi = nums[nums.length - 1];
  return lo === hi ? `Busse p. ${lo}` : `Busse pp. ${lo}–${hi}`;
}

interface Anomaly {
  where: string;
  note: string;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');

  process.stdout.write(`parsing ${RAW_XML} ...\n`);
  const walk = walkChapter(xml);
  process.stdout.write(
    `  ${walk.paragraphs.length} <p>  ${walk.pbValues.length} <pb>  ` +
      `${walk.footnoteCount} apparatus <note>  ${walk.marginalCount} marginal <note>\n`,
  );

  const nonEmpty = walk.paragraphs.filter((p) => p.text.length > 0);
  if (nonEmpty.length !== walk.paragraphs.length) {
    process.stdout.write(
      `  note: ${walk.paragraphs.length - nonEmpty.length} <p> were empty after cleaning (skipped)\n`,
    );
  }

  // --- segment paragraphs into praefatio + 26 sections ------------------------
  const isHeading = (t: string): boolean => HEADING_RE.test(t) && t.length <= HEADING_MAX_LEN;

  const headingIdx: number[] = [];
  nonEmpty.forEach((p, i) => {
    if (isHeading(p.text)) headingIdx.push(i);
  });

  if (headingIdx.length !== 26) {
    process.stderr.write(
      `STOP: expected 26 section headings, detected ${headingIdx.length}.\n` +
        headingIdx.map((i) => `  [${i}] ${nonEmpty[i].text}`).join('\n') +
        '\n',
    );
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  // praefatio: everything before the first heading
  const prefacePassages: Passage[] = nonEmpty.slice(0, headingIdx[0]).map((p) => ({
    n: '',
    text: p.text,
    ref: pageRef(p.startPage),
  }));
  if (prefacePassages.length === 0) {
    process.stderr.write('STOP: praefatio has no passages (no text before first heading).\n');
    process.exit(1);
  }
  divisions.push({
    id: SECTIONS[0].id,
    number: SECTIONS[0].number,
    ref: spanRef([
      ...nonEmpty.slice(0, headingIdx[0]).map((p) => p.startPage),
      ...nonEmpty.slice(0, headingIdx[0]).map((p) => p.endPage),
    ]),
    sourceHeading: null,
    editorialTitle: SECTIONS[0].en,
    children: [],
    passages: prefacePassages,
  });

  // 26 numbered sections
  for (let h = 0; h < headingIdx.length; h++) {
    const meta = SECTIONS[h + 1];
    const headP = nonEmpty[headingIdx[h]];
    const from = headingIdx[h] + 1;
    const to = h + 1 < headingIdx.length ? headingIdx[h + 1] : nonEmpty.length;
    const body = nonEmpty.slice(from, to);

    if (body.length === 0) {
      process.stderr.write(`STOP: section ${meta.id} (${meta.number}) has no passages.\n`);
      process.exit(1);
    }

    const hasIdiiou = headP.text.includes(IDIIOU_MARKER);
    const passages: Passage[] = body.map((p, i) => {
      const passage: Passage = { n: '', text: p.text, ref: pageRef(p.startPage) };
      if (hasIdiiou && i === 0) {
        passage.anomaly =
          "source spelling 'ἰδίιου' (for ἰδίου) preserved verbatim in this division's heading";
      }
      return passage;
    });

    if (hasIdiiou) {
      anomalies.push({
        where: `isagoge-grc / division ${meta.id} (${meta.number}) / sourceHeading`,
        note: `printed heading reads "${headP.text}" - the form 'ἰδίιου' (for ἰδίου) is a source misspelling, preserved verbatim`,
      });
    }

    divisions.push({
      id: meta.id,
      number: meta.number,
      ref: spanRef([...body.map((p) => p.startPage), ...body.map((p) => p.endPage)]),
      sourceHeading: headP.text,
      editorialTitle: meta.en,
      children: [],
      passages,
    });
  }

  // --- corpus-level anomalies ----------------------------------------------
  anomalies.push({
    where: 'isagoge-grc / passage & division refs',
    note:
      `ref is Busse PAGE level only. The source <lb n> line markers are duplicated ` +
      `(each line number is emitted twice) and non-monotonic around headings, which makes ` +
      `per-line refs unreliable; downgraded to "Busse p. N" / "Busse pp. A–B" per the ` +
      `importer spec fallback.`,
  });
  anomalies.push({
    where: 'isagoge-grc / reading text',
    note: `${walk.footnoteCount} <note type="footnote"> apparatus-criticus notes were dropped from the reading text.`,
  });
  anomalies.push({
    where: 'isagoge-grc / reading text',
    note:
      `${walk.marginalCount} <note type="marginal"> notes carrying Brandis pagination ` +
      `(older standard, e.g. ${walk.marginalTexts.slice(0, 6).join(', ')} ...) were stripped from ` +
      `the reading text. Busse pagination is canonical here and the two are not conflated.`,
  });
  anomalies.push({
    where: 'isagoge-grc / reading text',
    note:
      `The First1KGreek transcription of Busse's text contains uncorrected OCR-level ` +
      `irregularities (e.g. stray vertical bars "|", stray capitals, misspellings such as ` +
      `'ἐπναβεβηκὸς', 'Κοτνὸν', 'κινεὶσθαι'). All are preserved verbatim; none were corrected.`,
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'isagoge-grc',
    language: 'grc',
    divisions,
  };

  const about = {
    workId: 'isagoge-grc',
    title: 'Isagoge',
    author: 'Porphyry',
    language: 'grc',
    edition: 'Busse 1887',
    editor: 'Adolf Busse',
    provenance: GRC_PROVENANCE,
    license: GRC_LICENSE,
    sections: GRC_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary --------------------------------------------------
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce(
    (n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0),
    0,
  );
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(
      `  ${(d.number ?? '-').padEnd(6)} ${d.id.padEnd(15)} ` +
        `${String(d.passages.length).padStart(2)} passage(s)  heading=${JSON.stringify(d.sourceHeading)}\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions  ${totalPassages} passages  ${totalChars} chars\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:isagoge` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
