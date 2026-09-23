/**
 * PLAIN-WIKITEXT chapter parser for the English Wikisource pages of the
 * Oxford "Works of Aristotle" translations imported by this batch.
 *
 * WHY A PLAIN-WIKITEXT PARSER AND NOT THE PAGE-SCAN ONE
 * =====================================================
 * This batch's brief anticipated that most of these works would be page-scan
 * transclusions (like data/metaphysics-en and data/categoriae-en, whose pages
 * carry only a `<pages index="..." from=X to=Y />` marker in wikitext and
 * must therefore be fetched as RENDERED HTML via action=parse&prop=text).
 * Direct inspection of every page in this batch found that is true for only
 * some of them. The following works are, as of this import (2026-09-22),
 * ORDINARY WIKITEXT on English Wikisource - `action=parse&prop=wikitext`
 * returns 24 KB-102 KB of real prose, not a `<pages/>` marker:
 *
 *   On the Heavens/Book I-IV                    (Stocks)
 *   On the Generation of Animals/Book I-V       (Platt)
 *   On the Parts of Animals/Book I-IV           (Ogle)
 *   History of Animals (Thompson)/Book I-IX     (D'Arcy W. Thompson)
 *   On Sense and the Sensible/Section I-II      (Beare)
 *   On Memory and Reminiscence                  (Beare)
 *   On Sleep and Sleeplessness                  (Beare)
 *   On Dreams (Aristotle)                       (Beare)
 *   On Prophesying by Dreams                    (Beare)
 *   On Longevity and Shortness of Life          (Beare)
 *   On Youth and Old Age / On Life and Death / On Breathing   (Beare/Ross)
 *   On the Movement of Animals                  (Farquharson)
 *   On the Progression of Animals               (Farquharson)
 *
 * They are the same public-domain Oxford translations, but as a plaintext
 * digitisation rather than a proofread djvu page-scan transclusion; each
 * importer's about.json discloses that explicitly rather than claiming a
 * page-scan provenance it does not have.
 *
 * CHAPTER-MARKER SHAPES (all four confirmed by direct inspection; genuinely
 * mixed even within one work, so none of them is assumed)
 * ======================================================================
 *   A. `==Part N==` / `===Part N===`   - a real wiki heading.
 *      (On the Heavens all books; On the Parts of Animals all books;
 *       Generation of Animals Book I; History of Animals Books I, III, V, VI;
 *       Sense I-II, Memory, Sleep, Longevity, Youth, Life and Death,
 *       Breathing, Progression of Animals)
 *   B. a bare line `Part N` with NO `=` markup at all.
 *      (History of Animals Books II, IV, VII, VIII, IX; On Dreams)
 *   C. a bare line consisting only of the digits `N`.
 *      (Generation of Animals Books II-V)
 *   D. `==N==` - a wiki heading whose text is only the number.
 *      (On the Movement of Animals)
 * Shape B/C in particular mean a purely heading-driven parser would silently
 * return ZERO chapters for nine of this batch's book pages, so all four are
 * handled in one pass and the shape actually used is reported back to the
 * caller for disclosure.
 *
 * Everything that is not a chapter marker and not recognised furniture is
 * treated as reading text. Recognised furniture (each occurrence counted and
 * reported, never silently dropped):
 *   - the leading `{{header ...}}` block
 *   - a `Book N` / `BOOK N` title line, and a centred treatise-title template
 *   - `==External links==` / `==Notes==` trailing sections
 *   - interwiki `[[el:...]]` / `[[Category:...]]` links
 *   - licence/scan-status templates ({{translation license}}, {{PD-old}},
 *     {{PD/US}}, {{PD-US}}, {{no scan}}, {{incomplete}}, {{scans available}})
 *   - typographic furniture ({{dhr}}, {{rule}}, {{ppb}}, {{smallrefs}},
 *     and `{{center|'''THE END'''}}`, the printer's end-of-treatise mark)
 * Translator apparatus removed (counted, content NOT preserved, matching this
 * library's other English translations): `<ref>...</ref>` footnotes.
 *
 * An UNKNOWN template makes the parser STOP with a loud error rather than
 * guess - it is never silently unwrapped or silently dropped.
 */

import { cleanText, type Anomaly } from './text.ts';

export type MarkerShape = 'wiki-heading-Part-N' | 'bare-line-Part-N' | 'bare-line-N' | 'wiki-heading-N';

export interface WtChapter {
  number: number;
  paragraphs: string[];
  /**
   * Bekker page/column tokens printed inside this chapter, in document order.
   * Only ONE plain-wikitext page in this batch prints any: On the Movement of
   * Animals, via `{{verse|verse=698a}}` markers. Everywhere else this is
   * empty and the importer sets Division.ref to null and says so.
   */
  bekkerMarkers: string[];
}

export interface WtResult {
  chapters: WtChapter[];
  anomalies: Anomaly[];
  /** how many `<ref>...</ref>` translator footnotes were stripped from the reading text */
  footnotesStripped: number;
  /** which marker shape(s) this page actually used */
  shapes: MarkerShape[];
  /** verbatim furniture lines skipped, for disclosure */
  furnitureSkipped: string[];
  /** a `==Heading==` that was neither a chapter marker nor recognised furniture (e.g. the treatise title) */
  otherHeadings: string[];
}

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (wikitext parser, ${where}): ${msg}\n`);
  process.exit(1);
}

/**
 * Templates that are pure transport/furniture: dropped entirely, content and
 * all. Every one was individually identified by censusing this batch's pages.
 */
const DROP_TEMPLATES = new Set([
  'header', 'translation license', 'pd-old', 'pd/us', 'pd-us', 'no scan', 'incomplete',
  'scans available', 'dhr', 'rule', 'ppb', 'smallrefs', 'center', 'c', 'auxiliary table of contents',
  'wp link', 'other translations', 'translations',
]);

/**
 * Templates whose *content* is genuine reading text and must be kept.
 *  - `{{SIC|he|be}}`: Wikisource's marker for "the print really says 'he'
 *    here, which looks like an error for 'be'". This repo never silently
 *    corrects a source, so the FIRST parameter (what the page actually
 *    prints) is kept and the editorial suggestion discarded.
 *  - `{{x-larger|…}}`, `{{xx-larger|…}}`, `{{uc|…}}`, `{{larger|…}}`: pure
 *    typographic sizing around text.
 *  - `{{ppoem|1={italic}\n…}}`: On Breathing's block quotation of Empedocles'
 *    verses in Aristotle's own text (genuine translated content, not
 *    apparatus) - the `1=` and `{italic}` formatting directives are stripped
 *    and the verse lines kept.
 */
const KEEP_FIRST_PARAM = new Set(['sic']);
const KEEP_LAST_PARAM = new Set(['x-larger', 'xx-larger', 'uc', 'larger', 'smaller']);

/** Strip the page's leading `{{header ... }}` block (present on every page in this batch). */
function stripHeader(wikitext: string, where: string): string {
  const m = /^\s*\{\{header\b/i.exec(wikitext);
  if (!m) return wikitext; // some pages put {{scans available}} first; handled by the generic pass
  let depth = 0;
  for (let i = wikitext.indexOf('{{'); i < wikitext.length - 1; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i++; continue; }
    if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--; i++;
      if (depth === 0) return wikitext.slice(i + 1);
      continue;
    }
  }
  return fail(where, '{{header ...}} template is never closed');
}

/**
 * Expand/drop every `{{...}}` template, innermost first. Unknown names stop
 * the run rather than being guessed at.
 *
 * This walks brace pairs explicitly rather than matching `\{\{([^{}]*)\}\}`,
 * because one template in this batch legitimately contains SINGLE braces in
 * its body: On Breathing's `{{ppoem|1={italic} ...}}`, which wraps Aristotle's
 * quotation of Empedocles. A "no braces inside" regex never matches that, so
 * the template would survive unexpanded and abort the import.
 */
function resolveTemplates(s: string, where: string, dropped: string[]): string {
  let out = s;
  for (let guard = 0; guard < 200; guard++) {
    const close = out.indexOf('}}');
    if (close === -1) break;
    const open = out.lastIndexOf('{{', close);
    if (open === -1) break;
    const inner = out.slice(open + 2, close);
    out = out.slice(0, open) + resolveOneTemplate(inner, where, dropped) + out.slice(close + 2);
  }
  if (/\{\{/.test(out)) fail(where, `unbalanced template braces survived expansion in ${JSON.stringify(out.slice(0, 200))}`);
  return out;
}

/**
 * Can `s` be fully resolved, i.e. does every `{{` have a matching `}}`?
 * Used only by the boundary probe, to tell "furniture" from "a multi-line
 * template that has not finished arriving yet" without aborting the import.
 */
function templatesResolvable(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === '{' && s[i + 1] === '{') { depth++; i++; continue; }
    if (s[i] === '}' && s[i + 1] === '}') { depth--; i++; if (depth < 0) return false; }
  }
  return depth === 0;
}

function resolveOneTemplate(inner: string, where: string, dropped: string[]): string {
  const parts = inner.split('|');
  const name = (parts[0] ?? '').trim().toLowerCase();
  if (DROP_TEMPLATES.has(name)) { dropped.push(`{{${name}}}`); return ' '; }
  if (name === 'ppoem') {
    // Aristotle's quotation of Empedocles' verses (genuine translated content,
    // not apparatus): keep the body, strip the `1=` and `{italic}` directives.
    return ` ${parts.slice(1).join('|').replace(/^\s*1\s*=\s*/, '').replace(/\{[a-z-]+\}/gi, ' ')} `;
  }
  if (KEEP_FIRST_PARAM.has(name)) return ` ${(parts[1] ?? '').trim()} `;
  if (KEEP_LAST_PARAM.has(name)) return ` ${(parts[parts.length - 1] ?? '').trim()} `;
  if (name === 'verse') return ' '; // Bekker page marker; captured separately by the caller
  return fail(where, `unknown template "{{${name}}}" in ${JSON.stringify(inner.slice(0, 90))} - refusing to guess whether it is furniture or reading text`);
}

/** Remove `<ref>...</ref>` apparatus and `<references/>`; returns the text and the count removed. */
function stripFootnotes(s: string): { text: string; count: number } {
  let count = 0;
  let out = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, () => { count++; return ' '; });
  out = out.replace(/<ref[^>]*\/>/gi, () => { count++; return ' '; });
  out = out.replace(/<references\s*\/?>/gi, ' ');
  return { text: out, count };
}

/**
 * Unwrap `[[link|display]]`, `''italics''`, `'''bold'''` and inline HTML tags.
 *
 * The final rule handles a real defect in one of this batch's sources: On the
 * Parts of Animals Book II's transcription stops mid-sentence and leaves a
 * half-written opening tag (`...nature decks it with <A`) dangling at the very
 * end. That fragment is transport debris, not a word Ogle wrote, so an
 * UNTERMINATED trailing tag is removed too - but only at the end of the text,
 * so a legitimate "<" inside prose is never eaten.
 */
function unwrapInline(s: string): string {
  return s
    .replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1')
    .replace(/\[(?:https?|\/\/)[^\s\]]*\s*([^\]]*)\]/g, '$1')
    .replace(/'''''|'''|''/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/<\/?[a-zA-Z][^>]*$/, '');
}

const RE_HEADING = /^\s*(={2,6})\s*(.+?)\s*\1\s*$/;
const RE_PART_TEXT = /^Part\s+(\d{1,3})$/i;
const RE_BARE_NUMBER = /^(\d{1,3})$/;
const RE_BOOK_LINE = /^BOOK\s+[IVXLCDM]+$/i;
/**
 * The printer's end-of-treatise mark. Most pages in this batch wrap it as
 * `{{center|'''THE END'''}}` (dropped with that template), but On the
 * Movement of Animals prints it as a bare line of its own, where it would
 * otherwise be read as a one-word paragraph of Aristotle's text.
 */
const RE_THE_END = /^THE\s+END$/;
const RE_DROP_SECTION = /^(external\s+links?|notes|references|see\s+also)$/i;
const RE_INTERWIKI = /^\[\[(?:[a-z-]{2,12}|Category|File|Image):[^\]]*\]\]$/i;

/**
 * Parse one plain-wikitext Wikisource page into numbered chapters.
 *
 * `where` is the anomaly-log label for this page (e.g. "de-caelo-en / book-1").
 */
export function parseWikitextChapters(wikitext: string, where: string): WtResult {
  const anomalies: Anomaly[] = [];
  const furnitureSkipped: string[] = [];
  const otherHeadings: string[] = [];
  const shapes = new Set<MarkerShape>();
  const droppedTemplates: string[] = [];

  const body = stripHeader(wikitext, where);
  const { text: noRefs, count: footnotesStripped } = stripFootnotes(body);

  const chapters: WtChapter[] = [];
  let cur: WtChapter | null = null;
  let inDroppedSection = false;
  let pendingParagraph: string[] = [];

  function flushParagraph(): void {
    if (pendingParagraph.length === 0) return;
    const raw = pendingParagraph.join('\n');
    pendingParagraph = [];
    // Bekker page markers, where the source prints any: On the Movement of
    // Animals uses `{{verse|verse=698a}}`. Captured BEFORE the template pass
    // (which drops the marker from the reading text, where it is furniture).
    const verses = [...raw.matchAll(/\{\{verse\s*\|\s*verse\s*=\s*([0-9]{3,4}[ab]?)\s*\}\}/gi)].map((m) => m[1]!);
    const resolved = resolveTemplates(raw, where, droppedTemplates);
    const text = cleanText(unwrapInline(resolved));
    if (text.length === 0 && verses.length === 0) return;
    if (!cur) {
      // Reading text before any chapter marker: never dropped silently.
      anomalies.push({ where, note: `Text found before the page's first chapter marker was kept as chapter 1's opening (source prints no marker there): ${JSON.stringify(text.slice(0, 80))}` });
      cur = { number: 1, paragraphs: [], bekkerMarkers: [] };
      chapters.push(cur);
      shapes.add('bare-line-N');
    }
    cur.bekkerMarkers.push(...verses);
    if (text.length > 0) cur.paragraphs.push(text);
  }

  /**
   * True when the lines buffered so far hold actual reading text, as opposed
   * to furniture-only lines such as a lone `{{dhr}}` spacer. Used to decide
   * whether a bare "Part N" / "N" line sits at a genuine paragraph boundary.
   *
   * Two properties matter here, both learned the hard way:
   *  - It is side-effect free: dropped-template names go to a throwaway array,
   *    so probing never double-counts furniture in the anomaly log.
   *  - It is TOLERANT. The buffer is frequently a HALF-READ multi-line
   *    template (e.g. the first line of `{{translation license` before its
   *    ` | original = {{PD-old}}` lines arrive), which cannot resolve yet.
   *    That is not an error, so the probe must not abort the import; it
   *    answers "yes, text is pending", the conservative choice, which can
   *    only ever refuse to treat a line as a chapter marker - and a bare
   *    "Part N" marker never occurs inside a template block anyway.
   * It is also called LAZILY, only once a line has already matched a bare
   * marker pattern, so ordinary prose lines never pay for it.
   */
  function pendingHasReadingText(): boolean {
    if (pendingParagraph.length === 0) return false;
    const raw = pendingParagraph.join('\n');
    if (!templatesResolvable(raw)) return true;
    return cleanText(unwrapInline(resolveTemplates(raw, where, []))).length > 0;
  }

  function startChapter(n: number, shape: MarkerShape): void {
    flushParagraph();
    shapes.add(shape);
    cur = { number: n, paragraphs: [], bekkerMarkers: [] };
    chapters.push(cur);
  }

  for (const rawLine of noRefs.split('\n')) {
    const line = rawLine.trim();

    if (line.length === 0) { flushParagraph(); continue; }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      flushParagraph();
      const label = heading[2]!.replace(/'''|''/g, '').trim();
      if (RE_DROP_SECTION.test(label)) { inDroppedSection = true; furnitureSkipped.push(`==${label}==`); continue; }
      inDroppedSection = false;
      const part = RE_PART_TEXT.exec(label);
      if (part) { startChapter(Number(part[1]), 'wiki-heading-Part-N'); continue; }
      const bare = RE_BARE_NUMBER.exec(label);
      if (bare) { startChapter(Number(bare[1]), 'wiki-heading-N'); continue; }
      otherHeadings.push(label);
      continue;
    }
    if (inDroppedSection) continue;

    if (RE_INTERWIKI.test(line)) { furnitureSkipped.push(line); continue; }
    if (RE_BOOK_LINE.test(line)) { furnitureSkipped.push(line); continue; }
    if (RE_THE_END.test(line)) { flushParagraph(); furnitureSkipped.push(line); continue; }

    // Shapes B and C: a marker that is a whole line of its own, with no wiki
    // markup. Only accepted when it is the ENTIRE line - "So much for
    // molluscs." and similar short sentences must never be mistaken for one -
    // and only at a real paragraph boundary. "Boundary" means no READING TEXT
    // is pending, not merely no lines: On Dreams puts a `{{dhr}}` spacing
    // template on the line immediately above each "Part N" with no blank line
    // between, and treating that furniture as pending text would have silently
    // swallowed chapters 2 and 3 of that treatise.
    // A line made up ENTIRELY of furniture templates that render no text -
    // in practice `{{dhr}}` (a vertical spacer) and `{{rule}}` - is a
    // paragraph separator in its own right, exactly like a blank line. It
    // must flush, because On Dreams places `{{dhr}}` directly under the last
    // line of a paragraph with no blank line between, and then the bare
    // "Part N" marker on the very next line: without this, that paragraph
    // would still be "pending" and chapters 2 and 3 would be swallowed into
    // chapter 1. A line holding an UNFINISHED multi-line template (e.g. a
    // lone `{{translation license`) is not resolvable and so is not treated
    // this way; it simply buffers until its closing braces arrive.
    if (/\{\{/.test(line) && templatesResolvable(line)) {
      const rendered = cleanText(unwrapInline(resolveTemplates(line, where, [])));
      if (rendered.length === 0) { flushParagraph(); furnitureSkipped.push(line); continue; }
    }

    const barePart = RE_PART_TEXT.exec(line);
    if (barePart && !pendingHasReadingText()) { startChapter(Number(barePart[1]), 'bare-line-Part-N'); continue; }
    const bareNum = RE_BARE_NUMBER.exec(line);
    if (bareNum && !pendingHasReadingText()) { startChapter(Number(bareNum[1]), 'bare-line-N'); continue; }

    pendingParagraph.push(rawLine);
  }
  flushParagraph();

  if (droppedTemplates.length > 0) {
    const counts = new Map<string, number>();
    for (const t of droppedTemplates) counts.set(t, (counts.get(t) ?? 0) + 1);
    anomalies.push({
      where,
      note: `Wikisource furniture templates dropped from the reading text (transport scaffolding only, no translated words removed): ${[...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([t, n]) => `${t} x${n}`).join(', ')}.`,
    });
  }
  if (furnitureSkipped.length > 0) {
    anomalies.push({
      where,
      note: `${furnitureSkipped.length} page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): ${[...new Set(furnitureSkipped)].join(' | ')}.`,
    });
  }
  if (otherHeadings.length > 0) {
    anomalies.push({
      where,
      note: `${otherHeadings.length} non-chapter wiki heading(s) skipped as page furniture (the source's own treatise-title banner, not Aristotle's text): ${otherHeadings.map((h) => JSON.stringify(h)).join(', ')}.`,
    });
  }
  if (footnotesStripped > 0) {
    anomalies.push({
      where,
      note: `${footnotesStripped} translator/editorial footnote marker(s) (<ref>...</ref>) removed from the reading text; the footnotes are apparatus, not Aristotle's words, and their content is not preserved anywhere in this build.`,
    });
  }

  return { chapters, anomalies, footnotesStripped, shapes: [...shapes], furnitureSkipped, otherHeadings };
}
