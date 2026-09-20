/**
 * Shared selection-resolution + Division-assembly for the Cicero
 * letters-selection importers. Turns a book/letter selection spec plus a
 * parsed Latin or English source into the final, ordered Division[] for
 * one work, honestly reporting (never silently skipping) any requested
 * letter that genuinely is not present in the source.
 */

import type { Division } from '../../data/ad-atticum-selection-la/types.ts';
import { compareBookLetter, makeDivision } from './division.ts';
import { parseLatinLetters } from './latin.ts';
import { parseEnglishLetters, assembleEnglishLetters } from './english.ts';

export interface Anomaly {
  where: string;
  note: string;
}

/** One selection-spec entry: either an explicit list of letter tokens
 *  (as printed in the traditional book.letter citation, e.g. "19", "18a"),
 *  or 'ALL' meaning every letter this collection's own source actually
 *  contains for that book (determined by scanning the source, not assumed
 *  contiguous - see the per-work importer). */
export interface BookSelector {
  book: number;
  letters: readonly string[] | 'ALL';
}

export interface SelectionResult {
  divisions: Division[];
  anomalies: Anomaly[];
  requestedCount: number;
  foundCount: number;
  missing: { book: number; letter: string }[];
  totalPassages: number;
  totalChars: number;
}

function countChars(divisions: Division[]): number {
  let n = 0;
  for (const d of divisions) for (const p of d.passages) n += p.text.length;
  return n;
}

function countPassages(divisions: Division[]): number {
  let n = 0;
  for (const d of divisions) n += d.passages.length;
  return n;
}

/** For an 'ALL'-resolved book, reports (as an informational anomaly, not an
 *  error) any integer letter numbers absent between the lowest and highest
 *  integer actually present - a real, known feature of the traditional
 *  numbering of these collections (some numbers were never assigned), not a
 *  parsing fault. Lettered variants (e.g. "18a") don't count as filling a
 *  gap for their own base number. */
function describeIntegerGaps(book: number, tokens: readonly string[], label: string): Anomaly | null {
  const ints = tokens
    .map((t) => /^(\d+)/.exec(t)?.[1])
    .filter((s): s is string => !!s)
    .map(Number);
  if (ints.length === 0) return null;
  const present = new Set(ints);
  const min = Math.min(...ints);
  const max = Math.max(...ints);
  const gaps: number[] = [];
  for (let i = min; i <= max; i++) if (!present.has(i)) gaps.push(i);
  if (gaps.length === 0) return null;
  return {
    where: `book ${book} (${label})`,
    note: `Traditional letter number(s) ${gaps.join(', ')} do not exist in this source's own numbering of Book ${book} (confirmed absent by scanning every letter div actually present, min ${min}–max ${max}); this reflects a genuine feature of the traditional numbering, not a parsing gap.`,
  };
}

export function extractLatinSelection(
  xml: string,
  bookSubtype: 'book' | 'Book',
  selection: readonly BookSelector[],
): SelectionResult & { totalGaps: number; totalNotes: number } {
  const parsed = parseLatinLetters(xml, bookSubtype);
  const anomalies: Anomaly[] = [];
  const targets: { book: number; letter: string }[] = [];

  for (const sel of selection) {
    if (sel.letters === 'ALL') {
      const tokens = parsed.byBook.get(sel.book);
      if (!tokens || tokens.length === 0) {
        anomalies.push({
          where: `book ${sel.book} (Latin)`,
          note: `Requested "every letter in Book ${sel.book}" but the Latin source contains no Book ${sel.book} at all.`,
        });
        continue;
      }
      const sorted = [...tokens].sort((a, b) => compareBookLetter({ book: sel.book, letter: a }, { book: sel.book, letter: b }));
      for (const t of sorted) targets.push({ book: sel.book, letter: t });
      const gapAnomaly = describeIntegerGaps(sel.book, tokens, 'Latin');
      if (gapAnomaly) anomalies.push(gapAnomaly);
    } else {
      for (const letter of sel.letters) targets.push({ book: sel.book, letter });
    }
  }

  const divisions: Division[] = [];
  const missing: { book: number; letter: string }[] = [];
  let gapsInExtracted = 0;

  for (const t of targets) {
    const exactKey = `${t.book}.${t.letter}`;
    let entry = parsed.byKey.get(exactKey);
    if (!entry) {
      // case-insensitive fallback (Purser's lettered sub-letters are printed
      // upper-case, e.g. "5A"; requested tokens may be given lower-case).
      const wantLower = t.letter.toLowerCase();
      for (const [key, v] of parsed.byKey) {
        if (key.split('.')[0] === String(t.book) && key.split('.').slice(1).join('.').toLowerCase() === wantLower) {
          entry = v;
          break;
        }
      }
    }
    if (!entry) {
      missing.push(t);
      anomalies.push({
        where: `${t.book}.${t.letter} (Latin)`,
        note: `Requested letter ${t.book}.${t.letter} was not found in the Latin source (checked exact and case-insensitive token match against every letter div actually present in Book ${t.book}: ${(parsed.byBook.get(t.book) ?? []).join(', ') || '(book absent)'}).`,
      });
      continue;
    }
    gapsInExtracted += entry.gapCount;
    if (entry.gapCount > 0) {
      anomalies.push({
        where: `${t.book}.${t.letter} (Latin)`,
        note: `Source edition (Purser) itself omits text at ${entry.gapCount} point(s) in this letter (<gap reason="omitted"/>); nothing fabricated in its place.`,
      });
    }
    const passageTexts = entry.sectionTexts.length > 0 ? entry.sectionTexts : entry.text.length > 0 ? [entry.text] : [];
    divisions.push(makeDivision(t.book, entry.letter, entry.sourceHeading, passageTexts));
  }

  return {
    divisions,
    anomalies,
    requestedCount: targets.length,
    foundCount: divisions.length,
    missing,
    totalPassages: countPassages(divisions),
    totalChars: countChars(divisions),
    totalGaps: gapsInExtracted,
    totalNotes: parsed.totalNotes,
  };
}

export function extractEnglishSelection(
  xml: string,
  prefix: string,
  selection: readonly BookSelector[],
): SelectionResult & { totalNotes: number; fragmentedLetterCount: number; epigraphsExcluded: number; duplicatesDropped: number } {
  const { fragments, totalNotes } = parseEnglishLetters(xml, prefix);
  const assembled = assembleEnglishLetters(fragments);
  const anomalies: Anomaly[] = [];

  if (assembled.duplicateFragmentsDropped.length > 0) {
    anomalies.push({
      where: `${prefix} (English, whole file)`,
      note: `${assembled.duplicateFragmentsDropped.length} letter-div(s) were exact byte-for-byte duplicates of another div with the same book/letter token already seen earlier in the document and were dropped, keeping the first occurrence only (see the per-work importer's module doc for the confirmed cause).`,
    });
  }

  const targets: { book: number; letter: string }[] = [];
  for (const sel of selection) {
    if (sel.letters === 'ALL') {
      const bases = assembled.byBook.get(sel.book);
      if (!bases || bases.length === 0) {
        anomalies.push({
          where: `book ${sel.book} (English)`,
          note: `Requested "every letter in Book ${sel.book}" but the English source contains no Book ${sel.book} at all.`,
        });
        continue;
      }
      const sorted = [...bases].sort((a, b) => compareBookLetter({ book: sel.book, letter: a }, { book: sel.book, letter: b }));
      for (const t of sorted) targets.push({ book: sel.book, letter: t });
      const gapAnomaly = describeIntegerGaps(sel.book, bases, 'English');
      if (gapAnomaly) anomalies.push(gapAnomaly);
    } else {
      for (const letter of sel.letters) targets.push({ book: sel.book, letter: letter.toLowerCase() });
    }
  }

  const divisions: Division[] = [];
  const missing: { book: number; letter: string }[] = [];
  let fragmentedLetterCount = 0;
  let epigraphsExcluded = 0;

  for (const t of targets) {
    const key = `${t.book}.${t.letter}`;
    const entry = assembled.byKey.get(key);
    if (!entry) {
      missing.push(t);
      anomalies.push({
        where: `${t.book}.${t.letter} (English)`,
        note: `Requested letter ${t.book}.${t.letter} was not found in the English source (checked against every reconstructed traditional-letter base actually present in Book ${t.book}: ${(assembled.byBook.get(t.book) ?? []).join(', ') || '(book absent)'}).`,
      });
      continue;
    }
    if (entry.fragmentCount > 1) {
      fragmentedLetterCount += 1;
      anomalies.push({
        where: `${t.book}.${t.letter} (English)`,
        note: `Shuckburgh's chronological ordering splits this traditional letter across ${entry.fragmentCount} separate divs in the source (sections ${entry.fragmentCount} in total); reassembled here as ${entry.fragmentCount} Passages of one Division, in section order.${entry.allHeadings.length > 1 ? ` Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ${JSON.stringify(entry.allHeadings)}.` : ''}`,
      });
    }
    if (entry.epigraphCount > 0) {
      epigraphsExcluded += entry.epigraphCount;
      anomalies.push({
        where: `${t.book}.${t.letter} (English)`,
        note: `${entry.epigraphCount} editorial <epigraph> headnote(s) (Perseus/Shuckburgh editorial introduction, not Cicero's or the correspondent's own text) excluded entirely.`,
      });
    }
    divisions.push(makeDivision(t.book, entry.base, entry.sourceHeading, entry.passages));
  }

  return {
    divisions,
    anomalies,
    requestedCount: targets.length,
    foundCount: divisions.length,
    missing,
    totalPassages: countPassages(divisions),
    totalChars: countChars(divisions),
    totalNotes,
    fragmentedLetterCount,
    epigraphsExcluded,
    duplicatesDropped: assembled.duplicateFragmentsDropped.length,
  };
}
