/**
 * Table-driven parser for the five English theological tractates (the same
 * Loeb 1918 Stewart & Rand translation, Perseus canonical-latinLit,
 * perseus-eng1.xml for each - NOT currently listed as a <translation> in
 * this repository's own __cts__.xml metadata for these five works, but
 * present and complete on disk; disclosed in about.json).
 *
 * Structure confirmed by direct inspection - none of these five pages
 * carries any `<div>` element at all; every one is a flat run of `<p>`
 * paragraphs under a single `<head>...</head>` title line:
 *   - Quomodo Substantiae, De Fide Catholica, Utrum Pater: no chapter
 *     markers anywhere in the prose (matching the Latin sibling's own flat,
 *     undivided structure) - imported as a single division, `ch-1`.
 *     (Quomodo Substantiae's nine opening axioms ARE each their own `<p>`,
 *     e.g. "I. A common conception is a statement..." - but the numeral is
 *     part of that paragraph's own running prose, not a paragraph of its
 *     own, so this is paragraph formatting, not chapter structure.)
 *   - Contra Eutychen, De Trinitate: a bare Roman numeral in its OWN `<p>`
 *     ("I.", "II.", ... ) marks the start of each numbered chapter,
 *     matching the Latin sibling's chapter count exactly (8 and 6
 *     respectively) after a Preface of one or more paragraphs. The numeral
 *     is a structural marker (this translation's substitute for a `<div>`
 *     the underlying page simply doesn't have), not reading text, so it is
 *     used to place the division boundary and then dropped from the
 *     passage text itself - exactly as this app's wikitext parser treats
 *     "Part N" headings (see scripts/import-aristotle-rest-en-shared/
 *     wikitext.ts).
 *
 * KNOWN TRANSCRIPTION DEFECT (De Trinitate only, one occurrence, verified
 * by direct inspection): at a scanned-page boundary, the running page-title
 * "DE TRINITATE" was captured as literal body text, splitting the word
 * "pen" from "my" ("...prompts my" / [page break] / "DE TRINITATE" / "pen;
 * if there be...") and inserting a spurious paragraph break at the same
 * point. This is unambiguously page furniture (the treatise's own printed
 * running head, not a word Boethius or the translator wrote) - exactly the
 * kind of running-title noise this app's other importers already strip
 * (see wikitext.ts's `RE_BOOK_LINE`) - so "DE TRINITATE" is removed and the
 * two paragraph fragments it split are rejoined with a single space; the
 * exact repair is disclosed on the affected Passage and in anomalies.json,
 * never silently done.
 *
 * `<q>` handling and `<pb>` dropping match the Latin sibling.
 */

import type { Anomaly, Division, GenericWork, Passage } from './genericTypes.ts';
import { cleanText, nfc, stripTags } from './text.ts';

export interface EnTractateConfig {
  workId: string;
  latinWorkId: string;
  flat: boolean;
  /** expected chapter count (Roman numerals I..N), only used when !flat */
  chapterCount?: number;
}

export const ENGLISH_TRACTATES: EnTractateConfig[] = [
  { workId: 'boethius-quomodo-substantiae-en', latinWorkId: 'boethius-quomodo-substantiae-la', flat: true },
  { workId: 'boethius-de-fide-catholica-en', latinWorkId: 'boethius-de-fide-catholica-la', flat: true },
  { workId: 'boethius-contra-eutychen-en', latinWorkId: 'boethius-contra-eutychen-la', flat: false, chapterCount: 8 },
  { workId: 'boethius-de-trinitate-en', latinWorkId: 'boethius-de-trinitate-la', flat: false, chapterCount: 6 },
  { workId: 'boethius-utrum-pater-en', latinWorkId: 'boethius-utrum-pater-la', flat: true },
];

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10 };
function romanToArabic(roman: string): number | null {
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = ROMAN_VALUES[roman[i]!.toUpperCase()];
    const next = ROMAN_VALUES[(roman[i + 1] ?? '').toUpperCase()];
    if (cur === undefined) return null;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total > 0 ? total : null;
}

function renderQuotes(fragment: string, countRef: { n: number }): string {
  return fragment.replace(/<q>([\s\S]*?)<\/q>/g, (_m, inner: string) => {
    countRef.n += 1;
    return `"${inner}"`;
  });
}

/** The one known running-title leak (De Trinitate); see module doc. */
const DE_TRINITATE_HEADER_LEAK = 'DE TRINITATE';

export function parseEnglishTractate(workId: string, xml: string): { work: GenericWork; anomalies: Anomaly[] } {
  const cfg = ENGLISH_TRACTATES.find((t) => t.workId === workId);
  if (!cfg) throw new Error(`no ENGLISH_TRACTATES entry for ${workId}`);

  function fail(msg: string): never {
    process.stderr.write(`STOP (${workId}): ${msg}\n`);
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found');
  const body = xml.slice(bodyStart, bodyEnd);

  const headMatch = /<head>([^<]*)<\/head>/.exec(body);
  const sourceHeading = headMatch ? nfc(cleanText(headMatch[1]!)) : null;
  if (!sourceHeading) anomalies.push({ where: `${workId} / heading`, note: 'No <head> element found; the first division\'s sourceHeading is null.' });

  const pbCount = (body.match(/<pb\b/g) ?? []).length;
  const qCount = { n: 0 };

  // Raw <p> paragraphs, in document order, cleaned. Empty leading <p></p> (present on every
  // page in this batch) is dropped.
  const rawParas = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]!);
  const headerLeakFixed = { n: 0 };
  const cleanedParas: string[] = [];
  for (let i = 0; i < rawParas.length; i++) {
    let raw = rawParas[i]!;
    let mergePrevious = false;
    if (raw.includes(DE_TRINITATE_HEADER_LEAK)) {
      const before = raw;
      raw = raw.replace(DE_TRINITATE_HEADER_LEAK, ' ');
      mergePrevious = true;
      headerLeakFixed.n += 1;
      anomalies.push({
        where: `${workId} / running-title leak`,
        note: `Removed the running page-title "${DE_TRINITATE_HEADER_LEAK}" (leaked into the body text at a scanned-page boundary) and rejoined the paragraph it spuriously split. Raw fragment before the fix: ${JSON.stringify(before.replace(/\s+/g, ' ').trim().slice(0, 140))}`,
      });
    }
    const q0 = qCount.n;
    const withQuotes = renderQuotes(raw, qCount);
    void q0;
    const cleaned = cleanText(stripTags(withQuotes));
    if (cleaned.length === 0) continue;
    if (mergePrevious && cleanedParas.length > 0) {
      cleanedParas[cleanedParas.length - 1] = `${cleanedParas[cleanedParas.length - 1]} ${cleaned}`;
    } else {
      cleanedParas.push(cleaned);
    }
  }

  const divisions: Division[] = [];

  if (cfg.flat) {
    if (cleanedParas.length === 0) fail('no paragraph text found');
    const text = nfc(cleanedParas.join('\n\n'));
    const passage: Passage = { n: '', text, ref: null };
    divisions.push({
      id: 'ch-1',
      number: '1',
      ref: null,
      sourceHeading,
      editorialTitle: null,
      children: [],
      passages: [passage],
    });
    anomalies.push({
      where: `${workId} / structure`,
      note: 'This translation carries no chapter markers anywhere in its running text, matching the Latin sibling\'s own flat, undivided structure; imported as a single division, ch-1.',
    });
  } else {
    // Split on standalone Roman-numeral paragraphs ("I.", "II.", ...).
    const chapters: { label: string; num: number; paras: string[] }[] = [];
    const preface: string[] = [];
    let current: { label: string; num: number; paras: string[] } | null = null;
    const markerRe = /^([IVX]{1,6})\.$/;
    for (const p of cleanedParas) {
      const m = markerRe.exec(p);
      if (m) {
        const num = romanToArabic(m[1]!);
        if (num === null) fail(`unrecognised Roman-numeral marker paragraph "${p}"`);
        current = { label: m[1]!, num, paras: [] };
        chapters.push(current);
        continue;
      }
      if (current) current.paras.push(p);
      else preface.push(p);
    }
    if (preface.length === 0) fail('no preface paragraph(s) found before the first chapter marker');
    if (chapters.length !== cfg.chapterCount) fail(`expected ${cfg.chapterCount} chapters, found ${chapters.length} (nums: ${chapters.map((c) => c.num).join(',')})`);
    chapters.forEach((c, i) => {
      if (c.num !== i + 1) fail(`chapter markers out of sequence: chapter at position ${i} is numbered ${c.num} (expected ${i + 1})`);
      if (c.paras.length === 0) fail(`chapter ${c.num} ("${c.label}.") has no paragraph text following its marker`);
    });

    divisions.push({
      id: 'ch-pr',
      number: 'pr',
      ref: null,
      sourceHeading,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: nfc(preface.join('\n\n')), ref: null }],
    });
    for (const c of chapters) {
      divisions.push({
        id: `ch-${c.num}`,
        number: String(c.num),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text: nfc(c.paras.join('\n\n')), ref: null }],
      });
    }
    anomalies.push({
      where: `${workId} / structure`,
      note: `This translation marks its ${cfg.chapterCount} chapters with a bare Roman numeral in its own paragraph ("I.", "II.", ...) rather than any <div> structure; each marker is used to place the division boundary (ch-1 .. ch-${cfg.chapterCount}) and then dropped from the passage text itself, matching this app's established handling of a structural-but-not-textual heading marker (see scripts/import-aristotle-rest-en-shared/wikitext.ts's "Part N" headings). Everything before the first marker is the Preface, ch-pr.`,
    });
  }

  anomalies.push({
    where: `${workId} / transport scaffolding`,
    note: `${pbCount} <pb/> page-break markers were dropped from the reading text as pure typesetting scaffolding; this source carries no citation scheme this schema can use, so Division.ref and Passage.ref are null throughout.`,
  });
  if (qCount.n > 0) {
    anomalies.push({
      where: `${workId} / direct speech`,
      note: `${qCount.n} <q>...</q> span(s) carry no literal quotation-mark characters in this XML; each is rendered wrapped in straight double quotes, reflecting what the edition itself prints, matching this app's Consolatio handling.`,
    });
  }
  anomalies.push({
    where: `${workId} / footnote apparatus`,
    note: 'This digitization marks its footnote apparatus with no <note>/<ref> element at all - apparently bare inline letters/numbers in the printed style of the edition\'s own superscript markers, with no markup distinguishing them from ordinary running text. Because they cannot be identified programmatically without risk of deleting a genuine word, they are left exactly as printed rather than guessed at and removed; a disclosed limitation of the source, not a correction made here.',
  });
  if (headerLeakFixed.n > 0) {
    anomalies.push({
      where: `${workId} / running-title leak (summary)`,
      note: `${headerLeakFixed.n} running-title leak(s) of the kind described in this module's doc comment were found and repaired; see the individual anomaly note(s) above for the exact text.`,
    });
  }

  const work: GenericWork = { workId, language: 'en', divisions };
  return { work, anomalies };
}
