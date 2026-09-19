/**
 * Aristotle, *Posterior Analytics* — E. S. Bouchier's 1901 translation, via
 * English Wikisource ("Posterior Analytics (Bouchier)"). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-aristotle-posterior-analytics-en/index.ts
 *
 * Reads scripts/import-aristotle-posterior-analytics-en/raw/wikisource.json
 * (already in the repo — a {pageTitle: wikitext} map, the result of the
 * MediaWiki `action=parse&prop=wikitext` API for each of the 54 chapter/
 * appendix pages this translation is split across; discovered via one
 * `action=query&list=prefixsearch` call, also committed at raw/pagelist.json).
 * Writes:
 *   data/posterior-analytics-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/posterior-analytics-en/about.json      - provenance / licence metadata + About prose
 *   data/posterior-analytics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-aristotle-posterior-analytics-en/validate.ts`.
 *
 * --- Source structure (confirmed by direct fetch of every page) ---
 * One plain wikitext page per chapter:
 *   {{header ... }}                       front-matter template — scaffolding, dropped
 *   ===Chapter N: Title===                N a roman numeral, Title genuine & informative
 *   :''...''                              Bouchier's own italicised one-paragraph ARGUMENT
 *   (blank line)
 *   ordinary prose paragraphs
 *   [===Notes===                          present on 8 of 54 pages
 *    <ref>...</ref> inline in the prose, referenced from a trailing <references />]
 *
 * No wiki templates or [[links]] appear anywhere in any chapter BODY (only
 * inside the dropped {{header}} block) — confirmed by scanning every one of
 * the 54 raw pages. The chapter ARGUMENT line (":''...''") is genuine
 * translator's prose (a one-paragraph summary Bouchier wrote for each
 * chapter), not source apparatus, so — per this repo's rule of never
 * discarding genuine translator content — it is kept as the first paragraph
 * of that chapter's Passage.text, not dropped as if it were a citation
 * marker. The inline "<ref>...</ref>" footnotes ARE apparatus (Bouchier's
 * own scholarly annotations, e.g. citing manuscript readings against "the
 * Clarendon Press Edition") and are dropped, each occurrence logged.
 *
 * Book II's last two chapters (numbers XXIII "On Induction" and XXIV "On
 * Example") live on a single further page, ".../Book II/Appendix", as two
 * level-4 "====Chapter N: Title====" headings under one level-3
 * "===Appendix===" heading with no content of its own — Bouchier's own
 * numbering jumps from Chapter XIX straight to this "Appendix", Chapters
 * XX-XXII simply not existing in this translation. Both are imported as
 * ordinary numbered chapters (see the parseAppendixPage() handling below and
 * the matching anomaly note).
 *
 * Faithfulness rules (mirrors scripts/import-augustine-city-of-god-en):
 * verbatim English reading text only — no modernising Bouchier's 1901
 * English. Only wiki/HTML transport scaffolding ({{header}}, <ref> footnote
 * apparatus, '' / [[ ]] marker characters) is removed; the words themselves
 * are untouched.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/posterior-analytics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'posterior-analytics-en');
const RAW = join(HERE, 'raw', 'wikisource.json');

const WORK_ID = 'posterior-analytics-en';
const BASE_PAGE = 'Posterior Analytics (Bouchier)';

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function romanToArabic(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = map[roman[i]!];
    const next = i + 1 < roman.length ? map[roman[i + 1]!] : undefined;
    if (cur === undefined) fail(`unrecognised roman numeral character "${roman[i]}" in "${roman}"`);
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

/** Strip the leading `{{header ... }}` template common to every page. */
function stripHeader(wikitext: string, where: string): string {
  const before = wikitext.length;
  const text = wikitext.replace(/^\{\{header[\s\S]*?\n\}\}\n*/, '');
  if (text.length === before) fail(`${where}: {{header ...}} template not found / not stripped.`);
  return text;
}

/** Drop <ref>...</ref> footnote apparatus and the trailing ===Notes===/<references /> section. Returns the cleaned text plus how many footnotes were stripped. */
function stripFootnotes(text: string, where: string): { text: string; footnotes: string[] } {
  const footnotes: string[] = [];
  let out = text.replace(/<ref[^>]*>([\s\S]*?)<\/ref>/g, (_m, body: string) => {
    footnotes.push(cleanText(body));
    return ' ';
  });
  out = out.replace(/<ref[^>]*\/>/g, ' ');
  const notesIdx = out.search(/^===\s*Notes\s*===\s*$/m);
  if (notesIdx >= 0) out = out.slice(0, notesIdx);
  if (/<references/.test(out)) fail(`${where}: <references> tag survived Notes-section truncation`);
  return { text: out, footnotes };
}

/** Unwrap the few simple wiki constructs seen anywhere near reading text: bold/italic markers, [[links]], and a lone <pre>...</pre> block (Book I Chapter III's aligned-columns rendering of Aristotle's circular-proof syllogism chain — genuine translator formatting, not apparatus: tag stripped, content kept, its internal line breaks collapsed by the normal whitespace-cleanup pass like any other prose). */
function unwrapWikiSyntax(s: string): string {
  return s
    .replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<\/?pre>/g, '');
}

function splitParagraphs(block: string): string[] {
  return block
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const CHAPTER_HEADING_RE = /^(={3,4})Chapter\s+([IVXLCDM]+):\s*(.*?)\1[ \t]*$/gm;

interface ParsedChapter {
  number: number;
  title: string;
  text: string;
  footnoteCount: number;
}

/** Parse a normal one-chapter-per-page body (post {{header}} strip) into a single ParsedChapter. */
function parseSingleChapterPage(wikitext: string, where: string): ParsedChapter {
  const body = stripHeader(wikitext, where);
  CHAPTER_HEADING_RE.lastIndex = 0;
  const m = CHAPTER_HEADING_RE.exec(body);
  if (!m) fail(`${where}: no "===Chapter N: Title===" heading found`);
  if (body.slice(0, m.index).trim().length !== 0) {
    fail(`${where}: non-whitespace content before the chapter heading: ${JSON.stringify(body.slice(0, m.index).slice(0, 120))}`);
  }
  const second = CHAPTER_HEADING_RE.exec(body);
  if (second) fail(`${where}: more than one chapter heading found on a page expected to hold exactly one`);

  const rest = body.slice(m.index + m[0]!.length);
  const { text: withoutNotes, footnotes } = stripFootnotes(rest, where);
  const paras = splitParagraphs(withoutNotes)
    .map((p) => cleanText(unwrapWikiSyntax(p)))
    .filter((p) => p.length > 0);
  if (paras.length === 0) fail(`${where}: no body paragraphs found`);
  const argFirst = paras[0]!.startsWith(':');
  if (!argFirst) {
    anomalies.push({ where, note: `first paragraph did not start with ":" (expected Bouchier's italicised ":''...''" argument line); kept as an ordinary paragraph instead: ${JSON.stringify(paras[0]!.slice(0, 80))}` });
  }
  const cleanedParas = paras.map((p) => (p.startsWith(':') ? p.slice(1).trim() : p));

  return {
    number: romanToArabic(m[2]!),
    title: cleanText(m[3]!),
    text: cleanedParas.join('\n\n'),
    footnoteCount: footnotes.length,
  };
}

/** Parse the Book II "Appendix" page, which holds TWO chapters (XXIII, XXIV) as level-4 headings under one content-free level-3 "===Appendix===" heading. */
function parseAppendixPage(wikitext: string, where: string): ParsedChapter[] {
  const body = stripHeader(wikitext, where);
  const appendixHeading = /^===\s*Appendix\s*===[ \t]*$/m.exec(body);
  if (!appendixHeading) fail(`${where}: "===Appendix===" heading not found`);

  CHAPTER_HEADING_RE.lastIndex = 0;
  const matches: RegExpExecArray[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = CHAPTER_HEADING_RE.exec(body))) matches.push(cm);
  if (matches.length === 0) fail(`${where}: no "====Chapter N: Title====" headings found under Appendix`);

  const betweenAppendixAndFirst = body.slice(appendixHeading.index + appendixHeading[0]!.length, matches[0]!.index).trim();
  if (betweenAppendixAndFirst.length !== 0) {
    fail(`${where}: unexpected content between "===Appendix===" and its first chapter heading: ${JSON.stringify(betweenAppendixAndFirst.slice(0, 120))}`);
  }

  return matches.map((m, i) => {
    const start = m.index + m[0]!.length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index : body.length;
    const chWhere = `${where} / Chapter ${m[2]}`;
    const { text: withoutNotes, footnotes } = stripFootnotes(body.slice(start, end), chWhere);
    const paras = splitParagraphs(withoutNotes)
      .map((p) => cleanText(unwrapWikiSyntax(p)))
      .filter((p) => p.length > 0);
    if (paras.length === 0) fail(`${chWhere}: no body paragraphs found`);
    if (!paras[0]!.startsWith(':')) {
      anomalies.push({ where: chWhere, note: `first paragraph did not start with ":" (expected Bouchier's italicised ":''...''" argument line); kept as an ordinary paragraph instead: ${JSON.stringify(paras[0]!.slice(0, 80))}` });
    }
    const cleanedParas = paras.map((p) => (p.startsWith(':') ? p.slice(1).trim() : p));
    return {
      number: romanToArabic(m[2]!),
      title: cleanText(m[3]!),
      text: cleanedParas.join('\n\n'),
      footnoteCount: footnotes.length,
    };
  });
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const pages = JSON.parse(readFileSync(RAW, 'utf8')) as Record<string, string>;
  process.stdout.write(`loaded ${Object.keys(pages).length} raw pages\n`);

  const BOOKS = [
    { roman: 'I', num: 1, chapterCount: 34 },
    { roman: 'II', num: 2, chapterCount: 19 },
  ];

  let totalFootnotes = 0;
  const divisions: Division[] = BOOKS.map((book) => {
    const chapters: ParsedChapter[] = [];
    for (let n = 1; n <= book.chapterCount; n++) {
      const roman = arabicToRoman(n);
      const title = `${BASE_PAGE}/Book ${book.roman}/Chapter ${roman}`;
      const wt = pages[title];
      if (!wt) fail(`missing raw page for "${title}"`);
      const parsed = parseSingleChapterPage(wt, `${WORK_ID} / book-${book.num} / Chapter ${roman}`);
      if (parsed.number !== n) fail(`"${title}": parsed chapter number ${parsed.number} != expected ${n}`);
      chapters.push(parsed);
      totalFootnotes += parsed.footnoteCount;
    }
    if (book.num === 2) {
      const appendixTitle = `${BASE_PAGE}/Book II/Appendix`;
      const wt = pages[appendixTitle];
      if (!wt) fail(`missing raw page for "${appendixTitle}"`);
      const appendixChapters = parseAppendixPage(wt, `${WORK_ID} / book-2 / Appendix`);
      chapters.push(...appendixChapters);
      totalFootnotes += appendixChapters.reduce((n2, c) => n2 + c.footnoteCount, 0);
      anomalies.push({
        where: `${WORK_ID} / book-2-ch-${appendixChapters[0]!.number} .. book-2-ch-${appendixChapters[appendixChapters.length - 1]!.number}`,
        note:
          `These two chapters ("${appendixChapters.map((c) => c.title).join('", "')}") come from a separate ` +
          `Wikisource page titled "Posterior Analytics (Bouchier)/Book II/Appendix" rather than the ordinary ` +
          `".../Book II/Chapter N" pattern used for Chapters I-XIX. On that page they are nonetheless printed ` +
          'as ordinary further Bouchier chapters, numbered XXIII and XXIV, continuing his own numbering — ' +
          'Chapters XX, XXI and XXII simply do not exist in this translation (this is Bouchier\'s own scheme, ' +
          'not an importer gap: the English Wikisource prefixsearch enumerated exactly Book II Chapters I-XIX ' +
          'plus this one further "Appendix" page, no others). Rather than inventing a generic "Appendix" ' +
          'container division (which would discard Bouchier\'s own specific, informative chapter titles), both ' +
          'are imported as ordinary Chapter divisions (book-2-ch-23, book-2-ch-24) using Bouchier\'s own printed ' +
          'numbers and titles exactly like every other chapter. The page\'s own "Appendix" framing is preserved ' +
          'only here, in this anomaly note — it is not fabricated into editorialTitle or sourceHeading.',
      });
    }
    const chapterDivisions: Division[] = chapters.map((c) => ({
      id: `book-${book.num}-ch-${c.number}`,
      number: String(c.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: c.title,
      children: [],
      passages: [{ n: '', text: c.text, ref: null } as Passage],
    }));
    return {
      id: `book-${book.num}`,
      number: String(book.num),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    };
  });

  anomalies.push({
    where: `${WORK_ID} / (work level)`,
    note:
      'This source carries no Bekker page/column/line markers anywhere (confirmed by direct inspection of ' +
      'every one of the 54 raw pages) — unlike the Greek sibling data/posterior-analytics-grc/, whose Bekker ' +
      'refs are reconstructed from its own inline {{χ|...}} markers. Division.ref and Passage.ref are therefore ' +
      'null throughout this English edition; citation is by Book/Chapter (plus Bouchier\'s own chapter title) only.',
  });
  anomalies.push({
    where: `${WORK_ID} / (work level)`,
    note:
      `Bouchier's own scholarly footnotes (${totalFootnotes} of them, on 8 of the 54 pages — e.g. textual-` +
      'variant notes citing "the Clarendon Press Edition", or a cross-reference to de Partibus Animalium) are ' +
      'editorial apparatus, not Aristotle\'s words. Every inline <ref>...</ref> marker and the trailing ' +
      '"===Notes===" / <references /> section on each page that has one are dropped entirely from the reading ' +
      'text, mirroring how translator/editor footnote apparatus is dropped elsewhere in this repo (e.g. the ' +
      'NPNF editor\'s footnotes in the Augustine English imports).',
  });
  anomalies.push({
    where: `${WORK_ID} / (work level)`,
    note:
      'Each chapter\'s italicised one-paragraph "argument" (Bouchier\'s own chapter summary, printed as ' +
      '":\'\'...\'\'" wikitext immediately under the chapter title) is genuine translator\'s prose, not source ' +
      'apparatus or a citation marker, and is kept as the first paragraph of that chapter\'s Passage.text — ' +
      'joined with the body paragraphs by "\\n\\n", per the target schema — rather than discarded.',
  });

  // --- write outputs -------------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Posterior Analytics',
    author: 'Aristotle',
    language: 'en',
    translator: 'E. S. Bouchier',
    edition: 'E. S. Bouchier, Aristotle’s Posterior Analytics (Oxford: Blackwell, 1901)',
    provenance:
      'English Wikisource, "Posterior Analytics (Bouchier)", one wiki page per chapter (54 pages total: Book I ' +
      'Chapters I-XXXIV, Book II Chapters I-XIX, and a further "Book II/Appendix" page holding Chapters XXIII-' +
      'XXIV), fetched via the MediaWiki action=parse&prop=wikitext API (page list discovered via ' +
      'action=query&list=prefixsearch); imported by scripts/import-aristotle-posterior-analytics-en. The raw ' +
      'dump is committed at scripts/import-aristotle-posterior-analytics-en/raw/wikisource.json (plus ' +
      'pagelist.json for the page-discovery response).',
    license:
      'Bouchier’s translation is in the public domain (published 1901, well over 120 years ago). The digital ' +
      'transcription is taken from English Wikisource and is available under the Creative Commons Attribution-' +
      'ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Aristotle’s Posterior Analytics — trans. E. S. Bouchier',
        paragraphs: [
          'This is Aristotle’s Posterior Analytics in the English translation made by E. S. Bouchier, ' +
            'published in 1901. In two books, the treatise sets out Aristotle’s theory of scientific ' +
            'demonstration and knowledge: Book I develops the formal requirements a demonstrative syllogism ' +
            'must meet to yield knowledge of a thing’s cause, and Book II turns to definition and to how the ' +
            'first, indemonstrable principles of a science are themselves known.',
          'The text here is Bouchier’s English, verbatim. Nothing is modernised, paraphrased, or silently ' +
            'corrected. Each chapter also carries Bouchier’s own one-paragraph italicised "argument" ' +
            '(summary), kept as the opening paragraph of that chapter’s reading text — it is his own genuine ' +
            'prose, not source apparatus.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The translation is E. S. Bouchier’s (1901). Every one of its chapters carries a genuine, ' +
            'informative printed title (e.g. "Whether a Demonstrative Science exists" for Book I, Chapter I), ' +
            'captured verbatim as that chapter’s editorialTitle.',
          'Book II’s last two chapters, numbered XXIII ("On Induction") and XXIV ("On Example"), are printed ' +
            'on a separate Wikisource page titled "Book II/Appendix" rather than continuing the ordinary ' +
            '"Chapter N" page series — Bouchier’s own numbering jumps from Chapter XIX directly to XXIII; ' +
            'Chapters XX-XXII do not exist in this translation. Both are imported as ordinary numbered chapters ' +
            '(see "Known gaps & anomalies" below).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the wikitext of the 54 English Wikisource pages under "Posterior ' +
            'Analytics (Bouchier)" (one per chapter, plus the Book II Appendix page), retrieved via the ' +
            'MediaWiki action=parse&prop=wikitext API and committed under the importer’s raw/ directory. It ' +
            'is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer strips only wiki/HTML transport scaffolding: the {{header ...}} front-matter template ' +
            'on every page, and — on the 8 pages that carry them — the inline <ref>...</ref> footnote markers ' +
            'plus the trailing "===Notes===" / <references /> apparatus (Bouchier’s own scholarly notes, not ' +
            'Aristotle’s text). Each chapter’s italicised ":\'\'...\'\'" argument paragraph has its leading ' +
            '":" list marker and "\'\'" italic markers stripped (the words are untouched) and becomes the first ' +
            'paragraph of that chapter’s Passage.text, joined with the body paragraphs by "\\n\\n". Entities ' +
            'are decoded and runs of whitespace collapsed.',
          'Chapter numbers are Bouchier’s own (converted from his printed roman numerals to plain arabic ' +
            'strings for the Division.number/id fields); chapter titles are his own printed titles, verbatim.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by Book/Chapter (plus Bouchier’s own chapter title). This source carries no Bekker ' +
            'page/column/line markers anywhere — unlike the Greek sibling data/posterior-analytics-grc/ — so ' +
            'Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: (1) Book II Chapters "XXIII" and ' +
            '"XXIV" are sourced from a separate "Appendix" Wikisource page and imported as ordinary numbered ' +
            'chapters (book-2-ch-23, book-2-ch-24) rather than as a generic "Appendix" division, to preserve ' +
            'Bouchier’s own specific chapter titles; (2) Bouchier’s scholarly footnotes on 8 pages are ' +
            'dropped as translator apparatus, each occurrence logged; (3) no Bekker or other physical reference ' +
            'markers exist in this source at all.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -----------------------------------------------------
  const totalChapters = divisions.reduce((n, b) => n + b.children.length, 0);
  const totalChars = divisions.reduce(
    (n, b) => n + b.children.reduce((m, c) => m + c.passages.reduce((k, p) => k + p.text.length, 0), 0),
    0,
  );
  process.stdout.write('\nDivisions:\n');
  for (const book of divisions) {
    process.stdout.write(`  Book ${book.number} — ${book.children.length} chapters\n`);
    for (const ch of book.children) {
      process.stdout.write(`    ch-${ch.number}  ${JSON.stringify(ch.editorialTitle)}\n`);
    }
  }
  process.stdout.write(
    `\n  ${divisions.length} books  ${totalChapters} chapters  ${totalChars} chars  ` +
      `(${totalFootnotes} footnotes dropped, ${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-aristotle-posterior-analytics-en/validate.ts` next.\n');
}

function arabicToRoman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rem = n;
  let out = '';
  for (const [v, s] of table) {
    while (rem >= v) {
      out += s;
      rem -= v;
    }
  }
  return out;
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

// Guard so validate.ts can import shared regexes without re-running the
// whole importer as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
