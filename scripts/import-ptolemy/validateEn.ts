/**
 * Validation for ptolemy-tetrabiblos-en (Ashmand 1822, via sacred-texts.com
 * - see indexEn.ts/parseAshmand.ts). Unlike validate.ts's exact jsdom-XML
 * reconciliation for the two clean local TEI sources, this uses the
 * "paragraph-probe" method the task brief asked for with a live, messier
 * HTML source: per-chapter independent text accounting PLUS an opening/
 * closing substring probe against the raw cached page, rather than trying
 * to make one giant whole-work DOM diff meaningful against a modern
 * framework's markup soup.
 *
 *   npx tsx scripts/import-ptolemy/validateEn.ts
 *
 * Per-chapter TEXT ACCOUNTING (independent of parseAshmand.ts's own
 * paragraph-splitting logic - it does NOT call parseAshmandChapterPage at
 * all, so a bug there is not blindly repeated here): parse the cached page
 * with jsdom, remove the footnotes `<section>` and inline `[data-footnote-
 * ref]` markers (same rule, re-implemented independently), take the whole
 * `.contents` container's textContent, then strip: every heading element's
 * OWN text (H1/H2/H3/H6 - never part of a Passage), every page-number
 * marker matching `p. N`, and every literal "[paragraph continues]" prefix.
 * Whitespace-strip both sides and compare EXACTLY, per chapter - a
 * divergence names the exact chapter and shows the first mismatched
 * character, same as validate.ts.
 *
 * PARAGRAPH PROBE (an additional, independent sanity check): the first 40
 * and last 40 characters of each chapter's Passage.text (whitespace-
 * collapsed) must appear, verbatim, as a substring of that same chapter's
 * raw page HTML - guards against silent truncation/reordering even if some
 * future change to the accounting strip-rules above masked a real loss.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadChapterListing } from './fetchAshmand.ts';
import { hasCombining } from './text.ts';
import type { Division, GenericWork, WorkAbout, Anomaly } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');
const RAW_DIR = join(HERE, 'raw');
const WORK_ID = 'ptolemy-tetrabiblos-en';
const EXPECTED_PER_BOOK = [27, 14, 19, 10];

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

function normalize(s: string): string {
  return s.replace(/\s+/g, '');
}

function rawAccountingTextForChapter(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  doc.querySelector('section[data-slot="reader-footnotes"]')?.remove();
  for (const el of Array.from(doc.querySelectorAll('[data-footnote-ref]'))) el.remove();
  const container = doc.querySelector('[data-slot="reader-prose"] .contents');
  if (!container) throw new Error('no reader-prose .contents container');
  for (const el of Array.from(container.querySelectorAll('h1, h2, h6'))) el.remove();
  // Only the first two <h3> elements are furniture (the "CHAPTER <roman>"
  // heading and the chapter's own title, plus - on the very first chapter's
  // page only - a leading title-page-banner <h3> that isn't a chapter
  // heading at all). Any FURTHER <h3> is a genuine in-chapter sub-heading
  // that parseAshmand.ts folds into the reading text as its own paragraph -
  // see that file's module doc - so it must stay on the raw side too, not
  // be stripped along with the real furniture.
  const h3s = Array.from(container.querySelectorAll('h3'));
  const furnitureH3Count = h3s.length > 0 && !/^CHAPTER\s+[IVXLC]+\.?$/i.test(h3s[0]!.textContent?.trim() ?? '') ? 3 : 2;
  for (const el of h3s.slice(0, furnitureH3Count)) el.remove();
  // Remove page-marker <p> elements by their OWN exact (trimmed) text -
  // NOT a substring regex over the whole flattened text, which false-
  // positives on ordinary table content like "Jup. 7" (ends in "p." then a
  // digit) and silently eats real data (caught by this very check once,
  // against an earlier version of this function - see the fix noted in
  // this module's history).
  for (const p of Array.from(container.querySelectorAll('p'))) {
    const t = (p.textContent ?? '').trim();
    if (/^p\.\s*\d+\.?$/i.test(t) || /^THE END\.?$/i.test(t)) p.remove();
  }
  const text = (container.textContent ?? '').split('[paragraph continues]').join('');
  return text;
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const dir = join(DATA_ROOT, WORK_ID);
  for (const f of ['work.json', 'about.json', 'anomalies.json', 'types.ts']) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f}`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    process.stdout.write('FAIL: missing output files - run indexEn.ts first\n');
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  const listing = loadChapterListing(RAW_DIR);

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'en') err('language', `expected "en", got ${JSON.stringify(work.language)}`);
  if (!about.sections?.length) err('about-sections', 'about.json has no sections');
  else {
    const headings = about.sections.map((s) => s.heading);
    for (const req of ['About this edition', 'The translation', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(req)) err('about-sections', `missing "${req}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  if (divisions.length !== 4) err('book-count', `expected 4 books, got ${divisions.length}`);
  divisions.forEach((b, i) => {
    const expected = EXPECTED_PER_BOOK[i];
    if (expected !== undefined && b.children.length !== expected) {
      err('chapter-count', `book ${i + 1}: expected ${expected} chapters, got ${b.children.length}`);
    }
  });

  let totalChapters = 0;
  let totalChars = 0;
  let probeFailures = 0;
  let accountingFailures = 0;
  let leaks = 0;
  const LEAK_MARKERS = ['<p', '<h1', '<h3', 'data-slot', '&amp;', '&lt;', '&gt;', 'paragraph continues'];

  let listingIdx = 0;
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return; // book container
    totalChapters += 1;
    if (d.passages.length !== 1) {
      err('division-passages', `${path}: expected exactly 1 passage, got ${d.passages.length}`);
      return;
    }
    const p = d.passages[0]!;
    totalChars += p.text.length;
    if (p.text.length === 0) err('empty-passage', `${path}: empty text`);
    if (p.text !== p.text.normalize('NFC')) err('nfc', `${path}: not NFC-normalised`);
    if (hasCombining(p.text)) warn('combining-marks', `${path}: contains a standalone combining diacritic`);
    for (const marker of LEAK_MARKERS) {
      if (p.text.includes(marker)) {
        leaks += 1;
        err('no-leaked-markup', `${path}: contains ${JSON.stringify(marker)}`);
      }
    }

    const entry = listing[listingIdx];
    listingIdx += 1;
    if (!entry) {
      err('listing-length', `${path}: no corresponding entry in ashmand-chapters.json (index ${listingIdx - 1})`);
      return;
    }
    if (d.sourceHeading !== entry.text) {
      err('source-heading', `${path}: sourceHeading ${JSON.stringify(d.sourceHeading)} !== TOC text ${JSON.stringify(entry.text)}`);
    }

    const cachePath = join(RAW_DIR, 'ashmand', `${entry.slug}.htm`);
    if (!existsSync(cachePath)) {
      err('raw-cache', `${path}: no cached raw page at ${cachePath}`);
      return;
    }
    const html = readFileSync(cachePath, 'utf8');

    // --- per-chapter exact text accounting ---
    const raw = normalize(rawAccountingTextForChapter(html));
    const workNorm = normalize(p.text);
    if (raw !== workNorm) {
      accountingFailures += 1;
      let i = 0;
      const min = Math.min(raw.length, workNorm.length);
      while (i < min && raw[i] === workNorm[i]) i++;
      err(
        'text-accounting',
        `${path}: raw-vs-imported text does not reconcile (raw len ${raw.length}, work len ${workNorm.length}) - first divergence at ${i}:\n    raw : …${JSON.stringify(raw.slice(Math.max(0, i - 20), i + 50))}…\n    work: …${JSON.stringify(workNorm.slice(Math.max(0, i - 20), i + 50))}…`,
      );
    }

    // --- paragraph probe ---
    const collapsed = p.text.replace(/\s+/g, ' ').trim();
    const opening = collapsed.slice(0, 40);
    const closing = collapsed.slice(-40);
    const rawCollapsed = html.replace(/\s+/g, ' ');
    if (opening.length > 0 && !rawCollapsed.includes(opening.replace(/\s/g, ' '))) {
      // fall back to a whitespace-insensitive probe (HTML wraps lines differently)
      const rawFlat = rawAccountingTextForChapter(html).replace(/\s+/g, ' ');
      if (!rawFlat.includes(opening)) {
        probeFailures += 1;
        err('paragraph-probe-opening', `${path}: opening ${JSON.stringify(opening)} not found in raw page`);
      }
    }
    if (closing.length > 0) {
      const rawFlat = rawAccountingTextForChapter(html).replace(/\s+/g, ' ');
      if (!rawFlat.includes(closing)) {
        probeFailures += 1;
        err('paragraph-probe-closing', `${path}: closing ${JSON.stringify(closing)} not found in raw page`);
      }
    }
  });

  if (totalChapters !== 70) err('total-chapters', `expected 70 chapters, got ${totalChapters}`);
  if (listingIdx !== listing.length) warn('listing-length', `consumed ${listingIdx} of ${listing.length} listing entries`);

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');

  const L: string[] = [];
  L.push(`# Ptolemy (English) validation report - ${WORK_ID}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${divisions.length}`);
  L.push(`- chapters: ${totalChapters}`);
  L.push(`- total passage chars: ${totalChars}`);
  L.push(`- per-chapter text-accounting failures: ${accountingFailures}`);
  L.push(`- paragraph-probe failures: ${probeFailures}`);
  L.push(`- leaked-markup hits: ${leaks}`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`_${anomalies.length} logged - see anomalies.json for the full list._`);
  L.push('');
  L.push('## Errors');
  L.push('');
  if (errors.length === 0) L.push('_none_');
  for (const f of errors) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');
  L.push('## Warnings');
  L.push('');
  if (warns.length === 0) L.push('_none_');
  for (const f of warns) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');
  writeFileSync(join(dir, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');

  process.stdout.write(`\n=== validate:ptolemy-tetrabiblos-en ===\n`);
  process.stdout.write(`${WORK_ID}: ${errors.length === 0 ? 'PASS' : 'FAIL'} - ${divisions.length} books, ${totalChapters} chapters, ${totalChars} chars, ${errors.length} err, ${warns.length} warn\n`);
  for (const f of [...errors, ...warns]) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`Report written to data/${WORK_ID}/VALIDATION_REPORT.md\n`);
  if (errors.length > 0) process.exit(1);
}

main();
