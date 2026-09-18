/**
 * Per-dialogue configuration table for the five Plato imports (Symposium,
 * Phaedrus, Protagoras, Gorgias, Timaeus). CTS URNs and witness ids per the
 * import spec; bibliographic fields (editor/translator/imprint/volume/date)
 * transcribed verbatim from each raw file's own <sourceDesc> (not looked up
 * externally), so they are guaranteed to match what this app actually
 * bundles.
 */

export interface DialogueMeta {
  slug: 'symposium' | 'phaedrus' | 'protagoras' | 'gorgias' | 'timaeus';
  tlg: string; // e.g. 'tlg011'
  greekTitle: string;
  englishTitle: string;
  /** expected Stephanus page range, inclusive — independently verified against the raw XML before writing this table */
  firstPage: number;
  lastPage: number;
  /** Burnet OCT (Platonis Opera) volume + date, from the Greek witness's own <sourceDesc> */
  burnetVolume: string;
  burnetDate: string;
  burnetArchiveUrl: string;
  /** English translator(s), exactly as the English witness's own <sourceDesc> lists them (role="translator" editor(s), in source order) */
  translators: string[];
  /** "Plato in Twelve Volumes" (Loeb Classical Library) internal volume number + printing date, from the English witness's own <sourceDesc> */
  loebVolume: string;
  loebDate: string;
  loebArchiveUrl: string;
}

export const DIALOGUES: DialogueMeta[] = [
  {
    slug: 'symposium',
    tlg: 'tlg011',
    greekTitle: 'Συμπόσιον',
    englishTitle: 'Symposium',
    firstPage: 172,
    lastPage: 223,
    burnetVolume: '2',
    burnetDate: '1910',
    burnetArchiveUrl: 'https://archive.org/details/operarecognovitb02platuoft',
    translators: ['Walter Rangeley Maitland Lamb'],
    loebVolume: '3',
    loebDate: '1925',
    loebArchiveUrl: 'https://archive.org/details/in.ernet.dli.2015.183496',
  },
  {
    slug: 'phaedrus',
    tlg: 'tlg012',
    greekTitle: 'Φαῖδρος',
    englishTitle: 'Phaedrus',
    firstPage: 227,
    lastPage: 279,
    burnetVolume: '2',
    burnetDate: '1910',
    burnetArchiveUrl: 'https://archive.org/details/operarecognovitb02platuoft',
    translators: ['Harold North Fowler', 'Walter Rangeley Maitland Lamb'],
    loebVolume: '1',
    loebDate: '1914',
    loebArchiveUrl: 'https://archive.org/details/in.ernet.dli.2015.102296',
  },
  {
    slug: 'protagoras',
    tlg: 'tlg022',
    greekTitle: 'Πρωταγόρας',
    englishTitle: 'Protagoras',
    firstPage: 309,
    lastPage: 362,
    burnetVolume: '3',
    burnetDate: '1903',
    burnetArchiveUrl: 'https://archive.org/details/operarecognovitb03platuoft',
    translators: ['Walter Rangeley Maitland Lamb'],
    loebVolume: '2',
    loebDate: '1924',
    loebArchiveUrl: 'https://archive.org/details/L165PlatoIILachesProtagorasMenoEuthydemus',
  },
  {
    slug: 'gorgias',
    tlg: 'tlg023',
    greekTitle: 'Γοργίας',
    englishTitle: 'Gorgias',
    firstPage: 447,
    lastPage: 527,
    burnetVolume: '3',
    burnetDate: '1903',
    burnetArchiveUrl: 'https://archive.org/details/operarecognovitb03platuoft',
    translators: ['Walter Rangeley Maitland Lamb'],
    loebVolume: '3',
    loebDate: '1925',
    loebArchiveUrl: 'https://archive.org/details/in.ernet.dli.2015.183496',
  },
  {
    slug: 'timaeus',
    tlg: 'tlg031',
    greekTitle: 'Τίμαιος',
    englishTitle: 'Timaeus',
    firstPage: 17,
    lastPage: 92,
    burnetVolume: '4',
    burnetDate: '1905',
    burnetArchiveUrl: 'https://archive.org/details/operarecognovitb04platuoft',
    translators: ['Robert Gregg Bury'],
    loebVolume: '9',
    loebDate: '1929',
    loebArchiveUrl: 'https://archive.org/details/b2900049x_0009',
  },
];

export function dialogueMeta(slug: DialogueMeta['slug']): DialogueMeta {
  const d = DIALOGUES.find((x) => x.slug === slug);
  if (!d) throw new Error(`no DialogueMeta for slug ${slug}`);
  return d;
}
