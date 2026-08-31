/**
 * Static Library registry. No fetch — these are compile-time constants that
 * describe which Authors and Works the app knows about. Per-work CONTENT is
 * loaded lazily elsewhere (corpus.ts for the Summa, genericCorpus.ts for the
 * generic works).
 */
import type { Author, Work } from './types.ts';

export const AUTHORS: Author[] = [
  {
    id: 'aristotle',
    displayName: 'Aristotle',
    sortYear: -384,
    datesLabel: '384 – 322 BC',
  },
  {
    id: 'porphyry',
    displayName: 'Porphyry',
    sortYear: 234,
    datesLabel: 'c. 234 – c. 305',
  },
  {
    id: 'thomas-aquinas',
    displayName: 'Thomas Aquinas',
    sortYear: 1225,
    datesLabel: '1225–1274',
  },
];

export const WORKS: Work[] = [
  {
    id: 'summa-theologiae',
    authorId: 'thomas-aquinas',
    title: 'Summa Theologiae',
    language: 'la',
    citationScheme: 'summa',
    profile: 'summa',
    meta: 'Latin · complete',
    source: {
      edition:
        'Parts I–III: transcription aggregated from github.com/vicmortelmans/summa (Leonine text). ' +
        '13 lacunae filled from Latin Wikisource and corpusthomisticum.org. ' +
        'Supplementum + Appendices: Marietti ed. (Turin 1926/1931) cross-checked against the Editio altera Romana vol. V (Rome, Forzani, 1894).',
      provenance:
        'Latin text public domain throughout; secondary witnesses are public-domain editions or CC-licensed transcriptions of them. See the work’s About page.',
      license:
        'Latin text public domain. Transcriptions: CC BY-SA 4.0 (Wikisource) / CC0 (Marietti transcription) / public-domain scans; base aggregation license unverified — treat this build as personal use.',
    },
  },
  {
    id: 'categoriae-grc',
    authorId: 'aristotle',
    title: 'Κατηγορίαι',
    commonTitle: 'Categories',
    group: 'Categories',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Bekker',
    source: {
      edition: 'Bekker 1837',
      editor: 'Immanuel Bekker',
      provenance:
        'TEI from OpenGreekAndLatin/First1KGreek (tlg0086.tlg006).',
      license:
        'Bekker 1837 public domain; digital text CC BY-SA 4.0 (First1KGreek).',
    },
  },
  {
    id: 'categoriae-la',
    authorId: 'aristotle',
    title: 'Categoriae',
    commonTitle: 'Categories',
    group: 'Categories',
    language: 'la',
    citationScheme: 'chapter',
    profile: 'generic',
    meta: 'Latin · trans. Boethius',
    source: {
      translator: 'Boethius',
      provenance: 'Latin Wikisource, “Categoriae”.',
      license:
        'Boethius’s translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'de-interpretatione-grc',
    authorId: 'aristotle',
    title: 'Περὶ ἑρμηνείας',
    commonTitle: 'On Interpretation',
    group: 'De Interpretatione',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Bekker',
    source: {
      edition: 'Bekker 1837',
      editor: 'Immanuel Bekker',
      provenance:
        'TEI from OpenGreekAndLatin/First1KGreek (tlg0086.tlg017).',
      license:
        'Bekker 1837 public domain; digital text CC BY-SA 4.0 (First1KGreek).',
    },
  },
  {
    id: 'de-interpretatione-la',
    authorId: 'aristotle',
    title: 'De Interpretatione',
    group: 'De Interpretatione',
    language: 'la',
    citationScheme: 'chapter',
    profile: 'generic',
    meta: 'Latin · trans. Boethius',
    source: {
      translator: 'Boethius',
      provenance: 'Latin Wikisource, “De interpretatione”.',
      license:
        'Boethius’s translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'isagoge-grc',
    authorId: 'porphyry',
    title: 'Εἰσαγωγή',
    commonTitle: 'Isagoge',
    group: 'Isagoge',
    language: 'grc',
    citationScheme: 'busse',
    profile: 'generic',
    meta: 'Greek · Busse',
    source: {
      edition: 'Busse 1887',
      editor: 'Adolf Busse',
      provenance:
        'TEI from OpenGreekAndLatin/First1KGreek (tlg2034.tlg006).',
      license:
        'Busse 1887 public domain; digital text CC BY-SA 4.0 (First1KGreek).',
    },
  },
  {
    id: 'isagoge-la',
    authorId: 'porphyry',
    title: 'Isagoge',
    group: 'Isagoge',
    language: 'la',
    citationScheme: 'section',
    profile: 'generic',
    meta: 'Latin · trans. Boethius',
    source: {
      edition: 'ed. M. Dal Pra, 1969',
      translator: 'Boethius',
      provenance: 'Latin Wikisource, “Isagoge”.',
      license:
        'Boethius’s translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
];

export function authorById(id: string): Author | undefined {
  return AUTHORS.find((a) => a.id === id);
}

export function workById(id: string): Work | undefined {
  return WORKS.find((w) => w.id === id);
}

export function worksByAuthor(authorId: string): Work[] {
  return WORKS.filter((w) => w.authorId === authorId);
}

/**
 * A single edition that stands alone in the Library list (no `group`, or the
 * only member of its group under this author).
 */
export interface SingleWorkEntry {
  kind: 'single';
  work: Work;
}

/**
 * A work-family: two or more of an author's editions of the same text,
 * collapsed under one dropdown row in the Library.
 */
export interface WorkFamilyEntry {
  kind: 'family';
  /** Conventional English family name, e.g. "Categories". */
  family: string;
  /** Persistence key for the family's open/closed state: `authorId/family`. */
  key: string;
  works: Work[];
}

export type WorkListEntry = SingleWorkEntry | WorkFamilyEntry;

/**
 * An author's works with same-text editions collapsed into families.
 * Registry array order is preserved: a family appears at the position of its
 * first member. A group with only one member renders as a plain `single`.
 */
export function groupedWorksByAuthor(authorId: string): WorkListEntry[] {
  const works = worksByAuthor(authorId);
  const groupSize = new Map<string, number>();
  for (const w of works) {
    if (w.group) groupSize.set(w.group, (groupSize.get(w.group) ?? 0) + 1);
  }

  const out: WorkListEntry[] = [];
  const families = new Map<string, WorkFamilyEntry>();
  for (const w of works) {
    if (!w.group || (groupSize.get(w.group) ?? 0) < 2) {
      out.push({ kind: 'single', work: w });
      continue;
    }
    let fam = families.get(w.group);
    if (!fam) {
      fam = {
        kind: 'family',
        family: w.group,
        key: `${authorId}/${w.group}`,
        works: [],
      };
      families.set(w.group, fam);
      out.push(fam);
    }
    fam.works.push(w);
  }
  return out;
}

/**
 * Authors in ascending `sortYear`. Numeric compare (not lexical), so a future
 * Aristotle at sortYear -384 slots ahead of Porphyry (234) automatically.
 */
export function authorsSorted(): Author[] {
  return [...AUTHORS].sort((a, b) => a.sortYear - b.sortYear);
}
