/**
 * The 13-entry ground-truth table for the Archimedes corpus (First1KGreek /
 * Perseus canonical-greekLit, CTS urn:cts:greekLit:tlg0552.tlgNNN).
 *
 * IMPORTANT deviation from the importer spec's assumed provenance: the actual
 * digital source's <teiHeader><sourceDesc> in all 13 files cites
 *
 *   Archimedes. Archimède [vol. N]. Mugler, Charles, editor.
 *   Paris: Les Belles Lettres, 19xx.
 *
 * i.e. Charles Mugler's Bude edition (Collection des Universites de France,
 * 4 vols., 1970-72) - NOT Heiberg's Archimedis Opera Omnia (1880-81) as the
 * importer brief assumed. Heiberg's 1880-81 edition established the
 * traditional proposition numbering (I, II, III... / pr) that Mugler's edition
 * (and this transcription) also follows, so the STRUCTURE the brief describes
 * is unaffected - but the actual editor/edition/page citations bundled with
 * this corpus are Mugler's, verified directly from each file's <sourceDesc>,
 * and are cited as such throughout (never silently attributed to Heiberg).
 * See each work's about.json "The edition" section.
 *
 * <pb n> values are monotonically increasing with no duplicates in every one
 * of the 13 files (verified), so a page-level ref scheme ("Mugler vol. N p. P")
 * is reliable corpus-wide - unlike Isagoge's <lb>, which was abandoned.
 */

export type Structure =
  | { kind: 'flat'; numbers: readonly string[] }
  | { kind: 'books'; books: readonly { number: string; numbers: readonly string[] }[] }
  | {
      kind: 'fragments';
      chapters: readonly { number: string; sections: readonly string[] }[];
    };

export interface ArchimedesWorkEntry {
  /** data/archimedes-<slug> */
  workId: string;
  /** tlg001..tlg013 */
  tlg: string;
  /** raw XML filename under scripts/import-archimedes/raw/ */
  file: string;
  /** registry commonTitle (English, given by the lead) */
  commonTitle: string;
  /** verbatim CTS <ti:title xml:lang="lat"> - the only sourced canonical title
   *  (no Greek title is given in the CTS metadata for any of the 13 works) */
  latinTitle: string;
  /** Mugler / Belles Lettres volume number, from <biblScope unit="volume"> */
  muglerVolume: number;
  muglerYear: number;
  structure: Structure;
}

const flat = (numbers: readonly string[]): Structure => ({ kind: 'flat', numbers });

export const ARCHIMEDES_WORKS: readonly ArchimedesWorkEntry[] = [
  {
    workId: 'archimedes-sphere-cylinder',
    tlg: 'tlg001',
    file: 'tlg0552.tlg001.1st1K-grc1.xml',
    commonTitle: 'On the Sphere and Cylinder',
    latinTitle: 'De sphaera et cylindro',
    muglerVolume: 1,
    muglerYear: 1970,
    structure: {
      kind: 'books',
      books: [
        { number: '1', numbers: ['pr', ...range(1, 44)] },
        { number: '2', numbers: ['pr', ...range(1, 9)] },
      ],
    },
  },
  {
    workId: 'archimedes-measurement-circle',
    tlg: 'tlg002',
    file: 'tlg0552.tlg002.1st1K-grc1.xml',
    commonTitle: 'Measurement of a Circle',
    latinTitle: 'Dimensio circuli',
    muglerVolume: 1,
    muglerYear: 1970,
    structure: flat(range(1, 3)),
  },
  {
    workId: 'archimedes-conoids-spheroids',
    tlg: 'tlg003',
    file: 'tlg0552.tlg003.1st1K-grc1.xml',
    commonTitle: 'On Conoids and Spheroids',
    latinTitle: 'De conoidibus et sphaeroidibus',
    muglerVolume: 1,
    muglerYear: 1970,
    // n=29 is genuinely missing from the source division structure (Heiberg's
    // traditional numbering skips it here); not an importer bug - see below.
    structure: flat(['pr', ...range(1, 28), ...range(30, 32)]),
  },
  {
    workId: 'archimedes-spirals',
    tlg: 'tlg004',
    file: 'tlg0552.tlg004.1st1K-grc1.xml',
    commonTitle: 'On Spirals',
    latinTitle: 'De lineis spiralibus',
    muglerVolume: 2,
    muglerYear: 1971,
    structure: flat(['pr', ...range(1, 28)]),
  },
  {
    workId: 'archimedes-plane-equilibrium',
    tlg: 'tlg005',
    file: 'tlg0552.tlg005.1st1K-grc1.xml',
    commonTitle: 'On the Equilibrium of Planes',
    latinTitle: 'De planorum aequilibriis',
    muglerVolume: 2,
    muglerYear: 1971,
    structure: {
      kind: 'books',
      books: [
        { number: '1', numbers: ['pr', ...range(1, 15)] },
        { number: '2', numbers: range(1, 10) },
      ],
    },
  },
  {
    workId: 'archimedes-sand-reckoner',
    tlg: 'tlg006',
    file: 'tlg0552.tlg006.1st1K-grc1.xml',
    commonTitle: 'The Sand-Reckoner',
    latinTitle: 'Arenarius',
    muglerVolume: 2,
    muglerYear: 1971,
    structure: flat(range(1, 4)),
  },
  {
    workId: 'archimedes-quadrature-parabola',
    tlg: 'tlg007',
    file: 'tlg0552.tlg007.1st1K-grc1.xml',
    commonTitle: 'Quadrature of the Parabola',
    latinTitle: 'Quadratura parabolae',
    muglerVolume: 2,
    muglerYear: 1971,
    structure: flat(['pr', ...range(1, 24)]),
  },
  {
    workId: 'archimedes-floating-bodies',
    tlg: 'tlg008',
    file: 'tlg0552.tlg008.1st1K-grc1.xml',
    commonTitle: 'On Floating Bodies',
    latinTitle: 'De corporibus fluitantibus',
    muglerVolume: 3,
    muglerYear: 1971,
    structure: {
      kind: 'books',
      books: [
        { number: '1', numbers: ['pr', ...range(1, 9)] },
        { number: '2', numbers: range(1, 10) },
      ],
    },
  },
  {
    workId: 'archimedes-stomachion',
    tlg: 'tlg009',
    file: 'tlg0552.tlg009.1st1K-grc1.xml',
    commonTitle: 'Stomachion',
    latinTitle: 'Stomachion',
    muglerVolume: 3,
    muglerYear: 1971,
    structure: flat(['1']),
  },
  {
    workId: 'archimedes-method',
    tlg: 'tlg010',
    file: 'tlg0552.tlg010.1st1K-grc1.xml',
    commonTitle: 'The Method (Ad Eratosthenem methodus)',
    latinTitle: 'Ad Eratosthenem methodus',
    muglerVolume: 3,
    muglerYear: 1971,
    structure: flat(['pr1', 'pr2', ...range(1, 15)]),
  },
  {
    workId: 'archimedes-liber-assumptorum',
    tlg: 'tlg011',
    file: 'tlg0552.tlg011.1st1K-grc1.xml',
    commonTitle: 'Book of Lemmas (Liber Assumptorum)',
    latinTitle: 'Liber assumptorum',
    muglerVolume: 3,
    muglerYear: 1971,
    structure: flat(range(1, 15)),
  },
  {
    workId: 'archimedes-cattle-problem',
    tlg: 'tlg012',
    file: 'tlg0552.tlg012.1st1K-grc1.xml',
    commonTitle: 'The Cattle Problem (Problema Bovinum)',
    latinTitle: 'Problema bovinum',
    muglerVolume: 3,
    muglerYear: 1971,
    structure: flat(range(1, 2)),
  },
  {
    workId: 'archimedes-fragments',
    tlg: 'tlg013',
    file: 'tlg0552.tlg013.1st1K-grc1.xml',
    commonTitle: 'Fragments',
    latinTitle: 'Fragmenta',
    muglerVolume: 4,
    muglerYear: 1972,
    structure: {
      kind: 'fragments',
      chapters: [
        { number: '1', sections: ['1', '2', '3'] },
        { number: '2', sections: ['1'] },
      ],
    },
  },
];

/** ['1','2',...,'N'] inclusive, as strings (no leading zeros). */
function range(from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i++) out.push(String(i));
  return out;
}

const ROMAN: Record<string, string> = { '1': 'I', '2': 'II' };
export function bookRoman(n: string): string {
  return ROMAN[n] ?? n;
}
