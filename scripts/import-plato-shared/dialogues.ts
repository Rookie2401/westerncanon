/**
 * Per-dialogue metadata for the six Plato dialogues this batch covers
 * (Euthyphro, Apology, Crito, Phaedo, Ion, Meno). CTS URNs and witness
 * ids verified by direct fetch of each file (see the raw/ directories
 * under each scripts/import-plato-<slug>-<lang>/); nothing here is
 * inferred.
 */

export interface DialogueMeta {
  slug: string;
  tlg: string;
  /** Greek witness id, e.g. "perseus-grc2" (Euthyphro alone uses "perseus-grc1") */
  grcWitness: string;
  enWitness: string;
  titleGrc: string;
  titleEn: string;
  translator: string;
  translatorYear: number;
  /** true only for Apology: source carries no <said>/<label> markup at all */
  noSpeakerMarkup?: boolean;
}

export const DIALOGUES: Record<string, DialogueMeta> = {
  euthyphro: {
    slug: 'euthyphro',
    tlg: 'tlg001',
    grcWitness: 'perseus-grc1',
    enWitness: 'perseus-eng2',
    titleGrc: 'Εὐθύφρων',
    titleEn: 'Euthyphro',
    translator: 'Harold North Fowler',
    translatorYear: 1914,
  },
  apology: {
    slug: 'apology',
    tlg: 'tlg002',
    grcWitness: 'perseus-grc2',
    enWitness: 'perseus-eng2',
    titleGrc: 'Ἀπολογία Σωκράτους',
    titleEn: 'Apology',
    translator: 'Harold North Fowler',
    translatorYear: 1914,
    noSpeakerMarkup: true,
  },
  crito: {
    slug: 'crito',
    tlg: 'tlg003',
    grcWitness: 'perseus-grc2',
    enWitness: 'perseus-eng2',
    titleGrc: 'Κρίτων',
    titleEn: 'Crito',
    translator: 'Harold North Fowler',
    translatorYear: 1914,
  },
  phaedo: {
    slug: 'phaedo',
    tlg: 'tlg004',
    grcWitness: 'perseus-grc2',
    enWitness: 'perseus-eng2',
    titleGrc: 'Φαίδων',
    titleEn: 'Phaedo',
    translator: 'Harold North Fowler',
    translatorYear: 1914,
  },
  ion: {
    slug: 'ion',
    tlg: 'tlg027',
    grcWitness: 'perseus-grc2',
    enWitness: 'perseus-eng2',
    titleGrc: 'Ἴων',
    titleEn: 'Ion',
    translator: 'Walter R. M. Lamb',
    translatorYear: 1925,
  },
  meno: {
    slug: 'meno',
    tlg: 'tlg024',
    grcWitness: 'perseus-grc2',
    enWitness: 'perseus-eng2',
    titleGrc: 'Μένων',
    titleEn: 'Meno',
    translator: 'Walter R. M. Lamb',
    translatorYear: 1924,
  },
};

export function rawFileName(meta: DialogueMeta, lang: 'grc' | 'en'): string {
  const witness = lang === 'grc' ? meta.grcWitness : meta.enWitness;
  return `tlg0059.${meta.tlg}.${witness}.xml`;
}
