/**
 * Static Library registry. No fetch — these are compile-time constants that
 * describe which Authors and Works the app knows about. Per-work CONTENT is
 * loaded lazily elsewhere (corpus.ts for the Summa, genericCorpus.ts for the
 * generic works).
 */
import type { Author, Work } from './types.ts';

export const AUTHORS: Author[] = [
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
    meta: 'Latin',
    source: {
      edition: 'ed. aggregated from github.com/vicmortelmans/summa',
      provenance:
        'Latin text public domain; aggregated transcription (Dutch stripped on import).',
      license:
        'Latin text public domain; transcription license unverified — treat as personal use.',
    },
  },
  {
    id: 'isagoge-grc',
    authorId: 'porphyry',
    title: 'Isagoge',
    originalScriptTitle: 'Εἰσαγωγή',
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
 * Authors in ascending `sortYear`. Numeric compare (not lexical), so a future
 * Aristotle at sortYear -384 slots ahead of Porphyry (234) automatically.
 */
export function authorsSorted(): Author[] {
  return [...AUTHORS].sort((a, b) => a.sortYear - b.sortYear);
}
