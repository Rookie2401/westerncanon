/**
 * Canonical per-Book metadata shared by BOTH On Christian Doctrine importers
 * (Latin and English), so the two independent editions' Book divisions carry
 * the same editorial gloss where they overlap (Books I-IV). The Latin
 * edition additionally has a `book-0` (Prologus); the English edition's
 * counterpart is its separately-paginated "Preface" page - both are
 * represented as `book-0` in their respective works (see each importer's
 * own doc comment for how `book-0`'s internal structure is derived, since
 * neither source numbers it into the traditional chapter apparatus).
 *
 * `en` is an EDITORIAL one-line gloss - never source text - stored only in
 * `Division.editorialTitle` for the Book division.
 */

export interface BookMeta {
  /** 0 for the Prologus/Preface, 1-4 for Books I-IV. */
  n: number;
  /** conventional roman numeral, used as Division.number for `book-N` (N>=1); null for book-0. */
  roman: string | null;
  /** editorial one-line English gloss. */
  en: string;
}

export const BOOKS: readonly BookMeta[] = [
  {
    n: 0,
    roman: null,
    en: "Augustine's preface, answering in advance those who will object to a manual of rules for interpreting Scripture.",
  },
  {
    n: 1,
    roman: 'I',
    en: 'On things and signs; the rule that all valid interpretation of Scripture must build up the double love of God and neighbor.',
  },
  {
    n: 2,
    roman: 'II',
    en: 'On known signs: the steps toward wisdom, the canon of Scripture, the need for knowledge of languages and things, and the proper, guarded use of pagan learning.',
  },
  {
    n: 3,
    roman: 'III',
    en: 'On ambiguous signs, both literal and figurative; rules for resolving ambiguity by the rule of faith and of charity, including the Tyconian rules.',
  },
  {
    n: 4,
    roman: 'IV',
    en: 'On the Christian orator: the proper place of eloquence in preaching what has already been rightly understood.',
  },
];
