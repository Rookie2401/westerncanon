/**
 * Shared Division-building + ordering helpers for the Cicero
 * letters-selection importers. See data/<workId>/types.ts for the schema
 * these produce.
 */

import type { Division, Passage } from '../../data/ad-atticum-selection-la/types.ts';

/** Natural (book, letter) comparator: numeric book, then numeric letter
 *  prefix ascending, then any trailing lower-cased letter suffix ascending
 *  (e.g. "12" < "12a" < "12b" < "13"). Letter tokens are compared
 *  case-insensitively on the suffix. */
export function compareBookLetter(a: { book: number; letter: string }, b: { book: number; letter: string }): number {
  if (a.book !== b.book) return a.book - b.book;
  const ra = /^(\d+)([a-zA-Z]?)$/.exec(a.letter);
  const rb = /^(\d+)([a-zA-Z]?)$/.exec(b.letter);
  if (!ra || !rb) return a.letter.localeCompare(b.letter);
  const na = Number(ra[1]);
  const nb = Number(rb[1]);
  if (na !== nb) return na - nb;
  return ra[2]!.toLowerCase().localeCompare(rb[2]!.toLowerCase());
}

export function letterId(book: number, letter: string): string {
  return `letter-${book}-${letter.toLowerCase()}`;
}

export function letterNumber(book: number, letter: string): string {
  return `${book}.${letter.toLowerCase()}`;
}

/** Sorts Divisions in place by (book, letter) ascending, using each
 *  Division's own `number` field ("book.letter"). */
export function sortDivisionsByBookLetter(divisions: Division[]): void {
  divisions.sort((a, b) => {
    const [ab, al] = a.number!.split('.') as [string, string];
    const [bb, bl] = b.number!.split('.') as [string, string];
    return compareBookLetter({ book: Number(ab), letter: al }, { book: Number(bb), letter: bl });
  });
}

export function makeDivision(book: number, letter: string, sourceHeading: string | null, passageTexts: string[]): Division {
  const passages: Passage[] = passageTexts
    .filter((t) => t.trim().length > 0)
    .map((t) => ({ n: '', text: t, ref: null }));
  return {
    id: letterId(book, letter),
    number: letterNumber(book, letter),
    ref: null,
    sourceHeading,
    editorialTitle: null,
    children: [],
    passages,
  };
}
