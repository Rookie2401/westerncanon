/**
 * Porphyry, *Isagoge* - Latin translation by Boethius (ed. M. Dal Pra, 1969).
 * Run-once ingestion pipeline.
 *
 *   npm run import:isagoge-la
 *
 * Reads scripts/import-isagoge-la/raw/isagoge-wikisource.json (already in the
 * repo; the result of the MediaWiki `action=parse&prop=wikitext` API for the
 * Latin Wikisource page "Isagoge"). Writes:
 *   data/isagoge-la/work.json       - the GenericWork (27 divisions, one level deep)
 *   data/isagoge-la/about.json      - provenance / licence metadata
 *   data/isagoge-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:isagoge`.
 *
 * Faithfulness rules (mirrors scripts/import-summa): verbatim Latin reading text
 * only; no accent / spelling / orthography fixes; nothing discarded or silently
 * corrected. Only wiki-transport scaffolding is removed ({{titulus2}} template,
 * the leading <center> block, the leading "N. " paragraph number). Editorial
 * angle-bracket supplements printed in the edition (e.g. "<quod>") are kept.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS } from '../import-isagoge-shared/sections.ts';
import {
  LA_ABOUT_SECTIONS,
  LA_LICENSE,
  LA_PROVENANCE,
} from '../import-isagoge-shared/aboutText.ts';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/isagoge-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'isagoge-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'isagoge-la');

/** `== <roman>. <rubric> ==` heading line. Two headings have irregular `==  XIX.` spacing. */
const HEADING_RE = /^==\s*([IVXLCDM]+)\.\s*(.+?)\s*==[ \t]*$/gm;

/** Leading paragraph number `N. ` in the source. */
const PARA_NUM_RE = /^(\d+)\.\s+([\s\S]*)$/;

/** Editorial angle-bracket supplement, e.g. `<quod>` - kept verbatim, flagged. */
const ANGLE_SUPPLEMENT_RE = /<[a-zA-Z]+>/g;

interface Anomaly {
  where: string;
  note: string;
}

function splitParagraphs(block: string): string[] {
  return block
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const raw = JSON.parse(readFileSync(RAW_JSON, 'utf8')) as {
    parse?: { wikitext?: string | { '*'?: string } };
  };
  const wt = raw.parse?.wikitext;
  const wikitext = typeof wt === 'string' ? wt : wt?.['*'];
  if (!wikitext) {
    process.stderr.write('STOP: could not find .parse.wikitext string in the raw JSON.\n');
    process.exit(1);
    return;
  }

  process.stdout.write(`parsing ${RAW_JSON} ...\n  wikitext ${wikitext.length} chars\n`);

  // --- strip wiki-transport scaffolding ------------------------------------
  let text = wikitext;
  const beforeTitulus = text.length;
  text = text.replace(/\{\{titulus2[\s\S]*?\n\}\}/, '');
  if (text.length === beforeTitulus) {
    process.stderr.write('STOP: {{titulus2 ...}} template not found / not stripped.\n');
    process.exit(1);
  }
  const beforeCenter = text.length;
  text = text.replace(/<center>[\s\S]*?<\/center>/, '');
  if (text.length === beforeCenter) {
    process.stderr.write('STOP: leading <center>...</center> block not found / not stripped.\n');
    process.exit(1);
  }

  // --- locate the 26 section headings ------------------------------------
  const headings: { idx: number; len: number; roman: string; rubric: string }[] = [];
  let hm: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;
  while ((hm = HEADING_RE.exec(text))) {
    headings.push({ idx: hm.index, len: hm[0].length, roman: hm[1], rubric: hm[2].trim() });
  }

  if (headings.length !== 26) {
    process.stderr.write(
      `STOP: expected 26 section headings, found ${headings.length}.\n` +
        headings.map((h) => `  ${h.roman}. ${h.rubric}`).join('\n') +
        '\n',
    );
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const makePassages = (block: string, whereBase: string): Passage[] => {
    const out: Passage[] = [];
    for (const para of splitParagraphs(block)) {
      const mm = PARA_NUM_RE.exec(para);
      const n = mm ? mm[1] : '';
      const bodyText = mm ? mm[2] : para;
      const text = cleanText(bodyText);
      const passage: Passage = { n, text, ref: null };

      const supplements = text.match(ANGLE_SUPPLEMENT_RE);
      if (supplements) {
        passage.anomaly = `editorial angle-bracket supplement ${supplements.join(', ')} preserved verbatim`;
        anomalies.push({
          where: `${whereBase} / passage ${n === '' ? '(unnumbered)' : n}`,
          note: `contains editorial angle-bracket supplement ${supplements.join(', ')} from the edition; kept verbatim (not markup)`,
        });
      }
      out.push(passage);
    }
    return out;
  };

  // preface: text before the first heading
  const prefaceBlock = text.slice(0, headings[0].idx);
  const prefacePassages = makePassages(prefaceBlock, 'isagoge-la / praefatio');
  if (prefacePassages.length === 0) {
    process.stderr.write('STOP: praefatio is empty (no paragraphs before the first heading).\n');
    process.exit(1);
  }
  divisions.push({
    id: SECTIONS[0].id,
    number: SECTIONS[0].number,
    ref: null,
    sourceHeading: null,
    editorialTitle: SECTIONS[0].en,
    children: [],
    passages: prefacePassages,
  });

  // 26 numbered sections
  for (let h = 0; h < headings.length; h++) {
    const meta = SECTIONS[h + 1];
    const head = headings[h];
    const start = head.idx + head.len;
    const end = h + 1 < headings.length ? headings[h + 1].idx : text.length;
    const passages = makePassages(text.slice(start, end), `isagoge-la / ${meta.id} (${meta.number})`);

    if (passages.length === 0) {
      process.stderr.write(`STOP: section ${meta.id} (${meta.number}) has no passages.\n`);
      process.exit(1);
    }

    // cross-check the printed roman numeral against the canonical table
    if (head.roman !== meta.number) {
      anomalies.push({
        where: `isagoge-la / ${meta.id}`,
        note: `source heading numeral "${head.roman}" does not match canonical "${meta.number}" for this position`,
      });
    }

    const unnumbered = passages.filter((p) => p.n === '').length;
    if (unnumbered > 0) {
      anomalies.push({
        where: `isagoge-la / ${meta.id} (${meta.number})`,
        note: `${unnumbered} paragraph(s) in this section carry no printed number in the source; Passage.n set to '' for those`,
      });
    }

    divisions.push({
      id: meta.id,
      number: meta.number,
      ref: null,
      sourceHeading: head.rubric,
      editorialTitle: meta.en,
      children: [],
      passages,
    });
  }

  anomalies.push({
    where: 'isagoge-la / all refs',
    note:
      'This source carries no Busse pagination or line numbering. Division.ref and ' +
      "Passage.ref are null throughout; the citation scheme for this work is 'section' " +
      '(division number + paragraph number).',
  });
  anomalies.push({
    where: 'isagoge-la / division scheme',
    note:
      'Divided as praefatio + 26 capitula. The reference edition for the Latin division is Aristoteles ' +
      'Latinus I.6-7 (ed. Minio-Paluello & Dod, 1966, pp. 5-31), which was NOT available to re-collate for ' +
      'this build. Two witnesses that were checked - Busse\'s Greek capitula (CAG IV.1) and a Busse-paginated ' +
      'text of Boethius\' translation - both use the same praefatio+26 scheme, so it is retained. A "24-section" ' +
      'division was queried but is not corroborated by the available witnesses.',
  });
  anomalies.push({
    where: 'isagoge-la / capitula wording',
    note:
      'The Latin capitula follow this recension\'s wording (e.g. "De communitatibus generis et differentiae", ' +
      '"De differentiis generis et differentiae", "De communibus proprii et inseparabilis accidentis"). Busse\'s ' +
      'parallel Latin prints "De communibus ..."/"De propriis ..." without "inseparabilis". These are editorial ' +
      'headings in every edition; wording kept verbatim as transmitted.',
  });
  anomalies.push({
    where: 'isagoge-la / orthography',
    note:
      'No u/v or i/j regularisation. "De genere" para 3 reads "uniuscujusque" (j) where the rest of the text ' +
      'has "uniuscuiusque"; the source inconsistency is preserved verbatim.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'isagoge-la',
    language: 'la',
    divisions,
  };

  const about = {
    workId: 'isagoge-la',
    title: 'Isagoge',
    author: 'Porphyry',
    language: 'la',
    edition: 'ed. M. Dal Pra, 1969',
    translator: 'Boethius',
    provenance: LA_PROVENANCE,
    license: LA_LICENSE,
    sections: LA_ABOUT_SECTIONS,
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
