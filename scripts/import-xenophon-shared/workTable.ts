/**
 * The 14-entry ground-truth table for the Xenophon corpus (Perseus
 * canonical-greekLit, CTS urn:cts:greekLit:tlg0032.tlgNNN).
 *
 * Every field below (grcTitle, ctsEnTitle, translationLabel, marchant*,
 * translator*) is copied verbatim from each work's own
 * scripts/import-xenophon/raw/tlgNNN.__cts__.xml - fetched directly from
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0032/tlgNNN/__cts__.xml
 * for all 14 works and cross-checked one by one; nothing here is assumed
 * from the importer brief without verification.
 *
 * Structure kinds (verified directly from each work's own <refsDecl> /
 * <citeStructure> AND by walking the actual <div> nesting in both the grc
 * and eng XML - not merely assumed from the brief's table):
 *   - 'books':          book > chapter > section (4 works: Hellenica,
 *                        Memorabilia, Anabasis, Cyropaedia)
 *   - 'flat-chapters':  chapter > section, no book level (9 works)
 *   - 'flat-sections':  flat section only, NO chapter level at all (1 work:
 *                        Apology - the brief flagged this as needing a
 *                        check; confirmed by direct inspection: Apology's
 *                        <refsDecl> citeStructure has a single unit="section"
 *                        level, and the body is a flat sequence of
 *                        <div subtype="section"> with no wrapping chapter
 *                        div whatsoever)
 *
 * All 14 works were independently verified to have IDENTICAL book/chapter/
 * section counts between their Greek and English witnesses, and (with the
 * one documented exception of Anabasis book 6 chapter 3 - see parse.ts'
 * normalizeSiblings) every book/chapter/section numbering sequence is a
 * plain contiguous 1..N run in both languages.
 */

export type StructureKind = 'books' | 'flat-chapters' | 'flat-sections';

export interface XenophonWorkEntry {
  /** tlg001..tlg014 */
  tlg: string;
  /** data/xenophon-<slug>-{grc,en} */
  slug: string;
  structure: StructureKind;
  /** English display title used across this app (matches the importer brief's table; where it differs from the CTS's own English title, see ctsEnTitle) */
  commonTitleEn: string;
  /** verbatim CTS <ti:edition><ti:label xml:lang="grc"> - the Greek title Marchant's edition itself carries */
  grcTitle: string;
  /** verbatim CTS <ti:title xml:lang="eng"> (work-level) - the Perseus/CTS's own English title, occasionally shorter or differently spelled than commonTitleEn */
  ctsEnTitle: string;
  /** verbatim CTS <ti:translation><ti:label xml:lang="eng">, only when it differs from commonTitleEn (e.g. Todd's Symposium translation is itself titled "Banquet") */
  translationLabel?: string;
  /** E. C. Marchant, Xenophontis Opera Omnia (Oxford: Clarendon Press) volume number, from the CTS edition <ti:description> */
  marchantVolume: number;
  /** Marchant volume's publication year, from the same <ti:description> */
  marchantYear: number;
  /** Loeb "Xenophon in Seven Volumes" translator, from the CTS translation <ti:description> */
  translator: string;
  /** Loeb volume number(s) for this work, verbatim (e.g. "1-2", "4", "5-6", "7") */
  translatorLoebVol: string;
  /** Loeb publication year(s), verbatim (e.g. "1918-1921", "1923", "1914", "1925") */
  translatorYears: string;
}

export const XENOPHON_WORKS: readonly XenophonWorkEntry[] = [
  {
    tlg: 'tlg001',
    slug: 'hellenica',
    structure: 'books',
    commonTitleEn: 'Hellenica',
    grcTitle: 'Ἑλληνικά',
    ctsEnTitle: 'Hellenica',
    marchantVolume: 1,
    marchantYear: 1900,
    translator: 'Carleton L. Brownson',
    translatorLoebVol: '1-2',
    translatorYears: '1918-1921',
  },
  {
    tlg: 'tlg002',
    slug: 'memorabilia',
    structure: 'books',
    commonTitleEn: 'Memorabilia',
    grcTitle: 'Ἀπομνημονεύματα',
    ctsEnTitle: 'Memorabilia',
    marchantVolume: 2,
    marchantYear: 1921,
    translator: 'E. C. Marchant',
    translatorLoebVol: '4',
    translatorYears: '1923',
  },
  {
    tlg: 'tlg003',
    slug: 'oeconomicus',
    structure: 'flat-chapters',
    commonTitleEn: 'Oeconomicus (Economics)',
    grcTitle: 'Οἰκονομικός',
    ctsEnTitle: 'Economics',
    marchantVolume: 2,
    marchantYear: 1921,
    translator: 'E. C. Marchant',
    translatorLoebVol: '4',
    translatorYears: '1923',
  },
  {
    tlg: 'tlg004',
    slug: 'symposium',
    structure: 'flat-chapters',
    commonTitleEn: 'Symposium',
    grcTitle: 'Συμπόσιον',
    ctsEnTitle: 'Symposium',
    translationLabel: 'Banquet',
    marchantVolume: 2,
    marchantYear: 1921,
    translator: 'Otis Johnson Todd',
    translatorLoebVol: '4',
    translatorYears: '1923',
  },
  {
    tlg: 'tlg005',
    slug: 'apology',
    structure: 'flat-sections',
    commonTitleEn: 'Apology of Socrates',
    grcTitle: 'Ἀπολογία Σωκράτους',
    ctsEnTitle: 'Apology',
    marchantVolume: 2,
    marchantYear: 1921,
    translator: 'Otis Johnson Todd',
    translatorLoebVol: '4',
    translatorYears: '1923',
  },
  {
    tlg: 'tlg006',
    slug: 'anabasis',
    structure: 'books',
    commonTitleEn: 'Anabasis',
    grcTitle: 'Ἀνάβασις',
    ctsEnTitle: 'Anabasis',
    marchantVolume: 3,
    marchantYear: 1904,
    translator: 'Carleton L. Brownson',
    translatorLoebVol: '2-3',
    translatorYears: '1921-1922',
  },
  {
    tlg: 'tlg007',
    slug: 'cyropaedia',
    structure: 'books',
    commonTitleEn: 'Cyropaedia',
    grcTitle: 'Κύρου παιδεία',
    ctsEnTitle: 'Cyropaedia',
    marchantVolume: 4,
    marchantYear: 1910,
    translator: 'Walter Miller',
    translatorLoebVol: '5-6',
    translatorYears: '1914',
  },
  {
    tlg: 'tlg008',
    slug: 'hiero',
    structure: 'flat-chapters',
    commonTitleEn: 'Hiero',
    grcTitle: 'Ἱέρων',
    ctsEnTitle: 'Hiero',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg009',
    slug: 'agesilaus',
    structure: 'flat-chapters',
    commonTitleEn: 'Agesilaus',
    grcTitle: 'Ἀγησίλαος',
    ctsEnTitle: 'Agesilaus',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg010',
    slug: 'constitution-of-the-lacedaemonians',
    structure: 'flat-chapters',
    commonTitleEn: 'Constitution of the Lacedaemonians',
    grcTitle: 'Λακεδαιμονίων Πολιτεία',
    // Note: the CTS work-title element itself spells this "Lacedaimonians"
    // (ai, not ae) - Perseus's own transliteration variant, copied verbatim;
    // this app's slug/commonTitleEn use the more familiar "-ae-" spelling.
    ctsEnTitle: 'Constitution of the Lacedaimonians',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg011',
    slug: 'ways-and-means',
    structure: 'flat-chapters',
    commonTitleEn: 'Ways and Means',
    grcTitle: 'Πόροι ἢ περὶ προσόδων',
    ctsEnTitle: 'Ways and Means',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg012',
    slug: 'cavalry-commander',
    structure: 'flat-chapters',
    commonTitleEn: 'On the Cavalry Commander',
    grcTitle: 'Ἱππαρχικός',
    ctsEnTitle: 'On the Cavalry Commander',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg013',
    slug: 'on-horsemanship',
    structure: 'flat-chapters',
    commonTitleEn: 'On the Art of Horsemanship',
    grcTitle: 'Περὶ ἱππικῆς',
    ctsEnTitle: 'On the Art of Horsemanship',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
  {
    tlg: 'tlg014',
    slug: 'on-hunting',
    structure: 'flat-chapters',
    commonTitleEn: 'On Hunting',
    grcTitle: 'Κυνηγετικός',
    ctsEnTitle: 'On Hunting',
    marchantVolume: 5,
    marchantYear: 1920,
    translator: 'E. C. Marchant',
    translatorLoebVol: '7',
    translatorYears: '1925',
  },
];

export function grcFileName(entry: XenophonWorkEntry): string {
  return `tlg0032.${entry.tlg}.perseus-grc2.xml`;
}
export function engFileName(entry: XenophonWorkEntry): string {
  return `tlg0032.${entry.tlg}.perseus-eng2.xml`;
}
export function grcSourceUrl(entry: XenophonWorkEntry): string {
  return `https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0032/${entry.tlg}/${grcFileName(entry)}`;
}
export function engSourceUrl(entry: XenophonWorkEntry): string {
  return `https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0032/${entry.tlg}/${engFileName(entry)}`;
}
export function workId(entry: XenophonWorkEntry, lang: 'grc' | 'en'): string {
  return `xenophon-${entry.slug}-${lang}`;
}
