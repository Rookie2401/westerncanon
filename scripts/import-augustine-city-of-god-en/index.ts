/**
 * Augustine, *City of God*, trans. Rev. Marcus Dods, D.D. (Nicene and
 * Post-Nicene Fathers, Series I, Vol. II, 1887) - English Wikisource.
 * Run-once ingestion pipeline (fetch step is separate; see fetch.ts).
 *
 *   npx tsx scripts/import-augustine-city-of-god-en/fetch.ts   (one-time, cached)
 *   npm run import:augustine-city-of-god-en
 *
 * Reads scripts/import-augustine-city-of-god-en/raw/toc/*.json (22 Book TOC
 * pages) and raw/pages/*.json (one page per Preface/Chapter - the result of
 * the MediaWiki `action=parse&prop=wikitext` API for https://en.wikisource.org
 * ). Writes:
 *   data/augustine-city-of-god-en/work.json
 *   data/augustine-city-of-god-en/about.json
 *   data/augustine-city-of-god-en/anomalies.json
 *
 * --- Structure ---
 * Unlike the Latin edition (one wiki page per BOOK, chapters marked inline),
 * this translation is one wiki page per CHAPTER. Four books (I, V, VI, VII -
 * the very same four as the Latin edition's own "[Pr]"-marked books) carry an
 * extra "Preface" page before Chapter 1; each becomes that book's chapter 0
 * (book-N-ch-0, sourceHeading "Preface"). Every Book's own TOC page prints a
 * one-paragraph "Argument—..." summary, used as that Book's editorialTitle
 * (the Latin edition prints no such summary, so its Books' editorialTitle is
 * null - see import-augustine-city-of-god-la/index.ts).
 *
 * Each Chapter page's own heading line - "Chapter N.—Title." (or, for a
 * Preface page, "Preface, Title.") - IS printed by this edition, unlike the
 * Latin one, so it is captured verbatim as Division.sourceHeading (entities
 * decoded, whitespace collapsed). <ref>...</ref> inline footnotes and the
 * trailing "==Footnotes==\n<references />" apparatus are dropped entirely
 * (matching how footnote apparatus is dropped elsewhere in this repo); the
 * footnotes contain the NPNF editor's (Philip Schaff's) annotations, not
 * Augustine's own text.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-la and the sibling
 * Latin importer): verbatim English reading text only; nothing discarded or
 * silently corrected beyond the wiki/HTML transport scaffolding named above.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/augustine-city-of-god-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const TOC_DIR = join(HERE, 'raw', 'toc');
const PAGES_DIR = join(HERE, 'raw', 'pages');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-city-of-god-en');

const ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII',
];

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

function readWikitext(dir: string, slug: string): string {
  const file = join(dir, `${slug}.json`);
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { parse?: { wikitext?: { '*'?: string } | string } };
  const wt = raw.parse?.wikitext;
  const text = typeof wt === 'string' ? wt : wt?.['*'];
  if (!text) {
    process.stderr.write(`STOP: could not find .parse.wikitext string in ${file}\n`);
    process.exit(1);
  }
  return text;
}

function splitParagraphs(block: string): string[] {
  return block
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Strip the leading `{{header ... }}` template common to every NPNF page. */
function stripHeader(wikitext: string, where: string): string {
  const before = wikitext.length;
  const text = wikitext.replace(/^\{\{header[\s\S]*?\n\}\}\n*/, '');
  if (text.length === before) {
    process.stderr.write(`STOP: ${where}: {{header ...}} template not found / not stripped.\n`);
    process.exit(1);
  }
  return text;
}

/** Drop <ref>...</ref> footnote apparatus and the trailing Footnotes section. */
function stripFootnotes(text: string): string {
  let out = text;
  // Replace with a single space, not '', since a <ref> is sometimes spliced
  // mid-sentence with no surrounding whitespace in the wikitext (e.g. Book
  // XI's TOC: "...second part''<ref>...</ref>''of this work..." - dropping it
  // to '' would silently weld "part" and "of" into "partof"). cleanText's
  // whitespace-collapse afterwards absorbs the extra space everywhere else.
  out = out.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ');
  out = out.replace(/<ref[^>]*\/>/g, ' ');
  out = out.replace(/\n==\s*Footnotes\s*==[\s\S]*$/i, '');
  out = out.replace(/<references\s*\/?>/gi, '');
  return out;
}

/**
 * A handful of pages use the NAMED entity "&mdash;" (one book: XXI ch. 24)
 * where every other page uses a literal em-dash or "&#8212;" - the shared
 * decodeEntities() (scripts/import-isagoge-shared/text.ts) only recognises
 * amp/lt/gt/quot/apos/nbsp by name (plus any numeric &#NNN;), by design, so
 * this is expanded locally rather than widening a helper shared by other
 * importers. Also handles a couple of "&#160" occurrences (Book V ch. 26)
 * missing their closing ";" - malformed in the source itself, immediately
 * before a paragraph break - which the shared decoder (correctly) requires
 * for every OTHER numeric entity in this corpus, so this narrow fallback only
 * fires when a digit run is not already followed by ";".
 */
function expandLocalEntities(s: string): string {
  return s
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    // (?!\d) pins this to the END of the digit run before checking for a
    // missing ";", so a well-formed "&#160;" is never matched via
    // backtracking into a shorter, bogus "&#16" + "0;" split.
    .replace(/&#(\d+)(?!\d)(?!;)/g, (_whole, d: string) => String.fromCodePoint(Number(d)));
}

/**
 * Unwraps a handful of simple MediaWiki templates/links to their plain
 * display text - transport syntax, not content, same reasoning as stripping
 * {{header}}/<ref>: "{{Sc|...}}" (small-caps, Book XXI ch. 24's title),
 * "{{sup|...}}" (superscript, Book XV ch. 6), and "[[target|Display]]" /
 * "[[target]]" wiki-links (Book XXII ch. 6, linking "Romulus" to a wiki
 * Portal page that has no meaning offline).
 */
function unwrapSimpleTemplates(s: string): string {
  let out = s;
  out = out.replace(/\{\{Sc\|([^{}]*)\}\}/gi, '$1');
  out = out.replace(/\{\{sup\|([^{}]*)\}\}/gi, '$1');
  out = out.replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1');
  return out;
}

/** Parse a Preface/Chapter page: paragraph[0] is the heading line, the rest is the body. */
function parsePrefaceOrChapter(
  wikitext: string,
  where: string,
  kind: 'preface' | 'chapter',
): { sourceHeading: string | null; passages: Passage[] } {
  // Wiki bold/italic markup ('' / ''') is transport syntax like {{}}/[[]] -
  // the plain-text Passage schema has no way to represent emphasis, so
  // leaving raw '' pairs in would leak MediaWiki syntax into the reading
  // text rather than preserve content (the words themselves are untouched;
  // only the marker characters are dropped).
  const body = unwrapSimpleTemplates(expandLocalEntities(stripFootnotes(stripHeader(wikitext, where)))).replace(/'{2,}/g, '');
  const paras = splitParagraphs(body);
  if (paras.length < 2) {
    process.stderr.write(`STOP: ${where}: expected a heading paragraph plus >=1 body paragraph, got ${paras.length}.\n`);
    process.exit(1);
  }
  const headingRaw = cleanText(paras[0]);
  let sourceHeading: string | null;
  if (kind === 'chapter') {
    // Normally "Chapter N.—Title." (period + em-dash); tolerate a stray
    // space before the period (Book X ch. 21: "Chapter 21 .—..."), and a
    // bare period with no dash at all (Book V ch. 26: "Chapter 26. Title.").
    const m = /^Chapter\s+\d+\s*\.\s*(?:[—-]\s*)?(.*)$/.exec(headingRaw);
    sourceHeading = m ? m[1].trim() || null : null;
  } else {
    // Normally "Preface, Title." (comma); three Prefaces (Books V, VI, VII)
    // print a bare "Preface." with no further title text.
    const m = /^Preface\s*[.,]?\s*(.*)$/.exec(headingRaw);
    sourceHeading = m ? m[1].trim() || null : null;
  }
  if (sourceHeading === null && !(kind === 'preface')) {
    // A bare "Preface." (sourceHeading null) is expected and handled by the
    // 'Preface' fallback at the call site - only flag genuinely unparsed
    // Chapter headings here.
    anomalies.push({ where, note: `heading paragraph did not match the expected pattern; got ${JSON.stringify(headingRaw.slice(0, 80))}. sourceHeading left null.` });
  }
  const passages: Passage[] = paras.slice(1).map((p) => ({ n: '', text: cleanText(p), ref: null }));
  if (passages.length === 0) {
    process.stderr.write(`STOP: ${where}: no body passages.\n`);
    process.exit(1);
  }
  return { sourceHeading, passages };
}

interface BookToc {
  hasPreface: boolean;
  chapterCount: number;
  argument: string | null;
}

function parseBookToc(wikitext: string, roman: string, where: string): BookToc {
  // A handful of Book TOC pages attach a <ref>...</ref> footnote directly to
  // the "Book N." line with no blank line before it (e.g. Book IV, V, XIV),
  // which would otherwise leak into - or defeat the exact-match filter on -
  // the extracted Argument text below. Strip footnote apparatus first, same
  // as for Chapter/Preface pages.
  const text = stripFootnotes(stripHeader(wikitext, where));
  const contentsIdx = text.indexOf('== Contents ==');
  if (contentsIdx < 0) {
    process.stderr.write(`STOP: ${where}: "== Contents ==" not found.\n`);
    process.exit(1);
  }
  // Only the pre-Contents ("Argument") text gets entity/template expansion -
  // contentsBlock is left untouched since its own [[.../Chapter N|Chapter N]]
  // links are exactly what hasPreface/chapterCount below parse.
  const pre = unwrapSimpleTemplates(expandLocalEntities(text.slice(0, contentsIdx)));
  const contentsBlock = text.slice(contentsIdx);
  const hasPreface = /\[\[[^\]]*\/Preface\|Preface\]\]/.test(contentsBlock);
  const chapterCount = [...contentsBlock.matchAll(/\[\[[^\]]*\/Chapter (\d+)\|Chapter \d+\]\]/g)].length;
  if (chapterCount === 0) {
    process.stderr.write(`STOP: ${where}: 0 chapters parsed from TOC.\n`);
    process.exit(1);
  }

  // Most books print "The City of God." / "Book N." / a dashed rule-line / the
  // "Argument—..." paragraph as four SEPARATE blank-line-delimited paragraphs
  // - but not always: Book IV prints "Book IV." and "Argument—..." joined in
  // ONE paragraph (an nbsp, not a blank line, between them), and Book XI
  // wraps its "Argument—..." opening in wiki italic markup ('' ... ''). Both
  // are handled below rather than assumed away.
  const paras = splitParagraphs(pre).filter((p) => {
    const t = p.trim();
    if (/^The City of God\.?$/i.test(t)) return false;
    if (/^[—\-\s]+$/.test(t)) return false; // horizontal-rule line of dashes
    return true;
  });
  let argument: string | null = null;
  if (paras.length > 0) {
    let joined = cleanText(paras.join(' ')).replace(/''+/g, ''); // strip wiki italic/bold markup
    joined = joined.replace(new RegExp(`^Book\\s+${roman}\\.\\s*`, 'i'), '');
    const m = /^Argument\.?\s*[—-]\s*(.*)$/.exec(joined);
    if (m) {
      argument = m[1].trim();
    } else {
      argument = joined;
      anomalies.push({ where, note: `Book argument paragraph did not start with the expected "Argument—" prefix; used verbatim: ${JSON.stringify(joined.slice(0, 80))}` });
    }
  }
  return { hasPreface, chapterCount, argument };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const divisions: Division[] = [];
  let totalPagesRead = 0;

  anomalies.push({
    where: 'augustine-city-of-god-en / (work level)',
    note:
      'The top-level "City of God" Wikisource page also links a "Translator\'s Preface" (Dods\' own preface) ' +
      'and, one level up, an "Editor\'s Preface" (Philip Schaff\'s, for the whole NPNF volume). Both are ' +
      'paratextual - the translator\'s/editor\'s own words, not Augustine\'s - and are deliberately not ' +
      'included as divisions of this work; only Augustine\'s 22 books (plus each book\'s own "Preface" chapter, ' +
      'which IS Augustine\'s text) are imported.',
  });
  anomalies.push({
    where: 'augustine-city-of-god-en / (work level)',
    note:
      'MediaWiki bold/italic markup ("\'\'" / "\'\'\'", e.g. around a single emphasised word like Book I ' +
      'chapter 23\'s "he was \'\'ashamed\'\' that") is stripped throughout, same as {{templates}}/[[links]] - the ' +
      'plain-text Passage schema has no way to represent emphasis, so leaving the raw marker characters in ' +
      'would leak wiki syntax into the reading text rather than preserve it. Only the marker characters are ' +
      'dropped; the words themselves are untouched.',
  });

  for (let i = 0; i < ROMANS.length; i++) {
    const roman = ROMANS[i];
    const bookNum = i + 1;
    const bookSlug = `book-${String(bookNum).padStart(2, '0')}-${roman}`;
    const where = `augustine-city-of-god-en / book-${bookNum}`;

    const tocWikitext = readWikitext(TOC_DIR, bookSlug);
    const toc = parseBookToc(tocWikitext, roman, where);

    const chapters: Division[] = [];
    if (toc.hasPreface) {
      const pw = readWikitext(PAGES_DIR, `${bookSlug}-preface`);
      const { sourceHeading, passages } = parsePrefaceOrChapter(pw, `${where}-ch-0`, 'preface');
      chapters.push({
        id: `book-${bookNum}-ch-0`,
        number: null,
        ref: null,
        sourceHeading: sourceHeading ?? 'Preface',
        editorialTitle: null,
        children: [],
        passages,
      });
      totalPagesRead += 1;
    }
    for (let ch = 1; ch <= toc.chapterCount; ch++) {
      const slug = `${bookSlug}-ch-${String(ch).padStart(2, '0')}`;
      const cw = readWikitext(PAGES_DIR, slug);
      const { sourceHeading, passages } = parsePrefaceOrChapter(cw, `${where}-ch-${ch}`, 'chapter');
      chapters.push({
        id: `book-${bookNum}-ch-${ch}`,
        number: String(ch),
        ref: null,
        sourceHeading,
        editorialTitle: null,
        children: [],
        passages,
      });
      totalPagesRead += 1;
    }

    divisions.push({
      id: `book-${bookNum}`,
      number: roman,
      ref: null,
      sourceHeading: null,
      editorialTitle: toc.argument,
      children: chapters,
      passages: [],
    });
  }

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: 'augustine-city-of-god-en', language: 'en', divisions };

  const about = {
    workId: 'augustine-city-of-god-en',
    title: 'City of God',
    author: 'Augustine of Hippo',
    language: 'en' as const,
    translator: 'Marcus Dods',
    edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. II (1887)',
    provenance:
      'English Wikisource, "Nicene and Post-Nicene Fathers: Series I/Volume II/City of God".',
    license: 'Translation public domain (1887); transcription CC BY-SA 4.0 (Wikisource).',
    sections: ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary --------------------------------------------------
  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const d of divisions) {
    const chapterCount = d.children.length;
    const passageCount = d.children.reduce((n, c) => n + c.passages.length, 0);
    const chars = d.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);
    totalChapters += chapterCount;
    totalPassages += passageCount;
    totalChars += chars;
    process.stdout.write(
      `  ${d.id.padEnd(8)} ${(d.number ?? '-').padEnd(6)} ${String(chapterCount).padStart(2)} chapter(s) ${String(passageCount).padStart(3)} passage(s) ${String(chars).padStart(7)} chars  ${d.editorialTitle ? '"' + d.editorialTitle.slice(0, 40) + '..."' : '(no argument)'}\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} books, ${totalChapters} chapters, ${totalPassages} passages, ${totalChars} chars (${totalPagesRead} wiki pages read)\n`,
  );
  process.stdout.write(`  ${anomalies.length} anomalies recorded\n`);
  process.stdout.write('\nDone.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

const ABOUT_SECTIONS = [
  {
    heading: 'About the text',
    paragraphs: [
      'Augustine began De Civitate Dei ("The City of God") in 412 AD, two years after the Gothic sack of Rome ' +
        'under Alaric, and finished it in 426. It answers the charge, current among Rome\'s remaining pagan ' +
        'aristocracy, that abandoning the old gods for Christianity had caused the disaster. Addressed to his ' +
        'younger friend Marcellinus, it grew far beyond a single apologetic tract into a twenty-two book history ' +
        'and theology of two "cities" - the earthly city, bound by love of self, and the City of God, bound by ' +
        'love of God - interwoven from Creation to the Last Judgment.',
      'The first ten books argue against Roman religion: books 1-5 against worshipping the gods for the sake of ' +
        'temporal happiness, books 6-10 against worshipping them for the sake of the life to come, closing with a ' +
        'sustained engagement with Platonist philosophy. The remaining twelve books (11-22) trace the origin, ' +
        'history, and destined ends of the two cities, culminating in Book 22\'s account of the resurrection of ' +
        'the body and the eternal life of the redeemed.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'The translation is the Rev. Marcus Dods\' (1887), published as volume II of the Nicene and Post-Nicene ' +
        'Fathers, Series I, under the general editorship of Philip Schaff. Each of its 22 books opens with a ' +
        'one-paragraph editorial "Argument" summarising the book, used here as that Book division\'s ' +
        'editorialTitle (the Latin edition prints no such summaries, so its Books carry none). Four books - I, V, ' +
        'VI, and VII, the same four as in the Latin edition - carry their own "Preface" chapter before Chapter 1.',
      'Every chapter carries a printed title, "Chapter N.—Title.", captured verbatim as that chapter\'s ' +
        'sourceHeading. Schaff\'s own footnotes (marked "—P.S." in the source) are interspersed as <ref> markers ' +
        'through the text; they are editorial apparatus, not Augustine\'s words, and are dropped entirely, along ' +
        'with the trailing "Footnotes" section on each page.',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'Fetched from the English Wikisource MediaWiki API (`action=parse&prop=wikitext`), one request per Book\'s ' +
        'table-of-contents page (22 requests, to discover each book\'s exact chapter count and whether it has a ' +
        'Preface) plus one request per Preface/Chapter page (roughly 650-700 requests - this translation is one ' +
        'wiki page per chapter, unlike the Latin edition\'s one page per book). Every raw API response is cached ' +
        'under scripts/import-augustine-city-of-god-en/raw/ (toc/ and pages/) so the importer never needs to ' +
        're-fetch the source to rebuild work.json.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'Each of the 22 books is a top-level division (book-1 .. book-22); chapters are numbered book-N-ch-1 .. ' +
        'book-N-ch-M following this edition\'s own chapter numbering (which is not expected to, and does not need ' +
        'to, match the Latin edition\'s position-based numbering chapter-for-chapter, since the two are ' +
        'independently divided works read through the same GenericWork tree shape). A book\'s own "Preface" page, ' +
        'where present, becomes chapter 0 (book-N-ch-0).',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'See anomalies.json for the full machine-readable list. In general this translation\'s Wikisource ' +
        'transcription is far more uniform than the Latin edition\'s (one wiki page per chapter, with a ' +
        'consistently printed chapter title on every page), so irregularities here are mostly limited to the odd ' +
        'heading line that does not cleanly match the expected "Chapter N.—Title."/"Preface, Title." pattern; ' +
        'each such case is flagged individually rather than guessed at.',
    ],
  },
];

main();
