/**
 * Porphyry, *Isagoge* - English translation by Octavius Freire Owen (1853),
 * printed as an appendix to his Organon of Aristotle (Bohn's Classical
 * Library). Run-once ingestion pipeline.
 *
 *   npm run import:isagoge-en
 *
 * Reads scripts/import-isagoge-en/raw/isagoge-en-wikisource.json (already in
 * the repo; the result of the MediaWiki `action=parse&prop=text` API for the
 * English Wikisource page "Organon (Owen)/The Introduction of Porphyry").
 * That page is PAGE-SCAN TRANSCLUDED, so `prop=wikitext` returns only
 * `<pages index="..." from=X to=Y />` markers, not real text - the cached
 * JSON here is the RENDERED HTML instead (`.parse.text['*']`), parsed with
 * jsdom. Writes:
 *   data/isagoge-en/work.json       - the GenericWork (17 divisions, one level deep)
 *   data/isagoge-en/about.json      - provenance / licence metadata
 *   data/isagoge-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:isagoge-en`.
 *
 * Division scheme: this edition does NOT share the praefatio+26-capitula
 * scheme used by the bundled Greek (isagoge-grc) and Latin (isagoge-la)
 * editions (see scripts/import-isagoge-shared/sections.ts) - Owen's 1853
 * translation is chaptered as 17 numbered chapters with no separate preface
 * (verified directly against the rendered HTML body, not assumed from the
 * table of contents). See data/isagoge-en/types.ts for the resulting
 * `ch-1'..'ch-17` scheme.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-la, scripts/import-summa):
 * verbatim English reading text only; no wording "fixes", no modernisation of
 * Owen's 1853 prose. Only HTML/wiki transport scaffolding is stripped: the
 * page header block, the table of contents, footnote/citation apparatus
 * (numbered superscript markers and their endnote text, plus the printed
 * asterisk footnote marker that a marginal sidenote was attached to),
 * marginal running-head "sidenotes", inline page-number anchors, and
 * TemplateStyles/style/link scaffolding. Two single stray characters that are
 * unambiguously wiki-transport noise (not English prose) are also removed -
 * see the "stray marks" anomaly below. Nothing else is discarded, corrected,
 * or reworded; every irregularity found in the actual printed prose (not
 * transport scaffolding) is preserved verbatim and flagged in anomalies.json.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/isagoge-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'isagoge-en-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'isagoge-en');

/** `Chap. <roman>.<dash><title>` heading text, after apparatus is stripped from the heading element. */
const HEADING_RE = /^Chap\.\s*([IVXLCDM]+)\.\s*[-—]+\s*(.*)$/;

/** Elements that are pure transport apparatus wherever they occur inside a paragraph. */
const APPARATUS_SELECTOR = 'sup.reference, span.wst-sidenote, span.pagenum, link, style';

interface Anomaly {
  where: string;
  note: string;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const raw = JSON.parse(readFileSync(RAW_JSON, 'utf8')) as {
    parse?: { text?: string | { '*'?: string } };
  };
  const t = raw.parse?.text;
  const html = typeof t === 'string' ? t : t?.['*'];
  if (!html) {
    process.stderr.write('STOP: could not find .parse.text string in the raw JSON.\n');
    process.exit(1);
    return;
  }

  process.stdout.write(`parsing ${RAW_JSON} ...\n  html ${html.length} chars\n`);

  const dom = new JSDOM(`<div id="root">${html}</div>`);
  const document = dom.window.document;
  const root = document.getElementById('root');
  if (!root) {
    process.stderr.write('STOP: jsdom failed to parse the cached HTML.\n');
    process.exit(1);
    return;
  }

  // --- locate the main transcluded page body -------------------------------
  // The rendered page has two `div.prp-pages-output` blocks: [0] is the title
  // block + all 17 chapters, [1] is the endnote/footnote apparatus (reflist).
  // We only read from [0]; [1] is never consulted for reading text.
  const bodies = root.querySelectorAll('div.prp-pages-output');
  if (bodies.length < 1) {
    process.stderr.write('STOP: no div.prp-pages-output found in the rendered HTML.\n');
    process.exit(1);
    return;
  }
  const body = bodies[0];

  const anomalies: Anomaly[] = [];

  // --- verify the table-of-contents duplicate-heading question -------------
  // The source page's own "Contents" block lists "Chap. II.--Of the Nature of
  // Genus and Species." twice in a row. Confirm directly against the body
  // (not the TOC) whether this is a real second chapter or a TOC-only glitch.
  const tocParagraphs = Array.from(root.querySelectorAll('p')).filter((p) =>
    /^Chap\.\s*I\.\s*[-—]/.test(p.textContent?.trim() ?? ''),
  );
  const tocText = tocParagraphs[0]?.textContent ?? '';
  const tocChapIICount = (tocText.match(/Chap\.\s*II\.\s*[-—]/g) ?? []).length;

  // --- walk the body's direct children, splitting on chapter headings ------
  const HEADING_DIV_RE = /^Chap\./;
  const kids = Array.from(body.children);

  interface RawChapter {
    number: string;
    sourceHeading: string;
    paragraphs: { text: string; strayMarksRemoved: string[] }[];
  }
  const chapters: RawChapter[] = [];

  const cleanElementText = (el: JSDOMElement): string => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(APPARATUS_SELECTOR).forEach((n) => n.remove());
    return cleanText(clone.textContent ?? '');
  };

  for (const k of kids) {
    const isHeadingDiv =
      k.tagName === 'DIV' && k.className.includes('wst-center') && HEADING_DIV_RE.test(k.textContent?.trim() ?? '');
    if (isHeadingDiv) {
      const headingText = cleanElementText(k);
      const m = HEADING_RE.exec(headingText);
      if (!m) {
        process.stderr.write(`STOP: chapter heading text does not match the expected pattern: ${JSON.stringify(headingText)}\n`);
        process.exit(1);
        return;
      }
      chapters.push({ number: m[1], sourceHeading: m[2].trim(), paragraphs: [] });
      continue;
    }
    if (k.tagName === 'P') {
      if (chapters.length === 0) continue; // title-page paragraph, before Chap. I - not reading text
      let raw = cleanElementText(k);
      if (raw.length === 0) continue;

      // Strip the two known categories of stray, non-prose transport marks:
      //  - a literal "*" footnote call-out whose target sidenote was already
      //    removed by APPARATUS_SELECTOR above (the sidenote text itself,
      //    e.g. "* Kant. Sir W. Hamilton, ..." lived in the removed span; the
      //    orphaned "*" call-out mark is left behind in the flowing text).
      //  - a single stray "}" character with no matching "{" anywhere in the
      //    text, directly abutting a removed sidenote span - almost certainly
      //    leaked wiki/template markup, not part of Owen's prose.
      const strayMarksRemoved: string[] = [];
      if (raw.includes('*')) {
        strayMarksRemoved.push('*');
        raw = raw.replace(/\*/g, '');
      }
      if (raw.includes('}')) {
        strayMarksRemoved.push('}');
        raw = raw.replace(/\}/g, '');
      }
      raw = cleanText(raw);

      chapters[chapters.length - 1].paragraphs.push({ text: raw, strayMarksRemoved });
    }
  }

  if (chapters.length !== 17) {
    process.stderr.write(
      `STOP: expected 17 chapters, found ${chapters.length}.\n` +
        chapters.map((c) => `  ${c.number}. ${c.sourceHeading}`).join('\n') +
        '\n',
    );
    process.exit(1);
    return;
  }

  // roman numerals must be sequential I..XVII with no gaps or repeats
  const EXPECTED_ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
  chapters.forEach((c, i) => {
    if (c.number !== EXPECTED_ROMANS[i]) {
      process.stderr.write(
        `STOP: chapter at position ${i} has numeral ${JSON.stringify(c.number)}, expected ${JSON.stringify(EXPECTED_ROMANS[i])}.\n`,
      );
      process.exit(1);
    }
  });

  // --- build divisions -------------------------------------------------------
  const divisions: Division[] = chapters.map((c, i) => {
    if (c.paragraphs.length === 0) {
      process.stderr.write(`STOP: chapter ${c.number} has no paragraphs.\n`);
      process.exit(1);
    }
    const passages: Passage[] = c.paragraphs.map((p) => {
      const passage: Passage = { n: '', text: p.text, ref: null };
      if (p.strayMarksRemoved.length > 0) {
        passage.anomaly = `stray transport mark(s) removed: ${p.strayMarksRemoved.join(', ')}`;
      }
      return passage;
    });
    return {
      id: `ch-${i + 1}`,
      number: c.number,
      ref: null,
      sourceHeading: c.sourceHeading,
      editorialTitle: null,
      children: [],
      passages,
    };
  });

  // --- known-gap: Chapter IV, missing word ---------------------------------
  const ch4 = divisions[3];
  if (ch4?.id !== 'ch-4') {
    process.stderr.write('STOP: expected divisions[3] to be ch-4 for the known-gap check.\n');
    process.exit(1);
  } else if (!ch4.passages.some((p) => p.text.includes('since if any thing be a it is capable of neighing'))) {
    process.stderr.write(
      'STOP: the expected Chapter IV wording around the dropped-word gap was not found verbatim; re-check the source before proceeding.\n',
    );
    process.exit(1);
  } else {
    const p = ch4.passages.find((pp) => pp.text.includes('since if any thing be a it is capable of neighing'))!;
    p.anomaly = (p.anomaly ? p.anomaly + '; ' : '') + 'apparent dropped word in the source transcription (see anomalies.json)';
  }

  // --- anomalies -------------------------------------------------------------
  anomalies.push({
    where: 'isagoge-en / division scheme',
    note:
      'Owen\'s 1853 translation is chaptered as 17 numbered chapters (Chap. I-XVII) with no separate ' +
      'preface: Chapter I ("Object of the writer, in the present Introduction") itself serves as the ' +
      'introduction, confirmed directly against the rendered page body. This is a genuinely different ' +
      'scheme from the Busse-derived praefatio+26-capitula division shared by the bundled Greek ' +
      '(isagoge-grc) and Latin (isagoge-la) editions; the three division trees are NOT aligned 1:1, ' +
      'matching how this repo already treats independently-divided editions of the same work elsewhere.',
  });
  anomalies.push({
    where: 'isagoge-en / table of contents',
    note:
      `The source page's own "Contents" block lists "Chap. II.--Of the Nature of Genus and Species." ` +
      `${tocChapIICount} times in a row (a transcription glitch in the TOC listing itself). The document ` +
      'body contains exactly one Chapter II heading and one Chapter II content block, confirmed by walking ' +
      'the rendered page body directly. No duplicate chapter was created; the TOC-only duplication is not ' +
      'reflected in the imported divisions.',
  });
  anomalies.push({
    where: 'isagoge-en / all refs',
    note:
      'This source carries no printed paragraph numbers and no citation apparatus beyond page-scan images ' +
      "the importer does not map to a ref field. Division.ref and Passage.ref are null throughout, and " +
      "Passage.n is '' throughout; the citation scheme for this work is by chapter (roman numeral) plus the " +
      'printed chapter title. (The underlying Wikisource page transcription does carry inline page-scan ' +
      'anchors for O. F. Owen\'s Organon of Aristotle Vol. 2 (1853), pp. 609-633 - these were not mapped to ' +
      'a structured reference field in this import.)',
  });
  anomalies.push({
    where: 'isagoge-en / apparatus stripped',
    note:
      'Numbered footnote/endnote markers (superscript brackets, e.g. "[6]") and their endnote text, and the ' +
      'marginal running-head "sidenotes" printed beside the main text in the 1853 edition, were removed as ' +
      'transport apparatus, matching how footnote apparatus is handled in the Greek and Latin Isagoge ' +
      'importers. None of this apparatus is reading text from Owen\'s translation.',
  });
  const strayMarkCount = divisions.reduce(
    (n, d) => n + d.passages.filter((p) => p.anomaly?.includes('stray transport mark')).length,
    0,
  );
  anomalies.push({
    where: 'isagoge-en / stray transport marks',
    note:
      `${strayMarkCount} passage(s) contained a stray "*" and/or "}" character with no corresponding content ` +
      '(a "*" footnote call-out orphaned once its target sidenote was stripped as apparatus, in Chapters I ' +
      'and II; and a single stray "}" character directly abutting a stripped sidenote in Chapter II, with no ' +
      'matching "{" anywhere in the text - almost certainly leaked wiki/template markup rather than part of ' +
      'Owen\'s prose). Both were removed as transport noise, not content, and are flagged per-passage via ' +
      "Passage.anomaly.",
  });
  anomalies.push({
    where: 'isagoge-en / Chapter IV, apparent dropped word',
    note:
      'The source transcription reads "...since if any thing be a it is capable of neighing, and if any ' +
      'thing be capable of neighing it is a horse." This appears to be missing a word (most likely "horse") ' +
      'before "it is capable of neighing" in the first clause - verified against the raw rendered HTML, not ' +
      'an artefact of this importer\'s cleaning. Per this repo\'s faithfulness rule, the apparent gap is kept ' +
      'exactly as transcribed rather than silently filled in; no word has been guessed or inserted.',
  });
  anomalies.push({
    where: 'isagoge-en / OCR-level irregularities',
    note:
      'The Wikisource transcription contains several uncorrected OCR-level irregularities, preserved ' +
      'verbatim and not corrected: "diners" for "differs" (Chapters II [x2], X, XV), "ate" for "are" ' +
      '(Chapter VII), "tor" for "for" (Chapter XII), "hut" for "but", "nut" for "not", "arc" for "are", ' +
      '"cot" for "not", and "cannot he" for "cannot be" (all in Chapter XIV), "mast" for "must" (Chapter ' +
      'XVI), and "arc" for "are" and "tiny differ" for (apparently) "they differ" (Chapter XVII). These read ' +
      'as scanning/OCR letter-substitution errors typical of this kind of page-scan transcription; none has ' +
      'been corrected or conjecturally emended, matching how the sibling Greek edition documents its own ' +
      'uncorrected OCR irregularities.',
  });
  anomalies.push({
    where: 'isagoge-en / Chapter XIV heading, TOC vs body',
    note:
      'The source page\'s "Contents" block gives the Chapter XIV title as "Of Community and Difference of ' +
      'Accident and Difference." (singular), but the chapter\'s own printed heading in the body reads "Of ' +
      'Community and Difference of Accident and Differences." (plural). Division.sourceHeading uses the ' +
      'body heading (the authoritative, in-place chapter title); the TOC wording is not used anywhere in ' +
      'the import.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'isagoge-en',
    language: 'en',
    divisions,
  };

  const about = {
    workId: 'isagoge-en',
    title: 'Isagoge',
    author: 'Porphyry',
    language: 'en',
    edition:
      'The Organon, or Logical Treatises, of Aristotle. With the Introduction of Porphyry. Literally ' +
      'Translated, with Notes, Syllogistic Examples, Analysis, and Introduction (London: Henry G. Bohn, 1853)',
    translator: 'Octavius Freire Owen',
    provenance:
      'English Wikisource, page "Organon (Owen)/The Introduction of Porphyry" (a page-scan transcription of ' +
      'O. F. Owen\'s Organon of Aristotle Vol. 2 (1853), pp. 609-633); imported by scripts/import-isagoge-en.',
    license:
      "Owen's 1853 translation is in the public domain. The digital transcription is taken from English " +
      'Wikisource and is available under the Creative Commons Attribution-ShareAlike 4.0 International ' +
      'licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'This is Porphyry\'s Isagoge in the English translation made by Octavius Freire Owen in 1853, ' +
            'published as an appendix to his translation of Aristotle\'s Organon in Bohn\'s Classical ' +
            'Library. It is the standard public-domain English version of Porphyry\'s primer on the five ' +
            'predicables (genus, species, differentia, property and accident).',
          'The text here is Owen\'s English, verbatim. Nothing is translated further, modernised, ' +
            'normalised or silently corrected; Owen\'s own 1853 prose style, including its archaic diction ' +
            'and punctuation, is preserved exactly as printed.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Octavius Freire Owen, trans., The Organon, or Logical Treatises, of Aristotle. With the ' +
            'Introduction of Porphyry. Literally Translated, with Notes, Syllogistic Examples, Analysis, ' +
            'and Introduction, Vol. 2 (London: Henry G. Bohn, 1853), pp. 609-633.',
          'Owen\'s translation is chaptered as 17 numbered chapters (Chap. I-XVII), with no separate ' +
            'preface - Chapter I itself is titled "Object of the writer, in the present Introduction." ' +
            'This is a genuinely different scheme from the Busse-derived praefatio-plus-26-capitula ' +
            'division shared by the Greek (isagoge-grc) and Latin (isagoge-la) editions bundled alongside ' +
            'it under the same Isagoge group: the three division trees are not aligned 1:1, and are ' +
            'treated as independent editions, the same way this repo already tolerates independently' +
            '-divided editions of the same work elsewhere.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by chapter (roman numeral) and the chapter\'s own printed English title. This ' +
            'source carries no printed paragraph numbers and this import assigns no page/line citation ' +
            'scheme, so every page/line reference field is null.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the rendered HTML of the English Wikisource page "Organon (Owen)/' +
            'The Introduction of Porphyry", a page-scan transcription of Owen\'s 1853 printed volume. ' +
            'Because that page is page-scan transcluded, the MediaWiki wikitext API returns only page-range ' +
            'markers rather than real text; the rendered HTML (`action=parse&prop=text`) was fetched once ' +
            'instead and is bundled with the app. Nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer parses the rendered HTML with jsdom, locates the main transcluded page body, and ' +
            'splits it into 17 chapter divisions at each "Chap. N.--Title" heading. Passages are the ' +
            'paragraph units of the source. Numbered footnote/endnote apparatus and the marginal ' +
            'running-head "sidenotes" printed in the 1853 edition were removed as transport scaffolding, ' +
            'along with inline page-scan anchors and wiki styling markup; none of this is reading text. A ' +
            'small number of stray, non-prose transport characters (an orphaned footnote-call-out asterisk, ' +
            'and a single stray "}" abutting a removed sidenote) were also removed - see "Known gaps & ' +
            'anomalies" below. Every other irregularity found in the actual printed prose is preserved ' +
            'verbatim.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 17 chapters are present; the text runs verbatim from "Since it is necessary, ' +
            'Chrysaorius, ..." to the closing "...but these are sufficient for their distinction, and the ' +
            'setting forth of their agreement." Nothing is dropped, merged or reordered beyond the apparatus ' +
            'and stray marks described above.',
          'Table of contents. The source page\'s own "Contents" block lists the Chapter II title twice in a ' +
            'row. This was checked directly against the document body, which contains exactly one Chapter ' +
            'II heading and one Chapter II content block; the duplication is a TOC-only transcription ' +
            'glitch and no duplicate chapter was created.',
          'Chapter IV, apparent dropped word. The source reads "...since if any thing be a it is capable of ' +
            'neighing, and if any thing be capable of neighing it is a horse," apparently missing a word ' +
            '(most likely "horse") before "it is capable of neighing." This is preserved exactly as ' +
            'transcribed; no word has been guessed or inserted.',
          'OCR-level irregularities. The transcription contains a number of uncorrected letter-substitution ' +
            'errors typical of page-scan OCR (e.g. "diners" for "differs", "hut"/"nut"/"cot" for "but"/' +
            '"not"/"not", "arc" for "are", "mast" for "must") - all preserved verbatim and not corrected.',
          'Chapter XIV heading. The TOC gives the title in the singular ("...Accident and Difference."); the ' +
            'chapter\'s own printed heading in the body is plural ("...Accident and Differences."). The body ' +
            'heading is used as Division.sourceHeading.',
          'Stray transport marks. A small number of paragraphs contained a lone "*" footnote call-out ' +
            '(orphaned once its target marginal sidenote was stripped as apparatus) and, once, a stray "}" ' +
            'character directly abutting a stripped sidenote with no matching "{" anywhere in the text. Both ' +
            'are almost certainly leaked wiki/transport markup rather than part of Owen\'s prose and were ' +
            'removed; each affected passage carries a Passage.anomaly note.',
          'This source has no printed paragraph numbers, so every Passage.n is the empty string; cite by ' +
            'chapter.',
        ],
      },
    ],
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
      `  ${(d.number ?? '-').padEnd(6)} ${d.id.padEnd(8)} ` +
        `${String(d.passages.length).padStart(2)} passage(s)  heading=${JSON.stringify(d.sourceHeading)}\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions  ${totalPassages} passages  ${totalChars} chars\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:isagoge-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
