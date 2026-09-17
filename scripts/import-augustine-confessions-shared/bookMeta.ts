/**
 * Canonical per-Book metadata shared by BOTH Confessions importers (Latin and
 * English), so the two independent editions' Book divisions line up 1:1 and
 * carry the same editorial gloss. Neither source prints a roman numeral for
 * its Book (the Latin Wikisource headings are plain arabic `1.C.S`; the
 * English Wikisource page titles spell it out, "Book I"); `roman` here is the
 * conventional roman numeral used throughout the secondary literature and by
 * this app's `Division.number` convention for a Book (see
 * data/augustine-confessions-la/types.ts).
 *
 * `en` is an EDITORIAL one-line gloss - never source text - stored only in
 * `Division.editorialTitle` for the Book division. It summarises the book's
 * well-known content in the standard account of the *Confessions*' structure
 * (autobiographical Books I-IX; philosophical/exegetical Books X-XIII).
 */

export interface BookMeta {
  /** 1-based Book index. */
  n: number;
  /** conventional roman numeral, used as Division.number for `book-N`. */
  roman: string;
  /** editorial one-line English gloss. */
  en: string;
}

export const BOOKS: readonly BookMeta[] = [
  { n: 1, roman: 'I', en: 'Infancy and boyhood; the acquisition of speech; the sinfulness even of an infant.' },
  { n: 2, roman: 'II', en: 'Adolescence at Madauros and Carthage; the theft of the pears.' },
  { n: 3, roman: 'III', en: 'Student life at Carthage; the Hortensius; nine years among the Manichees.' },
  { n: 4, roman: 'IV', en: 'Teaching rhetoric at Thagaste and Carthage; astrology; the death of a friend; the treatise On the Beautiful and the Fitting.' },
  { n: 5, roman: 'V', en: 'Disillusionment with Faustus the Manichee; the move to Rome, then to Milan and Bishop Ambrose.' },
  { n: 6, roman: 'VI', en: "Ambrose's preaching; Monica's arrival in Milan; mounting inner conflict over ambition and continence." },
  { n: 7, roman: 'VII', en: 'The problem of evil; the books of the Platonists; the reading of Paul.' },
  { n: 8, roman: 'VIII', en: "Simplicianus's account of Victorinus; Ponticianus and the story of Antony; the conversion in the Milan garden." },
  { n: 9, roman: 'IX', en: 'Baptism at Milan; the retreat at Cassiciacum; the vision at Ostia; the death of Monica.' },
  { n: 10, roman: 'X', en: 'Memory, self-examination, and confession in the present; the threefold temptation.' },
  { n: 11, roman: 'XI', en: 'Time and eternity, meditated through the opening words of Genesis.' },
  { n: 12, roman: 'XII', en: 'The interpretation of "heaven and earth" in the first verse of Genesis; formless matter.' },
  { n: 13, roman: 'XIII', en: 'The six days of creation read allegorically, as a figure of the Church.' },
];
