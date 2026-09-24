/**
 * Validation for the 12-work Boethius corpus (Consolatio Philosophiae LA/EN
 * + five theological tractates LA/EN).
 *
 *   npx tsx scripts/import-boethius/validate.ts
 *
 * Two kinds of check, per work:
 *  1. STRUCTURE: workId/language match, division shape, Passage.n === '',
 *     Passage.ref === null, no empty passages, NFC-normalised, no leaked
 *     transport markup (stray "<", "&amp;", raw XML entities).
 *  2. TEXT ACCOUNTING (real identity check, not a containment sample): the
 *     CACHED RAW XML this work was built from is parsed with jsdom
 *     (`new JSDOM(xml, {contentType:'text/xml'})` - a real XML parse, not a
 *     regex sample), `teiHeader`/`note`/`bibl`/`head` elements are removed,
 *     and the remaining `textContent` is taken as the raw reading text -
 *     independently of the importer's own parser entirely. Both that raw
 *     text and the work's own concatenated output text are NFC-normalised
 *     and have ALL whitespace, bracket and quotation-mark characters
 *     stripped, and must then be BYTE-IDENTICAL (after removing the small,
 *     individually-named set of disclosed, deliberate editorial excisions -
 *     see KNOWN_EXCEPTIONS below - each removed from the raw side exactly
 *     once). Any remaining difference is a genuine miss: the run prints the
 *     first point of divergence with 60 characters of context on each side
 *     and FAILS. This is what caught the original bug (interlocutor
 *     dialogue turns sitting outside `<p>` were silently dropped) - the
 *     earlier version of this check only sampled `<p>`/`<l>`/`<label>`
 *     chunks and could not see text living outside all three.
 *
 *  `stoa0058.stoa025.perseus-eng1.xml` (De Trinitate English) contains one
 *  undefined XML entity, `&Perseus.publish;` (TEI boilerplate declared in
 *  an external DTD subset this importer never fetches), which a strict XML
 *  parser cannot resolve. It sits inside `<teiHeader>` (which is stripped
 *  from the comparison anyway), so its expansion is immaterial; it is
 *  textually pre-replaced with a harmless placeholder before jsdom parses
 *  the document, and every file is scanned for any other non-standard named
 *  entity the same way, logging whatever is found (nothing else was).
 *
 * Writes data/<workId>/VALIDATION_REPORT.md for each work, prints a
 * combined summary (including raw/work character counts), and exits
 * non-zero if any check fails.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');
const RAW_DIR = join(HERE, 'raw');

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}
interface Anomaly {
  where: string;
  note: string;
}
interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
}
interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}
interface GenericWork {
  workId: string;
  language: string;
  divisions: Division[];
}
interface WorkAbout {
  workId: string;
  title: string;
  sections?: { heading: string; paragraphs: string[] }[];
}

interface WorkSpec {
  workId: string;
  rawFile: string;
  language: 'la' | 'en';
}

const WORKS: WorkSpec[] = [
  { workId: 'boethius-consolatio-la', rawFile: 'stoa0058.stoa001.perseus-lat2.xml', language: 'la' },
  { workId: 'boethius-consolatio-en', rawFile: 'stoa0058.stoa001.perseus-eng1.xml', language: 'en' },
  { workId: 'boethius-quomodo-substantiae-la', rawFile: 'stoa0058.stoa003.perseus-lat1.xml', language: 'la' },
  { workId: 'boethius-quomodo-substantiae-en', rawFile: 'stoa0058.stoa003.perseus-eng1.xml', language: 'en' },
  { workId: 'boethius-de-fide-catholica-la', rawFile: 'stoa0058.stoa006.perseus-lat1.xml', language: 'la' },
  { workId: 'boethius-de-fide-catholica-en', rawFile: 'stoa0058.stoa006.perseus-eng1.xml', language: 'en' },
  { workId: 'boethius-contra-eutychen-la', rawFile: 'stoa0058.stoa023.perseus-lat1.xml', language: 'la' },
  { workId: 'boethius-contra-eutychen-en', rawFile: 'stoa0058.stoa023.perseus-eng1.xml', language: 'en' },
  { workId: 'boethius-de-trinitate-la', rawFile: 'stoa0058.stoa025.perseus-lat1.xml', language: 'la' },
  { workId: 'boethius-de-trinitate-en', rawFile: 'stoa0058.stoa025.perseus-eng1.xml', language: 'en' },
  { workId: 'boethius-utrum-pater-la', rawFile: 'stoa0058.stoa028.perseus-lat1.xml', language: 'la' },
  { workId: 'boethius-utrum-pater-en', rawFile: 'stoa0058.stoa028.perseus-eng1.xml', language: 'en' },
];

const REQUIRED_ABOUT_SECTIONS = ['About this edition', 'The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies'];

/**
 * Small, individually-named set of DISCLOSED, deliberate editorial
 * excisions - text that genuinely appears in the raw source but is
 * correctly and intentionally absent from this work's output, each backed
 * by an anomalies.json entry. Every string here is removed from the raw
 * side's identity-check text EXACTLY ONCE (not globally), so a real,
 * undisclosed loss of the same wording elsewhere still fails loudly.
 * Compared post-normalisation (NFC, whitespace/brackets/quotes stripped),
 * so write each entry already in that same compact form.
 */
const KNOWN_EXCEPTIONS: Record<string, string[]> = {
  // The running page-title "DE TRINITATE" leaked into the body at a page-scan
  // boundary and was removed (see parseTractateEn.ts / anomalies.json "running-title leak").
  'boethius-de-trinitate-en': ['DETRINITATE'],
};

/**
 * Works where a bare Roman-numeral-plus-period `<p>` (e.g. "I.", "VIII.")
 * is a structural chapter marker, not reading text, and is therefore
 * correctly absent from the output (see parseTractateEn.ts's module doc -
 * the same treatment this app's wikitext parser gives a "Part N" heading).
 * Removed at the DOM level, BEFORE flattening to text: only a `<p>` whose
 * ENTIRE trimmed content is a Roman numeral followed by "." qualifies, so
 * this can never mis-fire on a short abbreviation embedded in running prose
 * (e.g. the incipit's "V.C." for "vir clarissimus") the way a plain
 * substring removal on the flattened, whitespace-stripped text could.
 */
const ROMAN_MARKER_PARAGRAPH_WORKS = new Set(['boethius-contra-eutychen-en', 'boethius-de-trinitate-en']);
const ROMAN_MARKER_PARAGRAPH_RE = /^[IVXLCDM]+\.$/;

/** Standard XML/HTML named entities jsdom's XML parser resolves on its own; anything else is non-standard. */
const STANDARD_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

/**
 * Scan for `&Name;`/`&Name.sub;`-style named entities that are NOT one of
 * the five standard XML entities and are not numeric (`&#NNN;`/`&#xHH;`,
 * which every XML parser resolves natively) - i.e. entities that would only
 * resolve via an external DTD subset this importer never fetches. Each
 * distinct one found is textually replaced with a harmless bracketed
 * placeholder (so the document remains well-formed) and logged; nothing is
 * silently swallowed. Returns the sanitised XML and the list of entities
 * fixed (name + occurrence count), for the caller to disclose.
 */
function sanitizeUndefinedEntities(xml: string): { xml: string; fixed: { name: string; count: number }[] } {
  const found = new Set<string>();
  for (const m of xml.matchAll(/&([A-Za-z][A-Za-z0-9._-]*);/g)) {
    if (!STANDARD_ENTITIES.has(m[1]!.toLowerCase())) found.add(m[1]!);
  }
  let out = xml;
  const fixed: { name: string; count: number }[] = [];
  for (const name of found) {
    const re = new RegExp(`&${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};`, 'g');
    const count = (xml.match(re) ?? []).length;
    out = out.replace(re, `[UNDEFINED-ENTITY:${name}]`);
    fixed.push({ name, count });
  }
  return { xml: out, fixed };
}

/**
 * Parse `xml` as real XML via jsdom, strip `teiHeader`/`note`/`bibl`/`head`
 * elements, and return the remaining document's `textContent` - the raw
 * reading text, read structurally rather than by regex sampling.
 */
function extractRawReadingText(workId: string, xml: string): { text: string; entitiesFixed: { name: string; count: number }[]; markerParagraphsRemoved: number } {
  const { xml: sanitized, fixed } = sanitizeUndefinedEntities(xml);
  const dom = new JSDOM(sanitized, { contentType: 'text/xml' });
  const doc = dom.window.document;
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error(`jsdom XML parse error: ${parseError.textContent}`);
  for (const tag of ['teiHeader', 'note', 'bibl', 'head']) {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  }
  let markerParagraphsRemoved = 0;
  if (ROMAN_MARKER_PARAGRAPH_WORKS.has(workId)) {
    doc.querySelectorAll('p').forEach((el) => {
      if (ROMAN_MARKER_PARAGRAPH_RE.test((el.textContent ?? '').trim())) {
        el.remove();
        markerParagraphsRemoved += 1;
      }
    });
  }
  return { text: doc.documentElement?.textContent ?? '', entitiesFixed: fixed, markerParagraphsRemoved };
}

/** NFC-normalise and strip every whitespace, bracket and quotation-mark character, for a strict identity comparison. */
function normalizeForIdentity(s: string): string {
  return s.normalize('NFC').replace(/[\s[\]{}()<>"'"''‹›«»„‚]/gu, '');
}

/** Remove `needle` from `haystack` exactly once (first occurrence), or return null if not found. */
function removeOnce(haystack: string, needle: string): string | null {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return null;
  return haystack.slice(0, idx) + haystack.slice(idx + needle.length);
}

function flattenPassages(divs: Division[]): Passage[] {
  const out: Passage[] = [];
  const walk = (ds: Division[]): void => {
    for (const d of ds) {
      out.push(...d.passages);
      walk(d.children);
    }
  };
  walk(divs);
  return out;
}

interface WorkReport {
  workId: string;
  findings: Finding[];
  divCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  rawIdentityChars: number;
  workIdentityChars: number;
  identityMatch: boolean;
}

function validateWork(spec: WorkSpec): WorkReport {
  const dir = join(DATA_ROOT, spec.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string): void => {
    findings.push({ level: 'ERROR', check, message: m });
  };
  const warn = (check: string, m: string): void => {
    findings.push({ level: 'WARN', check, message: m });
  };

  const report: WorkReport = { workId: spec.workId, findings, divCount: 0, passageCount: 0, totalChars: 0, anomalies: [], rawIdentityChars: 0, workIdentityChars: 0, identityMatch: false };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== spec.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${spec.workId}`);
  if (work.language !== spec.language) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${JSON.stringify(spec.language)}`);
  report.divCount = work.divisions.length;
  if (work.divisions.length === 0) err('no-divisions', 'work.json has zero divisions');

  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of REQUIRED_ABOUT_SECTIONS) if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
  }

  const passages = flattenPassages(work.divisions);
  report.passageCount = passages.length;
  if (passages.length === 0) err('no-passages', 'work has zero passages');

  let combiningHits = 0;
  let nfcMismatch = 0;
  const leaks: string[] = [];
  const LEAK_MARKERS = ['{{', '&amp;', '&lt;', '&gt;', '&quot;', '<p>', '<l ', '<div', '<milestone', '<pb', '<note'];
  for (const [i, p] of passages.entries()) {
    report.totalChars += p.text.length;
    if (typeof p.text !== 'string' || p.text.trim().length === 0) err('empty-passage', `passage[${i}]: empty text`);
    if (p.n !== '') err('passage-n', `passage[${i}]: n must be '', got ${JSON.stringify(p.n)}`);
    if (p.ref !== null) err('passage-ref', `passage[${i}]: ref must be null`);
    for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`passage[${i}]: contains ${JSON.stringify(marker)}`);
    if (/\p{Mn}/u.test(p.text) && !/[Ͱ-Ͽἀ-῿]/.test(p.text)) combiningHits += 1; // combining marks outside Greek ranges are suspicious
    if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
  }
  if (leaks.length) err('no-leaked-markup', `${leaks.length} passage(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);
  if (combiningHits > 0) warn('no-stray-combining-marks', `${combiningHits} passage(s) contain a standalone combining diacritic outside the Greek block after NFC normalisation`);

  for (const d of work.divisions) {
    const walk = (dd: Division): void => {
      if (dd.passages.length === 0 && dd.children.length === 0) err('empty-division', `${dd.id}: has neither passages nor children`);
      for (const c of dd.children) walk(c);
    };
    walk(d);
  }

  // --- text accounting: REAL identity check (see module doc) ---
  const rawPath = join(RAW_DIR, spec.rawFile);
  if (!existsSync(rawPath)) {
    err('raw-missing', `cached raw file not found: ${rawPath}`);
  } else {
    const xml = readFileSync(rawPath, 'utf8');
    let rawText: string;
    let entitiesFixed: { name: string; count: number }[];
    let markerParagraphsRemoved: number;
    try {
      const extracted = extractRawReadingText(spec.workId, xml);
      rawText = extracted.text;
      entitiesFixed = extracted.entitiesFixed;
      markerParagraphsRemoved = extracted.markerParagraphsRemoved;
    } catch (e) {
      err('raw-xml-parse', `jsdom failed to parse the cached raw XML: ${e instanceof Error ? e.message : String(e)}`);
      return report;
    }
    if (markerParagraphsRemoved > 0) {
      warn(
        'roman-marker-paragraph-removed',
        `${markerParagraphsRemoved} bare Roman-numeral-plus-period <p> element(s) (e.g. "I.", "VIII.") removed from the raw side before comparison: this translation marks its chapters with a standalone paragraph holding only the numeral, which is a structural marker (this importer's substitute for a <div> the page doesn't have), not reading text - it is correctly dropped from the output too (see parseTractateEn.ts's module doc).`,
      );
    }
    if (entitiesFixed.length > 0) {
      warn(
        'undefined-xml-entity',
        `${entitiesFixed.length} non-standard named XML entity/entities found in the raw file and textually pre-replaced before jsdom parsing (TEI boilerplate declared in an external DTD subset this importer never fetches; each sits inside <teiHeader>, which is stripped from this comparison anyway): ${entitiesFixed.map((f) => `&${f.name}; x${f.count}`).join(', ')}.`,
      );
    }

    let rawNorm = normalizeForIdentity(rawText);
    const workNorm = normalizeForIdentity(passages.map((p) => p.text).join(''));
    report.rawIdentityChars = rawNorm.length;
    report.workIdentityChars = workNorm.length;

    const appliedExceptions: string[] = [];
    for (const needle of KNOWN_EXCEPTIONS[spec.workId] ?? []) {
      const after = removeOnce(rawNorm, needle);
      if (after === null) {
        err('known-exception-not-found', `declared KNOWN_EXCEPTIONS entry ${JSON.stringify(needle)} for ${spec.workId} was not found in the raw identity text - the exception is stale (fix it or remove it, don't leave it silently unapplied)`);
      } else {
        rawNorm = after;
        appliedExceptions.push(needle);
      }
    }

    if (rawNorm === workNorm) {
      report.identityMatch = true;
      if (appliedExceptions.length > 0) {
        warn('identity-known-exception', `raw and output are identical only after removing ${appliedExceptions.length} disclosed editorial excision(s) from the raw side: ${appliedExceptions.join(', ')} (see anomalies.json for the full justification).`);
      }
    } else {
      let i = 0;
      const minLen = Math.min(rawNorm.length, workNorm.length);
      while (i < minLen && rawNorm[i] === workNorm[i]) i += 1;
      const rawCtx = rawNorm.slice(Math.max(0, i - 60), i + 60);
      const workCtx = workNorm.slice(Math.max(0, i - 60), i + 60);
      err(
        'text-identity',
        `raw and output diverge at normalised position ${i} (raw ${rawNorm.length} chars, output ${workNorm.length} chars, diff ${rawNorm.length - workNorm.length}).\n    RAW   : …${rawCtx}…\n    OUTPUT: …${workCtx}…`,
      );
    }
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Boethius validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- top-level divisions: ${r.divCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- identity check: raw ${r.rawIdentityChars} chars vs work ${r.workIdentityChars} chars (normalised) - ${r.identityMatch ? 'IDENTICAL' : 'DIVERGES'}`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`_${r.anomalies.length} logged - see anomalies.json for the full list._`);
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
  writeFileSync(join(DATA_ROOT, r.workId, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  process.stdout.write('\n=== validate:boethius ===\n');
  const reports = WORKS.map((w) => validateWork(w));
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    writeReport(r);
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(
      `  ${r.workId.padEnd(32)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${r.divCount.toString().padStart(2)} div  ${r.passageCount.toString().padStart(3)} psg  ${r.totalChars.toString().padStart(7)} chars  raw=${r.rawIdentityChars.toString().padStart(7)} work=${r.workIdentityChars.toString().padStart(7)} ${r.identityMatch ? 'MATCH' : 'DIVERGE'}  ${errors.length} err  ${warns.length} warn\n`,
    );
    for (const f of [...errors, ...warns]) process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write('Reports written to data/<workId>/VALIDATION_REPORT.md\n');
  if (totalErrors > 0) process.exit(1);
}

main();
