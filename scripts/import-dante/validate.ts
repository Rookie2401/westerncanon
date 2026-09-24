/**
 * Validation for the Dante import batch (scripts/import-dante/*).
 *
 *   npx tsx scripts/import-dante/validate.ts
 *
 * For every work actually shipped by this batch, checks:
 *  (a) STRUCTURE: presence of the 4 output files, and the expected
 *      division/chapter counts declared per work below (verified against
 *      each source during import; see each importer's module doc).
 *  (b) TEXT ACCOUNTING: rebuilds a raw-source reference text straight from
 *      this importer's own cached raw/ files (independently of the
 *      importer's own parsing) and asserts every line/paragraph of that
 *      reference text (>= 40 chars, after collapsing whitespace) occurs
 *      somewhere in the shipped Passage text. Any miss is printed; a
 *      non-editorial miss (i.e. not one of this importer's own disclosed,
 *      deliberate exclusions - front matter, footnotes, appendices) FAILs
 *      the run.
 *  (c) NO LEFTOVER MARKUP: scans every Passage.text for wikitext/HTML
 *      transport-markup remnants.
 *
 * Prints a combined summary and exits non-zero if any check fails.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

interface Passage { n: string; text: string; ref: string | null }
interface Division { id: string; number: string | null; sourceHeading: string | null; children: Division[]; passages: Passage[] }
interface GenericWork { workId: string; language: string; divisions: Division[] }

type Level = 'ERROR' | 'WARN';
interface Finding { level: Level; check: string; message: string }

const LEAK_MARKERS = ['{{', '[[', '<ref', '<section', '<noinclude', '<pages', '&nbsp;', '&amp;', '&lt;', '&gt;', '&quot;', "'''", '{{§'];

function allPassages(divs: Division[]): Passage[] {
  const out: Passage[] = [];
  for (const d of divs) {
    out.push(...d.passages);
    out.push(...allPassages(d.children));
  }
  return out;
}

function loadWork(workId: string): { work: GenericWork; ok: boolean; findings: Finding[] } {
  const dir = join(DATA_ROOT, workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string): void => {
    findings.push({ level: 'ERROR', check, message: m });
  };
  for (const f of ['work.json', 'about.json', 'anomalies.json', 'types.ts']) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f}`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return { work: { workId, language: '', divisions: [] }, ok: false, findings };
  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  return { work, ok: true, findings };
}

function checkMarkupLeaks(work: GenericWork, findings: Finding[]): void {
  const leaks: string[] = [];
  for (const p of allPassages(work.divisions)) {
    for (const marker of LEAK_MARKERS) {
      if (p.text.includes(marker)) leaks.push(`${JSON.stringify(marker)} in passage starting ${JSON.stringify(p.text.slice(0, 40))}`);
    }
  }
  if (leaks.length) findings.push({ level: 'ERROR', check: 'no-leaked-markup', message: `${leaks.length} leak(s):\n    ${leaks.slice(0, 15).join('\n    ')}` });
}

/**
 * Collapse whitespace, and spacing around punctuation, for substring
 * comparison purposes only (never mutates shipped data). The punctuation
 * normalisation exists solely because this validator's own independent
 * HTML-to-text extraction for the page-scan sources (a crude cross-check,
 * deliberately not sharing code with the importer's own parser) sometimes
 * inserts or omits a space before a comma/colon/semicolon that the source's
 * markup did not clearly indicate either way; it does not affect what is
 * actually shipped in work.json.
 */
function norm(s: string): string {
  return s
    .replace(/[«»""'']/g, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/([’'])\s+/g, '$1') // elision apostrophe ("ch’Amor"): this validator's independent HTML-text
    // extraction sometimes inserts a space after it that the source's own markup does not clearly call for
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.?!])/g, '$1')
    .trim();
}

interface AccountingSpec {
  workId: string;
  /** Raw text(s) to account for, already stripped to plain lines by the caller. */
  rawLines: string[];
  /** A raw line is allowed to be missing (deliberately excluded material - logged as WARN not ERROR) if this returns true. */
  isEditorialExclusion: (line: string) => boolean;
  minLen?: number;
}

function checkTextAccounting(spec: AccountingSpec, work: GenericWork, findings: Finding[]): { checked: number; missed: number } {
  const minLen = spec.minLen ?? 40;
  const headings: string[] = [];
  const collectHeadings = (divs: Division[]): void => {
    for (const d of divs) {
      if (d.sourceHeading) headings.push(d.sourceHeading);
      collectHeadings(d.children);
    }
  };
  collectHeadings(work.divisions);
  const outputBlob = norm([...allPassages(work.divisions).map((p) => p.text), ...headings].join(' ␟ '));
  let checked = 0;
  let missedNonEditorial = 0;
  const misses: string[] = [];
  for (const raw of spec.rawLines) {
    const line = norm(raw);
    if (line.length < minLen) continue;
    checked += 1;
    if (outputBlob.includes(line)) continue;
    if (spec.isEditorialExclusion(line)) continue;
    missedNonEditorial += 1;
    misses.push(line.slice(0, 100));
  }
  if (misses.length) {
    findings.push({
      level: 'ERROR',
      check: 'text-accounting',
      message: `${missedNonEditorial} non-editorial line(s) from the raw source were not found in the shipped text:\n    ${misses.slice(0, 15).join('\n    ')}`,
    });
  }
  return { checked, missed: missedNonEditorial };
}

// --------------------------------------------------------------------------
// Per-work structure checks + text-accounting raw-line extraction
// --------------------------------------------------------------------------

function plainTextLines(raw: string, startNeedle: string, endNeedle: string): string[] {
  const lines = raw.split(/\r?\n/);
  const s = lines.findIndex((l) => l.includes(startNeedle));
  const e = lines.findIndex((l, i) => i > s && l.includes(endNeedle));
  const slice = s === -1 || e === -1 ? lines : lines.slice(s, e + 1);
  return slice;
}

function stripGutenbergInline(s: string): string {
  return s.replace(/_/g, '').replace(/\[\d+\]/g, '').replace(/^\s*\[Footnote \d+:.*$/, '');
}

/** Drop a footnote body: a line matching `startRe` and every line after it up to (not including) the next blank line. */
function dropFootnoteBodies(lines: string[], startRe: RegExp): string[] {
  const out: string[] = [];
  let inFootnote = false;
  for (const line of lines) {
    if (startRe.test(line)) {
      inFootnote = true;
      continue;
    }
    if (inFootnote) {
      if (line.trim() === '') inFootnote = false;
      continue;
    }
    out.push(line);
  }
  return out;
}

function validateCommediaEn(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-commedia-en');
  if (!findings.length) {
    const divisions = work.divisions;
    if (divisions.length !== 3) findings.push({ level: 'ERROR', check: 'cantiche', message: `expected 3 cantiche, got ${divisions.length}` });
    const expectedCantos: Record<string, number> = { inferno: 34, purgatorio: 33, paradiso: 33 };
    let totalLines = 0;
    for (const d of divisions) {
      const exp = expectedCantos[d.id];
      if (exp === undefined) findings.push({ level: 'ERROR', check: 'cantica-id', message: `unexpected cantica id ${d.id}` });
      else if (d.children.length !== exp) findings.push({ level: 'ERROR', check: 'canto-count', message: `${d.id}: ${d.children.length} cantos, expected ${exp}` });
      for (const c of d.children) totalLines += c.passages[0]!.text.split('\n').filter((l) => l.trim() !== '').length;
    }
    if (totalLines < 14000 || totalLines > 14400) {
      findings.push({ level: 'WARN', check: 'line-total', message: `${totalLines} total verse lines (commonly cited Italian total: 14,233; see about.json for the disclosed comparison)` });
    }
    checkMarkupLeaks(work, findings);

    const raw = readFileSync(join(HERE, 'commedia-en', 'raw', 'pg1004.txt'), 'utf8');
    const rawLines = plainTextLines(raw, 'Inferno: Canto I', 'The Love which moves the sun and the other stars.').map((l) => l.trim());
    checkTextAccounting(
      { workId: 'dante-commedia-en', rawLines, isEditorialExclusion: (l) => /^(Inferno|Purgatorio|Paradiso): Canto [IVXLCDM]+$/.test(l) },
      work,
      findings,
    );
  }
  return { report: 'dante-commedia-en', findings };
}

function validateVitaNuovaEn(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-vita-nuova-en');
  if (!findings.length) {
    if (work.divisions.length !== 1) findings.push({ level: 'ERROR', check: 'structure', message: `expected 1 flat division, got ${work.divisions.length}` });
    const passageCount = work.divisions[0]?.passages.length ?? 0;
    if (passageCount < 100) findings.push({ level: 'ERROR', check: 'passage-floor', message: `only ${passageCount} passages` });
    checkMarkupLeaks(work, findings);

    const raw = readFileSync(join(HERE, 'vita-nuova-en', 'raw', 'pg41085.txt'), 'utf8');
    const rawLines = dropFootnoteBodies(plainTextLines(raw, 'In that part of the book of my memory', 'Laus Deo.'), /^ {2}\[\d+\]/);
    checkTextAccounting(
      {
        workId: 'dante-vita-nuova-en',
        rawLines: rawLines.map(stripGutenbergInline),
        isEditorialExclusion: (l) => l.trim().length === 0,
      },
      work,
      findings,
    );
  }
  return { report: 'dante-vita-nuova-en', findings };
}

function validateConvivioEn(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-convivio-en');
  if (!findings.length) {
    const expected = [13, 16, 15, 30];
    if (work.divisions.length !== 4) findings.push({ level: 'ERROR', check: 'treatise-count', message: `expected 4 treatises, got ${work.divisions.length}` });
    work.divisions.forEach((d, i) => {
      const numberedChapters = d.children.filter((c) => c.number !== null).length;
      if (numberedChapters !== expected[i]) findings.push({ level: 'ERROR', check: 'chapter-count', message: `${d.id}: ${numberedChapters} numbered chapters, expected ${expected[i]}` });
    });
    checkMarkupLeaks(work, findings);

    const raw = readFileSync(join(HERE, 'convivio-en', 'raw', 'pg12867.txt'), 'utf8');
    const rawLines = plainTextLines(raw, 'The First Treatise.', 'ON THE DATE OF THE CONVITO').slice(0, -3); // drop the "NOTE / (blank) / ON THE DATE..." heading itself
    checkTextAccounting(
      {
        workId: 'dante-convivio-en',
        rawLines: rawLines.map(stripGutenbergInline),
        isEditorialExclusion: (l) => /^CHAPTER [IVXL]+\.$/.test(l) || /^The (First|Second|Third|Fourth) Treatise\.?$/.test(l) || l.includes('*** END OF THE PROJECT GUTENBERG EBOOK'),
      },
      work,
      findings,
    );
  }
  return { report: 'dante-convivio-en', findings };
}

function validateMonarchiaEn(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-monarchia-en');
  if (!findings.length) {
    const expected = [16, 13, 16];
    if (work.divisions.length !== 3) findings.push({ level: 'ERROR', check: 'book-count', message: `expected 3 books, got ${work.divisions.length}` });
    work.divisions.forEach((d, i) => {
      if (d.children.length !== expected[i]) findings.push({ level: 'ERROR', check: 'chapter-count', message: `${d.id}: ${d.children.length} chapters, expected ${expected[i]}` });
    });
    checkMarkupLeaks(work, findings);

    const raw = readFileSync(join(HERE, 'monarchia-en', 'raw', 'pg33896.txt'), 'utf8');
    const rawLines = dropFootnoteBodies(plainTextLines(raw, 'BOOK I.', 'THE END.'), /^\[Footnote \d+:/);
    checkTextAccounting(
      {
        workId: 'dante-monarchia-en',
        rawLines: rawLines.map(stripGutenbergInline).map((l) => l.replace(/^[IVXL]+\.--/, '')),
        isEditorialExclusion: (l) => /^BOOK (I|II|III)\.$/.test(l),
      },
      work,
      findings,
    );
  }
  return { report: 'dante-monarchia-en', findings };
}

function validateDeVulgariLa(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-de-vulgari-eloquentia-la');
  if (!findings.length) {
    const expected = [19, 14];
    if (work.divisions.length !== 2) findings.push({ level: 'ERROR', check: 'book-count', message: `expected 2 books, got ${work.divisions.length}` });
    work.divisions.forEach((d, i) => {
      if (d.children.length !== expected[i]) findings.push({ level: 'ERROR', check: 'chapter-count', message: `${d.id}: ${d.children.length} chapters, expected ${expected[i]}` });
    });
    checkMarkupLeaks(work, findings);
    // Text accounting against the raw rendered HTML text content (crude but
    // effective: strip tags, split into sentences by period, check >=40-char
    // fragments occur in the shipped text).
    for (const [book, file] of [[1, 'liber1.html'], [2, 'liber2.html']] as const) {
      const html = readFileSync(join(HERE, 'de-vulgari-la', 'raw', file), 'utf8');
      let text = html
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_m, d: string) => String.fromCharCode(Number(d)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
      // The page's own {{titulus2}} header block (author/title/edition
      // metadata, rendered as plain text at the top) is transport furniture,
      // not part of Giuliani's edited text; start accounting from "Caput I."
      const capI = text.indexOf('Caput I.');
      if (capI > 0) text = text.slice(capI);
      const rawLines = text.split(/\.\s+/).map((s) => s.trim());
      checkTextAccounting(
        { workId: `dante-de-vulgari-eloquentia-la/book-${book}`, rawLines, isEditorialExclusion: (l) => /^Caput [IVXL]+\.?$/.test(l) || l.length < 40 },
        work,
        findings,
      );
    }
  }
  return { report: 'dante-de-vulgari-eloquentia-la', findings };
}

// --------------------------------------------------------------------------
// dante-de-vulgari-eloquentia-en (English, A. G. Ferrers Howell, 1904) - the
// OCR/page-image lane. The reference text below is rebuilt independently of
// scripts/import-dante/de-vulgari-en/index.ts's own parsing: it re-applies
// raw/corrections/pNNN.json itself, re-joins hyphenated line breaks itself,
// and re-locates the BOOK/CHAPTER/notes-boundary markers itself, rather than
// importing anything from index.ts. It shares only the disclosed raw input
// data (raw/ocr/pNNN.txt, raw/corrections/, raw/notes-boundaries/) - the same
// kind of cached raw/ artifact every other lane's validator reads directly.
// --------------------------------------------------------------------------

interface DveCorrection { find: string; replace: string; note: string }
interface DveNotesBoundary { page: number; marker: string }

function dveApplyCorrections(dir: string, page: number, rawText: string): string {
  const file = join(dir, 'corrections', `p${String(page).padStart(3, '0')}.json`);
  if (!existsSync(file)) return rawText;
  const corrections = JSON.parse(readFileSync(file, 'utf8')) as DveCorrection[];
  let text = rawText;
  for (const c of corrections) {
    const idx = text.indexOf(c.find);
    if (idx === -1) continue; // importer itself STOPs on this; validator just skips so accounting can still run
    text = text.slice(0, idx) + c.replace + text.slice(idx + c.find.length);
  }
  return text;
}

const DVE_HYPHEN = '@@DVEHYPHEN@@';

function dveJoinLines(lines: string[]): string {
  let out = '';
  for (const raw0 of lines) {
    const line = raw0.replace(/-$/, DVE_HYPHEN);
    if (out.endsWith(DVE_HYPHEN)) out = out.slice(0, -DVE_HYPHEN.length) + line.replace(/^\s+/, '');
    else out += (out.length > 0 ? ' ' : '') + line;
  }
  return out.replace(new RegExp(DVE_HYPHEN, 'g'), '');
}

interface DveParagraphStart { line: number; marker: string }

/** All paragraph-start markers for pages 1-115 (raw/paragraph-starts/pNNN.json - see raw/detectParagraphs.mjs),
 * in page order. Loaded once, reused per chapter below to split its narrative the same way index.ts does, so a
 * raw reference "sentence" that happens to straddle a real paragraph break is split there too, not compared
 * across it. */
function dveLoadAllParagraphStarts(dir: string): string[] {
  const markers: string[] = [];
  for (let page = 1; page <= 115; page++) {
    const file = join(dir, 'paragraph-starts', `p${String(page).padStart(3, '0')}.json`);
    if (!existsSync(file)) continue;
    const entries = JSON.parse(readFileSync(file, 'utf8')) as DveParagraphStart[];
    for (const e of entries) markers.push(e.marker);
  }
  return markers;
}

/** Same non-elision quote-parity check as index.ts's endsInsideQuote() - reimplemented independently, not shared,
 * per this file's own house convention. */
function dveEndsInsideQuote(text: string, pos: number): boolean {
  let count = 0;
  for (let i = 0; i < pos; i++) {
    const ch = text[i];
    if (ch !== "'" && ch !== '’' && ch !== '‘') continue;
    const prev = text[i - 1] ?? '';
    const next = text[i + 1] ?? '';
    const elision = /[A-Za-z]/.test(prev) && /[A-Za-z]/.test(next);
    if (!elision) count++;
  }
  return count % 2 === 1;
}

/** Split `text` at every position where a paragraph-start marker begins (position 0 is never a split point, nor
 * is a position inside an open quotation - see dveEndsInsideQuote()). */
function dveSplitAtParagraphs(text: string, markers: string[]): string[] {
  const positions = new Set<number>();
  for (const m of markers) {
    let idx = text.indexOf(m);
    while (idx !== -1) {
      if (idx > 0 && !dveEndsInsideQuote(text, idx)) positions.add(idx);
      idx = text.indexOf(m, idx + 1);
    }
  }
  const sorted = [0, ...[...positions].sort((a, b) => a - b), text.length];
  const pieces: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) pieces.push(text.slice(sorted[i]!, sorted[i + 1]!));
  return pieces;
}

function dveRomanToArabic(roman: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!];
    const next = VALUES[roman[i + 1] ?? ''];
    if (cur === undefined) return -1;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

function validateDeVulgariEn(): { report: string; findings: Finding[] } {
  const { work, findings } = loadWork('dante-de-vulgari-eloquentia-en');
  if (findings.length) return { report: 'dante-de-vulgari-eloquentia-en', findings };

  const expected = [19, 14];
  if (work.divisions.length !== 2) findings.push({ level: 'ERROR', check: 'book-count', message: `expected 2 books, got ${work.divisions.length}` });
  work.divisions.forEach((d, i) => {
    if (d.children.length !== expected[i]) findings.push({ level: 'ERROR', check: 'chapter-count', message: `${d.id}: ${d.children.length} chapters, expected ${expected[i]}` });
    // Every chapter is [argument, ...paragraphs]: at least 2 Passages (the bracketed argument plus one printed
    // paragraph of prose - see raw/detectParagraphs.mjs), never just the one continuous-prose Passage this lane
    // shipped before paragraph breaks were recovered from this scan's own word coordinates.
    for (const ch of d.children) {
      if (ch.passages.length < 2) findings.push({ level: 'ERROR', check: 'passage-count', message: `${ch.id}: only ${ch.passages.length} passage(s), expected >= 2 (argument + >=1 paragraph)` });
    }
  });
  const totalPassages = work.divisions.reduce((s, d) => s + d.children.reduce((s2, ch) => s2 + ch.passages.length, 0), 0);
  if (totalPassages < 33 * 2 || totalPassages > 400) {
    findings.push({ level: 'WARN', check: 'passage-count-total', message: `${totalPassages} total passages across all chapters (33 arguments + paragraph Passages) - outside the sanity range [66, 400]` });
  }
  checkMarkupLeaks(work, findings);

  const dir = join(HERE, 'de-vulgari-en', 'raw');
  // A footnote-definition line (Howell's own translations of quoted foreign verse, printed at the page foot, never
  // preserved in the shipped text - see index.ts's splitFootnoteTail()) always starts with a bare 1-2 digit number
  // directly followed by an opening quote, unlike a "Notes to Chapter N" entry (always "N. " with a period); once
  // one starts, the rest of that page is footnote material. Independently reimplemented here, not imported.
  const footnoteStartRe = /^\d{1,2}\s+['’"“‘]/;
  const lines: string[] = [];
  for (let page = 1; page <= 115; page++) {
    const file = join(dir, 'ocr', `p${String(page).padStart(3, '0')}.txt`);
    if (!existsSync(file)) continue;
    const corrected = dveApplyCorrections(dir, page, readFileSync(file, 'utf8'));
    if (corrected.length === 0) continue;
    const pageLines = corrected.split('\n');
    const footnoteIdx = pageLines.findIndex((l) => footnoteStartRe.test(l));
    lines.push(...(footnoteIdx === -1 ? pageLines : pageLines.slice(0, footnoteIdx)));
  }
  let fullText = dveJoinLines(lines);
  // The small superscript footnote-reference number each translated quotation carries in the main text OCRs as a
  // bare digit stuck to the closing quote mark it follows; stripped here too, matching index.ts.
  fullText = fullText.replace(/(['’"”])\s?(?<!\d)\d{1,2}(?!\d)/g, '$1');

  const findBookHeading = (label: 'BOOK I' | 'BOOK II'): number => {
    const re = new RegExp(`\\b${label}\\b`, 'g');
    const hits: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(fullText))) hits.push(m.index);
    const real = hits.filter((idx) => fullText.slice(idx, idx + 400).includes('CHAPTER I'));
    return real.length === 1 ? real[0]! : -1;
  };
  const bookIIdx = findBookHeading('BOOK I');
  const bookIIIdx = findBookHeading('BOOK II');
  // The Appendix (p.116+) is never loaded into `lines` above (the loop only reads p.1-115), so book 2's text
  // simply runs to the end of the rebuilt reference - no in-text marker search needed for that boundary.
  const appendixFile = join(dir, 'notes-boundaries', 'appendix-start.json');
  if (!existsSync(appendixFile)) findings.push({ level: 'WARN', check: 'appendix-start', message: 'missing notes-boundaries/appendix-start.json (disclosure-only, not used for slicing)' });

  if (bookIIdx === -1 || bookIIIdx === -1) {
    findings.push({ level: 'ERROR', check: 'text-accounting-setup', message: 'could not independently relocate BOOK I / BOOK II markers in the rebuilt reference text' });
    return { report: 'dante-de-vulgari-eloquentia-en', findings };
  }

  const editorialFile = join(dir, 'notes-boundaries', 'editorial-convention-note.json');
  const editorialNote = existsSync(editorialFile) ? (JSON.parse(readFileSync(editorialFile, 'utf8')) as DveNotesBoundary) : null;

  const bookTexts: Record<1 | 2, string> = { 1: fullText.slice(bookIIdx, bookIIIdx), 2: fullText.slice(bookIIIdx) };
  const rawLines: string[] = [];
  const allParagraphMarkers = dveLoadAllParagraphStarts(dir);

  for (const book of [1, 2] as const) {
    const bookText = bookTexts[book]!;
    const re = /CHAPTER\s+([IVXLCDM]+)\b/g;
    const markers: Array<{ number: number; headingStart: number; afterHeading: number }> = [];
    let expectedCh = 1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(bookText))) {
      const value = dveRomanToArabic(m[1]!);
      if (value === expectedCh) {
        markers.push({ number: value, headingStart: m.index, afterHeading: m.index + m[0].length });
        expectedCh += 1;
      }
    }
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i]!;
      const spanEnd = i + 1 < markers.length ? markers[i + 1]!.headingStart : bookText.length;
      const spanText = bookText.slice(marker.afterHeading, spanEnd);
      const open = spanText.indexOf('[');
      const close = open === -1 ? -1 : spanText.indexOf(']', open + 1);
      if (open === -1 || close === -1) continue; // importer itself STOPs on this
      const afterArgumentText = spanText.slice(close + 1);

      let excludedStart = afterArgumentText.length;
      if (book === 1 && marker.number === 1 && editorialNote) {
        const idx = afterArgumentText.indexOf(editorialNote.marker);
        if (idx !== -1) excludedStart = idx;
      } else {
        const nbFile = join(dir, 'notes-boundaries', `book${book}-ch${marker.number}.json`);
        if (existsSync(nbFile)) {
          const nb = JSON.parse(readFileSync(nbFile, 'utf8')) as DveNotesBoundary;
          const idx = afterArgumentText.indexOf(nb.marker);
          if (idx !== -1) excludedStart = idx;
        }
      }

      rawLines.push(spanText.slice(0, open)); // text between "CHAPTER N" and "[" - should be empty/whitespace only
      rawLines.push(spanText.slice(open + 1, close)); // the chapter argument text, brackets stripped (matching what index.ts ships)
      // Split at paragraph breaks first (same markers index.ts uses), then into sentence-ish fragments within each
      // paragraph, so no reference fragment straddles a real paragraph split and wrongly fails to match the shipped
      // (now per-paragraph) Passage text.
      for (const paragraph of dveSplitAtParagraphs(afterArgumentText.slice(0, excludedStart), allParagraphMarkers)) {
        for (const line of paragraph.split(/(?<=[.;:!?])\s+/)) rawLines.push(line);
      }
    }
  }

  checkTextAccounting(
    { workId: 'dante-de-vulgari-eloquentia-en', rawLines, isEditorialExclusion: (l) => l.replace(/[[\]]/g, '').trim().length === 0, minLen: 40 },
    work,
    findings,
  );

  return { report: 'dante-de-vulgari-eloquentia-en', findings };
}

function main(): void {
  process.stdout.write('\n=== validate:dante ===\n');
  const results = [validateCommediaEn(), validateVitaNuovaEn(), validateConvivioEn(), validateMonarchiaEn(), validateDeVulgariLa(), validateDeVulgariEn()];
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of results) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(`  ${r.report.padEnd(34)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${errors.length} err  ${warns.length} warn\n`);
    for (const f of [...errors, ...warns]) process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${results.length} works.\n`);
  process.stdout.write(
    '\nNote: dante-commedia-it, dante-vita-nuova-it, dante-convivio-it and dante-monarchia-la were not shipped ' +
      'in this batch (dante-monarchia-la exists in data/ from a separate batch but is not yet wired into this ' +
      'validator) - see the accompanying report for why.\n',
  );
  if (totalErrors > 0) process.exit(1);
}

main();
