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
  {
    id: 'euclid',
    displayName: 'Euclid',
    sortYear: -300,
    datesLabel: 'fl. c. 300 BC',
  },
  {
    id: 'archimedes',
    displayName: 'Archimedes',
    sortYear: -250,
    datesLabel: 'c. 287–212 BC',
  },
  {
    id: 'augustine',
    displayName: 'Augustine of Hippo',
    sortYear: 354,
    datesLabel: '354–430',
  },
  {
    id: 'homer',
    displayName: 'Homer',
    sortYear: -750,
    datesLabel: 'fl. c. 8th century BC',
  },
  {
    id: 'hesiod',
    displayName: 'Hesiod',
    sortYear: -700,
    datesLabel: 'fl. c. 700 BC',
  },
  {
    id: 'plato',
    displayName: 'Plato',
    sortYear: -428,
    datesLabel: 'c. 428 – 348 BC',
  },
  {
    id: 'virgil',
    displayName: 'Virgil',
    sortYear: -70,
    datesLabel: '70 – 19 BC',
  },
  {
    id: 'cicero',
    displayName: 'Cicero',
    sortYear: -106,
    datesLabel: '106 – 43 BC',
  },
];

export const WORKS: Work[] = [
  {
    id: 'summa-theologiae',
    authorId: 'thomas-aquinas',
    title: 'Summa Theologiae',
    group: 'Summa Theologiae',
    language: 'la',
    citationScheme: 'summa',
    profile: 'summa',
    meta: 'Latin · various sources',
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
    id: 'summa-theologiae-en',
    authorId: 'thomas-aquinas',
    title: 'Summa Theologiae',
    commonTitle: 'Summa Theologica',
    group: 'Summa Theologiae',
    language: 'en',
    citationScheme: 'summa',
    profile: 'summa',
    meta: 'English · trans. Dominican Fathers',
    source: {
      translator: 'Fathers of the English Dominican Province',
      edition: '2nd and revised edition, 1920',
      provenance:
        'Text aggregated from New Advent (newadvent.org/summa) and CCEL (ccel.org). See the work’s About page.',
      license:
        'Translation public domain (1920). Digital transcription license varies by source page; treat this build as personal use pending per-source verification.',
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
    id: 'categoriae-en',
    authorId: 'aristotle',
    title: 'Categories',
    group: 'Categories',
    language: 'en',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'English · trans. Edghill',
    source: {
      translator: 'Ella Mary Edghill',
      editor: 'William David Ross',
      edition: 'The Works of Aristotle, Volume I, ed. W. D. Ross (Oxford: Clarendon Press, 1928)',
      provenance: 'English Wikisource, “The Works of Aristotle/Categories”.',
      license:
        'Edghill’s 1928 translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'de-interpretatione-en',
    authorId: 'aristotle',
    title: 'On Interpretation',
    group: 'De Interpretatione',
    language: 'en',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'English · trans. Edghill',
    source: {
      translator: 'Ella Mary Edghill',
      editor: 'William David Ross',
      edition: 'The Works of Aristotle, Volume I, ed. W. D. Ross (Oxford: Clarendon Press, 1928)',
      provenance: 'English Wikisource, “The Works of Aristotle/On Interpretation”.',
      license:
        'Edghill’s 1928 translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'physics-grc',
    authorId: 'aristotle',
    title: 'Φυσικὴ ἀκρόασις',
    commonTitle: 'Physics',
    group: 'Physics',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Ross',
    source: {
      edition: 'W. D. Ross, ed., Aristotelis Physica (Oxford Classical Texts; Clarendon Press, Oxford, imprint 1960, reprinting the 1950 critical edition)',
      editor: 'William David Ross',
      provenance:
        'TEI from OpenGreekAndLatin/First1KGreek (urn:cts:greekLit:tlg0086.tlg031.1st1K-grc1).',
      license:
        "Ross's critical edition (1950) is in the public domain; digital text CC BY-SA 4.0 (First1KGreek).",
    },
  },
  {
    id: 'metaphysics-grc',
    authorId: 'aristotle',
    title: 'τὰ Μετὰ τὰ Φυσικά',
    commonTitle: 'Metaphysics',
    group: 'Metaphysics',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Ross',
    source: {
      edition: "Aristotle's Metaphysics, ed. W. D. Ross, 2 vols. (Oxford: Clarendon Press, 1924)",
      editor: 'William David Ross',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0086.tlg025.perseus-grc2).',
      license:
        "Ross's 1924 edition is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'metaphysics-en',
    authorId: 'aristotle',
    title: 'Metaphysics',
    group: 'Metaphysics',
    language: 'en',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'English · trans. Ross (partial)',
    source: {
      translator: 'William David Ross',
      edition: 'Metaphysics, trans. W. D. Ross (1908)',
      provenance:
        'English Wikisource, "Metaphysics (Ross, 1908)" - page-scan transcription, 9 of 14 books (the Wikisource project is itself unfinished). See the work\'s own About page for the exact, book-by-book scope.',
      license:
        "Ross's 1908 translation is public domain; transcription CC BY-SA 4.0 (Wikisource).",
    },
  },
  {
    id: 'posterior-analytics-grc',
    authorId: 'aristotle',
    title: 'Ἀναλυτικῶν Ὑστέρων',
    commonTitle: 'Posterior Analytics',
    group: 'Posterior Analytics',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Wikisource',
    source: {
      provenance:
        'Greek Wikisource, "Ἀναλυτικῶν υστέρων" - a community transcription with no critical edition explicitly cited on the source page (disclosed in the work\'s About page).',
      license: 'Ancient text, public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'posterior-analytics-en',
    authorId: 'aristotle',
    title: 'Posterior Analytics',
    group: 'Posterior Analytics',
    language: 'en',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'English · trans. Bouchier',
    source: {
      translator: 'E. S. Bouchier',
      edition: "E. S. Bouchier, Aristotle's Posterior Analytics (Oxford: Blackwell, 1901)",
      provenance: 'English Wikisource, "Posterior Analytics (Bouchier)".',
      license: "Bouchier's 1901 translation public domain; transcription CC BY-SA 4.0 (Wikisource).",
    },
  },
  {
    id: 'nicomachean-ethics-grc',
    authorId: 'aristotle',
    title: 'Ἠθικὰ Νικομάχεια',
    commonTitle: 'Nicomachean Ethics',
    group: 'Nicomachean Ethics',
    language: 'grc',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'Greek · Bywater',
    source: {
      edition: 'Ingram Bywater, ed., Aristotelis Ethica Nicomachea (Oxford: Clarendon Press, 1894)',
      editor: 'Ingram Bywater',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-grc2).',
      license:
        "Bywater's 1894 edition is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'nicomachean-ethics-en',
    authorId: 'aristotle',
    title: 'Nicomachean Ethics',
    group: 'Nicomachean Ethics',
    language: 'en',
    citationScheme: 'bekker-chapter',
    profile: 'generic',
    meta: 'English · trans. Rackham',
    source: {
      translator: 'Harris Rackham',
      edition: 'The Nicomachean Ethics, trans. H. Rackham, Loeb Classical Library (London: William Heinemann; New York: G. P. Putnam\'s Sons, 1926 printing)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-eng2).',
      license:
        "Rackham's 1926 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
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
  {
    id: 'isagoge-en',
    authorId: 'porphyry',
    title: 'Isagoge',
    group: 'Isagoge',
    language: 'en',
    citationScheme: 'chapter',
    profile: 'generic',
    meta: 'English · trans. Owen',
    source: {
      edition: 'The Organon, or Logical Treatises, of Aristotle (Bohn, 1853)',
      translator: 'Octavius Freire Owen',
      provenance: 'English Wikisource, “Organon (Owen)/The Introduction of Porphyry”.',
      license:
        'Owen’s translation public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'euclid-elements',
    authorId: 'euclid',
    title: 'Στοιχεῖα',
    commonTitle: 'Elements',
    group: 'Elements',
    language: 'grc',
    citationScheme: 'heiberg-book-number',
    profile: 'generic',
    meta: 'Greek · Heiberg',
    source: {
      edition: 'Heiberg 1883-88',
      editor: 'Johan Ludvig Heiberg',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg1799.tlg001, witness perseus-grc2).',
      license:
        'Heiberg 1883-88 public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'euclid-elements-en',
    authorId: 'euclid',
    title: 'Elements',
    group: 'Elements',
    language: 'en',
    citationScheme: 'heiberg-book-number',
    profile: 'generic',
    meta: 'English · trans. Heath',
    source: {
      edition: "The Thirteen Books of Euclid's Elements, trans. from the text of Heiberg (Cambridge, 1908)",
      translator: 'Thomas Little Heath',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg1799.tlg001, witness perseus-eng2).',
      license:
        'Heath 1908 public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'archimedes-sphere-cylinder',
    authorId: 'archimedes',
    title: 'De sphaera et cylindro',
    commonTitle: 'On the Sphere and Cylinder',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 1',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1970 (vol. 1)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg001), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 1, 1970); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-measurement-circle',
    authorId: 'archimedes',
    title: 'Dimensio circuli',
    commonTitle: 'Measurement of a Circle',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 1',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1970 (vol. 1)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg002), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 1, 1970); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-conoids-spheroids',
    authorId: 'archimedes',
    title: 'De conoidibus et sphaeroidibus',
    commonTitle: 'On Conoids and Spheroids',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 1',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1970 (vol. 1)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg003), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 1, 1970); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-spirals',
    authorId: 'archimedes',
    title: 'De lineis spiralibus',
    commonTitle: 'On Spirals',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 2',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 2)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg004), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 2, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-plane-equilibrium',
    authorId: 'archimedes',
    title: 'De planorum aequilibriis',
    commonTitle: 'On the Equilibrium of Planes',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 2',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 2)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg005), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 2, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-sand-reckoner',
    authorId: 'archimedes',
    title: 'Arenarius',
    commonTitle: 'The Sand-Reckoner',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 2',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 2)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg006), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 2, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-quadrature-parabola',
    authorId: 'archimedes',
    title: 'Quadratura parabolae',
    commonTitle: 'Quadrature of the Parabola',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 2',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 2)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg007), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 2, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-floating-bodies',
    authorId: 'archimedes',
    title: 'De corporibus fluitantibus',
    commonTitle: 'On Floating Bodies',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 3',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 3)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg008), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 3, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-stomachion',
    authorId: 'archimedes',
    title: 'Stomachion',
    commonTitle: 'Stomachion',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 3',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 3)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg009), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 3, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-method',
    authorId: 'archimedes',
    title: 'Ad Eratosthenem methodus',
    commonTitle: 'The Method',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 3',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 3)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg010), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 3, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-liber-assumptorum',
    authorId: 'archimedes',
    title: 'Liber assumptorum',
    commonTitle: 'Book of Lemmas',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 3',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 3)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg011), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 3, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-cattle-problem',
    authorId: 'archimedes',
    title: 'Problema bovinum',
    commonTitle: 'The Cattle Problem',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 3',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1971 (vol. 3)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg012), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 3, 1971); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'archimedes-fragments',
    authorId: 'archimedes',
    title: 'Fragmenta',
    commonTitle: 'Fragments',
    language: 'grc',
    citationScheme: 'mugler-vol-page',
    profile: 'generic',
    meta: 'Greek · Mugler vol. 4',
    source: {
      editor: 'Charles Mugler',
      edition: 'Mugler 1972 (vol. 4)',
      provenance:
        "TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.tlg013), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. 4, 1972); imported by scripts/import-archimedes.",
      license:
        "The Greek text of Mugler's edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'augustine-confessions-la',
    authorId: 'augustine',
    title: 'Confessiones',
    commonTitle: 'Confessions',
    group: 'Confessions',
    language: 'la',
    citationScheme: 'book-chapter-section',
    profile: 'generic',
    meta: 'Latin',
    source: {
      provenance: 'Latin Wikisource, "Confessiones" (text from thelatinlibrary.com).',
      license:
        'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'augustine-confessions-en',
    authorId: 'augustine',
    title: 'Confessions',
    group: 'Confessions',
    language: 'en',
    citationScheme: 'book-chapter',
    profile: 'generic',
    meta: 'English · trans. Pilkington',
    source: {
      translator: 'J. G. Pilkington',
      edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. I (1887)',
      provenance:
        'English Wikisource, "The Confessions of Saint Augustine (Pilkington)".',
      license:
        'Translation public domain (1887); transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'augustine-city-of-god-la',
    authorId: 'augustine',
    title: 'De Civitate Dei',
    commonTitle: 'City of God',
    group: 'City of God',
    language: 'la',
    citationScheme: 'book-chapter',
    profile: 'generic',
    meta: 'Latin',
    source: {
      provenance: 'Latin Wikisource, "De civitate Dei" (text from thelatinlibrary.com).',
      license:
        'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'augustine-city-of-god-en',
    authorId: 'augustine',
    title: 'City of God',
    group: 'City of God',
    language: 'en',
    citationScheme: 'book-chapter',
    profile: 'generic',
    meta: 'English · trans. Dods',
    source: {
      translator: 'Marcus Dods',
      edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. II (1887)',
      provenance:
        'English Wikisource, "Nicene and Post-Nicene Fathers: Series I/Volume II/City of God".',
      license:
        'Translation public domain (1887); transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'augustine-christian-doctrine-la',
    authorId: 'augustine',
    title: 'De Doctrina Christiana',
    commonTitle: 'On Christian Doctrine',
    group: 'On Christian Doctrine',
    language: 'la',
    citationScheme: 'book-chapter-section',
    profile: 'generic',
    meta: 'Latin',
    source: {
      provenance: 'Latin Wikisource, "De Doctrina Christiana".',
      license:
        'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'augustine-christian-doctrine-en',
    authorId: 'augustine',
    title: 'On Christian Doctrine',
    group: 'On Christian Doctrine',
    language: 'en',
    citationScheme: 'book-chapter',
    profile: 'generic',
    meta: 'English · trans. Shaw',
    source: {
      translator: 'J. F. Shaw',
      edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. II (1887)',
      provenance:
        'English Wikisource, "Nicene and Post-Nicene Fathers: Series I/Volume II/On Christian Doctrine".',
      license:
        'Translation public domain (1887); transcription CC BY-SA 4.0 (Wikisource).',
    },
  },
  {
    id: 'iliad-grc',
    authorId: 'homer',
    title: 'Ἰλιάς',
    commonTitle: 'Iliad',
    group: 'Iliad',
    language: 'grc',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'Greek · Monro/Allen',
    source: {
      edition: 'Monro/Allen, Homeri Opera, Oxford Classical Texts (3rd ed. 1920)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0012.tlg001, witness perseus-grc2).',
      license:
        'Greek text (Monro/Allen, early 20th century) is in the public domain. The Perseus/Open Greek and Latin digital TEI encoding is licensed CC BY-SA 4.0.',
    },
  },
  {
    id: 'iliad-en',
    authorId: 'homer',
    title: 'Iliad',
    group: 'Iliad',
    language: 'en',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'English · trans. Murray',
    source: {
      edition: 'Loeb Classical Library, 2 vols. (Cambridge, MA: Harvard University Press, 1924-25)',
      translator: 'A. T. Murray',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0012.tlg001, witness perseus-eng3).',
      license:
        "A. T. Murray's translation was first published 1919 (Odyssey) and 1924-25 (Iliad) - more than 95 years ago - and is in the public domain in the United States. The Perseus/Open Greek and Latin digital TEI encoding is licensed CC BY-SA 4.0.",
    },
  },
  {
    id: 'odyssey-grc',
    authorId: 'homer',
    title: 'Ὀδύσσεια',
    commonTitle: 'Odyssey',
    group: 'Odyssey',
    language: 'grc',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'Greek · Monro/Allen',
    source: {
      edition: 'Monro/Allen, Homeri Opera, Oxford Classical Texts (2nd ed. 1917-19)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0012.tlg002, witness perseus-grc2).',
      license:
        'Greek text (Monro/Allen, early 20th century) is in the public domain. The Perseus/Open Greek and Latin digital TEI encoding is licensed CC BY-SA 4.0.',
    },
  },
  {
    id: 'odyssey-en',
    authorId: 'homer',
    title: 'Odyssey',
    group: 'Odyssey',
    language: 'en',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'English · trans. Murray',
    source: {
      edition: 'Loeb Classical Library, 2 vols. (Cambridge, MA: Harvard University Press, 1919)',
      translator: 'A. T. Murray',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0012.tlg002, witness perseus-eng3).',
      license:
        "A. T. Murray's translation was first published 1919 (Odyssey) and 1924-25 (Iliad) - more than 95 years ago - and is in the public domain in the United States. The Perseus/Open Greek and Latin digital TEI encoding is licensed CC BY-SA 4.0.",
    },
  },
  {
    id: 'theogony-grc',
    authorId: 'hesiod',
    title: 'Θεογονία',
    commonTitle: 'Theogony',
    group: 'Theogony',
    language: 'grc',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'Greek · Hugh G. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg001, witness perseus-grc2).',
      license:
        'The Greek critical text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'theogony-en',
    authorId: 'hesiod',
    title: 'Theogony',
    group: 'Theogony',
    language: 'en',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'English · trans. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      translator: 'Hugh G. Evelyn-White',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg001, witness perseus-eng2).',
      license:
        'Hugh G. Evelyn-White\'s translation was first published in 1914 (Hesiod, the Homeric Hymns and Homerica, Loeb Classical Library, London: William Heinemann / New York: The Macmillan Co.) and is in the public domain (110+ years old). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'works-and-days-grc',
    authorId: 'hesiod',
    title: 'Ἔργα καὶ Ἡμέραι',
    commonTitle: 'Works and Days',
    group: 'Works and Days',
    language: 'grc',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'Greek · Hugh G. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg002, witness perseus-grc2).',
      license:
        'The Greek critical text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'works-and-days-en',
    authorId: 'hesiod',
    title: 'Works and Days',
    group: 'Works and Days',
    language: 'en',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'English · trans. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      translator: 'Hugh G. Evelyn-White',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg002, witness perseus-eng2).',
      license:
        'Hugh G. Evelyn-White\'s translation was first published in 1914 (Hesiod, the Homeric Hymns and Homerica, Loeb Classical Library, London: William Heinemann / New York: The Macmillan Co.) and is in the public domain (110+ years old). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'shield-of-heracles-grc',
    authorId: 'hesiod',
    title: 'Ἀσπὶς Ἡρακλέους',
    commonTitle: 'Shield of Heracles',
    group: 'Shield of Heracles',
    language: 'grc',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'Greek · Hugh G. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg003, witness perseus-grc2).',
      license:
        'The Greek critical text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'shield-of-heracles-en',
    authorId: 'hesiod',
    title: 'Shield of Heracles',
    group: 'Shield of Heracles',
    language: 'en',
    citationScheme: 'card',
    profile: 'generic',
    meta: 'English · trans. Evelyn-White',
    source: {
      edition: 'Evelyn-White 1914 (Loeb Classical Library)',
      translator: 'Hugh G. Evelyn-White',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0020.tlg003, witness perseus-eng2).',
      license:
        'Hugh G. Evelyn-White\'s translation was first published in 1914 (Hesiod, the Homeric Hymns and Homerica, Loeb Classical Library, London: William Heinemann / New York: The Macmillan Co.) and is in the public domain (110+ years old). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin Project ("canonical-greekLit") under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    },
  },
  {
    id: 'aeneid-la',
    authorId: 'virgil',
    title: 'Aeneis',
    commonTitle: 'Aeneid',
    group: 'Aeneid',
    language: 'la',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'Latin · Greenough',
    source: {
      edition: 'J. B. Greenough, ed., Bucolics, Aeneid, and Georgics of Vergil (Boston: Ginn & Co., 1900 [text orig. 1881])',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0690.phi003, witness perseus-lat2).',
      license:
        'Latin text (Greenough, 1881/1900) is public domain. TEI XML digitization/markup: CC BY-SA 4.0 (Perseus Digital Library / Open Greek and Latin).',
    },
  },
  {
    id: 'aeneid-en',
    authorId: 'virgil',
    title: 'Aeneid',
    group: 'Aeneid',
    language: 'en',
    citationScheme: 'book-line',
    profile: 'generic',
    meta: 'English · trans. Williams',
    source: {
      edition: 'Theodore C. Williams, trans., The Aeneid of Virgil, Translated into English Verse (Boston: Houghton Mifflin Co., 1910)',
      translator: 'Theodore Chickering Williams',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0690.phi003, witness perseus-eng2).',
      license:
        'English translation (Williams, 1910) is public domain. TEI XML digitization/markup: CC BY-SA 4.0 (Perseus Digital Library / Open Greek and Latin).',
    },
  },
  {
    id: 'plato-euthyphro-grc',
    authorId: 'plato',
    title: 'Εὐθύφρων',
    commonTitle: 'Euthyphro',
    group: 'Euthyphro',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg001, witness perseus-grc1).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-euthyphro-en',
    authorId: 'plato',
    title: 'Euthyphro',
    group: 'Euthyphro',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Fowler',
    source: {
      edition: 'Loeb Classical Library, 1914',
      translator: 'Harold North Fowler',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg001, witness perseus-eng2).',
      license:
        "Harold North Fowler's 1914 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-apology-grc',
    authorId: 'plato',
    title: 'Ἀπολογία Σωκράτους',
    commonTitle: 'Apology',
    group: 'Apology',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg002, witness perseus-grc2).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-apology-en',
    authorId: 'plato',
    title: 'Apology',
    group: 'Apology',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Fowler',
    source: {
      edition: 'Loeb Classical Library, 1914',
      translator: 'Harold North Fowler',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg002, witness perseus-eng2).',
      license:
        "Harold North Fowler's 1914 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-crito-grc',
    authorId: 'plato',
    title: 'Κρίτων',
    commonTitle: 'Crito',
    group: 'Crito',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg003, witness perseus-grc2).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-crito-en',
    authorId: 'plato',
    title: 'Crito',
    group: 'Crito',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Fowler',
    source: {
      edition: 'Loeb Classical Library, 1914',
      translator: 'Harold North Fowler',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg003, witness perseus-eng2).',
      license:
        "Harold North Fowler's 1914 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-phaedo-grc',
    authorId: 'plato',
    title: 'Φαίδων',
    commonTitle: 'Phaedo',
    group: 'Phaedo',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg004, witness perseus-grc2).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-phaedo-en',
    authorId: 'plato',
    title: 'Phaedo',
    group: 'Phaedo',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Fowler',
    source: {
      edition: 'Loeb Classical Library, 1914',
      translator: 'Harold North Fowler',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg004, witness perseus-eng2).',
      license:
        "Harold North Fowler's 1914 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-symposium-grc',
    authorId: 'plato',
    title: 'Συμπόσιον',
    commonTitle: 'Symposium',
    group: 'Symposium',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1910 (OCT, vol. 2)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg011, witness perseus-grc2).',
      license:
        'Public domain (Burnet 1900s OCT text; ancient text). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-symposium-en',
    authorId: 'plato',
    title: 'Symposium',
    group: 'Symposium',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Walter Rangeley Maitland Lamb, 1925 (Loeb Classical Library)',
      translator: 'Walter Rangeley Maitland Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg011, witness perseus-eng2).',
      license:
        'Public domain (Burnet 1900s OCT text; 1925 Loeb translation, 95+ years old). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-phaedrus-grc',
    authorId: 'plato',
    title: 'Φαῖδρος',
    commonTitle: 'Phaedrus',
    group: 'Phaedrus',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1910 (OCT, vol. 2)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg012, witness perseus-grc2).',
      license:
        'Public domain (Burnet 1900s OCT text; ancient text). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-phaedrus-en',
    authorId: 'plato',
    title: 'Phaedrus',
    group: 'Phaedrus',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Harold North Fowler and Walter Rangeley Maitland Lamb, 1914 (Loeb Classical Library)',
      translator: 'Harold North Fowler and Walter Rangeley Maitland Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg012, witness perseus-eng2).',
      license:
        'Public domain (Burnet 1900s OCT text; 1914 Loeb translation, 95+ years old). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-protagoras-grc',
    authorId: 'plato',
    title: 'Πρωταγόρας',
    commonTitle: 'Protagoras',
    group: 'Protagoras',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1903 (OCT, vol. 3)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg022, witness perseus-grc2).',
      license:
        'Public domain (Burnet 1900s OCT text; ancient text). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-protagoras-en',
    authorId: 'plato',
    title: 'Protagoras',
    group: 'Protagoras',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Walter Rangeley Maitland Lamb, 1924 (Loeb Classical Library)',
      translator: 'Walter Rangeley Maitland Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg022, witness perseus-eng2).',
      license:
        'Public domain (Burnet 1900s OCT text; 1924 Loeb translation, 95+ years old). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-gorgias-grc',
    authorId: 'plato',
    title: 'Γοργίας',
    commonTitle: 'Gorgias',
    group: 'Gorgias',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1903 (OCT, vol. 3)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg023, witness perseus-grc2).',
      license:
        'Public domain (Burnet 1900s OCT text; ancient text). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-gorgias-en',
    authorId: 'plato',
    title: 'Gorgias',
    group: 'Gorgias',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Walter Rangeley Maitland Lamb, 1925 (Loeb Classical Library)',
      translator: 'Walter Rangeley Maitland Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg023, witness perseus-eng2).',
      license:
        'Public domain (Burnet 1900s OCT text; 1925 Loeb translation, 95+ years old). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-meno-grc',
    authorId: 'plato',
    title: 'Μένων',
    commonTitle: 'Meno',
    group: 'Meno',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg024, witness perseus-grc2).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-meno-en',
    authorId: 'plato',
    title: 'Meno',
    group: 'Meno',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Loeb Classical Library, 1924',
      translator: 'Walter R. M. Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg024, witness perseus-eng2).',
      license:
        "Walter R. M. Lamb's 1924 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-ion-grc',
    authorId: 'plato',
    title: 'Ἴων',
    commonTitle: 'Ion',
    group: 'Ion',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet, Oxford Classical Texts (1900–1907)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg027, witness perseus-grc2).',
      license:
        "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-ion-en',
    authorId: 'plato',
    title: 'Ion',
    group: 'Ion',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Lamb',
    source: {
      edition: 'Loeb Classical Library, 1925',
      translator: 'Walter R. M. Lamb',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg027, witness perseus-eng2).',
      license:
        "Walter R. M. Lamb's 1925 translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    },
  },
  {
    id: 'plato-timaeus-grc',
    authorId: 'plato',
    title: 'Τίμαιος',
    commonTitle: 'Timaeus',
    group: 'Timaeus',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1905 (OCT, vol. 4)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg031, witness perseus-grc2).',
      license:
        'Public domain (Burnet 1900s OCT text; ancient text). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-timaeus-en',
    authorId: 'plato',
    title: 'Timaeus',
    group: 'Timaeus',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Bury',
    source: {
      edition: 'Robert Gregg Bury, 1929 (Loeb Classical Library)',
      translator: 'Robert Gregg Bury',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg031, witness perseus-eng2).',
      license:
        'Public domain (Burnet 1900s OCT text; 1929 Loeb translation, 95+ years old). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    },
  },
  {
    id: 'plato-laws-grc',
    authorId: 'plato',
    title: 'Νόμοι',
    commonTitle: 'Laws',
    group: 'Laws',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1907 (OCT)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg034, witness perseus-grc2).',
      license:
        "Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0); Burnet's underlying 1907 edition is in the public domain (author died 1928, and the edition itself is well out of copyright in the US and elsewhere).",
    },
  },
  {
    id: 'plato-laws-en',
    authorId: 'plato',
    title: 'Laws',
    group: 'Laws',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Bury',
    source: {
      edition: 'Loeb Classical Library 187 & 192 (1926)',
      translator: 'R. G. Bury',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg034, witness perseus-eng2).',
      license:
        "Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0). Bury's 1926 translation is in the public domain in the United States (95-years-from-publication rule).",
    },
  },
  {
    id: 'plato-republic-grc',
    authorId: 'plato',
    title: 'Πολιτεία',
    commonTitle: 'Republic',
    group: 'Republic',
    language: 'grc',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'Greek · John Burnet',
    source: {
      edition: 'Burnet 1902 (OCT)',
      provenance:
        'TEI from PerseusDL/canonical-greekLit (CTS urn:cts:greekLit:tlg0059.tlg030, witness perseus-grc2).',
      license:
        "Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0); Burnet's underlying 1902 edition is in the public domain (author died 1928, and the edition itself is well out of copyright in the US and elsewhere).",
    },
  },
  {
    id: 'plato-republic-en',
    authorId: 'plato',
    title: 'Republic',
    group: 'Republic',
    language: 'en',
    citationScheme: 'stephanus',
    profile: 'generic',
    meta: 'English · trans. Jowett',
    source: {
      edition:
        "Benjamin Jowett's translation, 1871 (revised for later editions; this Gutenberg text reflects his later revised wording)",
      translator: 'Benjamin Jowett',
      provenance:
        'Project Gutenberg ebook #1497, "The Republic" by Plato, translated by Benjamin Jowett (plain text, not from Perseus/OGL like this work\'s Greek edition and every other English edition in this corpus - see the About page for why: Perseus\'s own Republic translation, Shorey 1935-37, is not yet public domain in the US).',
      license:
        "Jowett's translation is in the public domain worldwide (translator died 1893). The Project Gutenberg transcription of it is also in the public domain in the United States.",
    },
  },
  {
    id: 'pro-archia-la',
    authorId: 'cicero',
    title: 'Pro Archia Poeta',
    group: 'Pro Archia',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Volume 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1911)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi016.perseus-lat2).',
      license: "Clark's 1911 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-archia-en',
    authorId: 'cicero',
    title: 'For Archias',
    group: 'Pro Archia',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: 'The Orations of Marcus Tullius Cicero, Volume 2, trans. Charles Duke Yonge (London: Bell, 1856)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi016.perseus-eng2).',
      license: "Yonge's 1856 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-roscio-amerino-la',
    authorId: 'cicero',
    title: 'Pro S. Roscio Amerino',
    group: 'Pro Roscio Amerino',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Volume 1, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1908)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi002.perseus-lat2).',
      license: "Clark's 1908 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-roscio-amerino-en',
    authorId: 'cicero',
    title: 'For Sextus Roscius of Ameria',
    group: 'Pro Roscio Amerino',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: 'The Orations of Marcus Tullius Cicero, Volume 1, trans. Charles Duke Yonge (London: Bell, 1903)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi002.perseus-eng2).',
      license: "Yonge's translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-caelio-la',
    authorId: 'cicero',
    title: 'Pro M. Caelio',
    group: 'Pro Caelio',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Volume 1, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1908)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi024.perseus-lat2). No public-domain English translation is bundled - the only candidate found (English Wikisource, "For Marcus Caelius") turned out to have unreliable, partly unattributed provenance on independent investigation; shipped Latin-only pending a better source.',
      license: "Clark's 1908 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'in-catilinam-la',
    authorId: 'cicero',
    title: 'In Catilinam',
    group: 'In Catilinam',
    language: 'la',
    citationScheme: 'cicero-speech-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Volume 1, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1908)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi013.perseus-lat2).',
      license: "Clark's 1908 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'in-catilinam-en',
    authorId: 'cicero',
    title: 'Against Catiline',
    group: 'In Catilinam',
    language: 'en',
    citationScheme: 'cicero-speech-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: 'The Orations of Marcus Tullius Cicero, Volume 2, trans. Charles Duke Yonge (London: Bell, 1856)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi013.perseus-eng2).',
      license: "Yonge's 1856 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'philippics-la',
    authorId: 'cicero',
    title: 'Philippicae',
    group: 'Philippics',
    language: 'la',
    citationScheme: 'cicero-speech-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Vol. 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1918)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi035.perseus-lat2).',
      license: "Clark's 1918 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'philippics-en',
    authorId: 'cicero',
    title: 'The Philippics',
    group: 'Philippics',
    language: 'en',
    citationScheme: 'cicero-speech-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: 'The Orations of Marcus Tullius Cicero, Vol. 4, trans. Charles Duke Yonge (London: Bell, 1856)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi035.perseus-eng1) - 543 of 544 sections vs. the Latin sibling; the source\'s own section-milestone numbering genuinely skips "24" in Philippic 2, disclosed on the About page.',
      license: "Yonge's 1856 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'in-verrem-la',
    authorId: 'cicero',
    title: 'In Verrem',
    group: 'In Verrem',
    language: 'la',
    citationScheme: 'cicero-actio-book-section',
    profile: 'generic',
    meta: 'Latin · Peterson',
    source: {
      editor: 'William Peterson',
      edition: 'M. Tulli Ciceronis Orationes, Volume 3, ed. William Peterson (Oxford: Clarendon Press, 1917)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi005.perseus-lat2).',
      license: "Peterson's 1917 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'in-verrem-en',
    authorId: 'cicero',
    title: 'Against Verres',
    group: 'In Verrem',
    language: 'en',
    citationScheme: 'cicero-actio-book-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: 'The Orations of Marcus Tullius Cicero, Volume 1, trans. Charles Duke Yonge (London: Bell, 1903)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi005.perseus-eng2).',
      license: "Yonge's translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-sestio-la',
    authorId: 'cicero',
    title: 'Pro Sestio',
    group: 'Pro Sestio',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Peterson',
    source: {
      editor: 'William Peterson',
      edition: 'M. Tulli Ciceronis Orationes, Vol. 5, ed. William Peterson (Oxford: Clarendon Press, 1909)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi022.perseus-lat2). No public-domain English translation was found on Perseus, Wikisource or Gutenberg; shipped Latin-only pending a better source.',
      license: "Peterson's 1909 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-milone-la',
    authorId: 'cicero',
    title: 'Pro Milone',
    group: 'Pro Milone',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Vol. 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1918)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi031.perseus-lat2). No public-domain English translation was found on Perseus, Wikisource or Gutenberg; shipped Latin-only pending a better source.',
      license: "Clark's 1918 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-marcello-la',
    authorId: 'cicero',
    title: 'Pro Marcello',
    group: 'Pro Marcello',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Vol. 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1918)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi032.perseus-lat2). A public-domain English translation (Yonge, English Wikisource) exists but breaks off about a quarter of the way through the speech; shipped Latin-only for now rather than a misleadingly partial translation.',
      license: "Clark's 1918 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'pro-ligario-la',
    authorId: 'cicero',
    title: 'Pro Ligario',
    group: 'Pro Ligario',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Clark',
    source: {
      editor: 'Albert Curtis Clark',
      edition: 'M. Tulli Ciceronis Orationes, Vol. 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1918)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi033.perseus-lat2). No public-domain English translation was found on Perseus, Wikisource or Gutenberg; shipped Latin-only pending a better source.',
      license: "Clark's 1918 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-oratore-la',
    authorId: 'cicero',
    title: 'De Oratore',
    group: 'De Oratore',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Wilkins',
    source: {
      editor: 'Augustus Samuel Wilkins',
      edition: 'M. Tulli Ciceronis Rhetorica, Vol. 1, ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi037.perseus-lat2). The only public-domain English fragment found (Guthrie, 1822, English Wikisource) covers Book 1 of 3 only; shipped Latin-only for now rather than a misleadingly partial translation.',
      license: "Wilkins' 1902 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'brutus-la',
    authorId: 'cicero',
    title: 'Brutus',
    group: 'Brutus',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Wilkins',
    source: {
      editor: 'Augustus Samuel Wilkins',
      edition: 'M. Tulli Ciceronis Rhetorica, Vol. 2, ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi039.perseus-lat2).',
      license: "Wilkins' 1902 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'brutus-en',
    authorId: 'cicero',
    title: 'Brutus',
    group: 'Brutus',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Jones',
    source: {
      translator: 'E. Jones',
      edition: 'First edition (London: B. White, 1776)',
      provenance:
        'Project Gutenberg ebook #9776, "Cicero\'s Brutus, or History of Famous Orators; also His Orator, or Accomplished Speaker", trans. E. Jones (1776) - shares one source file with orator-en. This 1776 translation prints no section numbers; divided into mechanical reading chunks that do not correspond to the Latin edition\'s section numbers (disclosed on the About page).',
      license: "Jones's 1776 translation is public domain worldwide.",
    },
  },
  {
    id: 'orator-la',
    authorId: 'cicero',
    title: 'Orator',
    group: 'Orator',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Wilkins',
    source: {
      editor: 'Augustus Samuel Wilkins',
      edition: 'M. Tulli Ciceronis Rhetorica, Vol. 2, ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi040.perseus-lat2).',
      license: "Wilkins' 1902 critical text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'orator-en',
    authorId: 'cicero',
    title: 'Orator',
    group: 'Orator',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Jones',
    source: {
      translator: 'E. Jones',
      edition: 'First edition (London: B. White, 1776)',
      provenance:
        'Project Gutenberg ebook #9776, "Cicero\'s Brutus, or History of Famous Orators; also His Orator, or Accomplished Speaker", trans. E. Jones (1776) - shares one source file with brutus-en. This 1776 translation prints no section numbers; divided into mechanical reading chunks that do not correspond to the Latin edition\'s section numbers (disclosed on the About page).',
      license: "Jones's 1776 translation is public domain worldwide.",
    },
  },
  {
    id: 'de-republica-la',
    authorId: 'cicero',
    title: 'De Republica',
    commonTitle: 'On the Republic',
    group: 'De Republica',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Mueller (fragmentary)',
    source: {
      editor: 'Carl Friedrich Wilhelm Mueller',
      edition: 'M. Tulli Ciceronis: Librorum de Re Publica Sex, ed. C. F. W. Mueller (Leipzig: Teubner, 1889)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi043.perseus-lat2). This work survives only in genuinely fragmentary form (a rediscovered palimpsest plus scattered later quotations) - 6 numbered books plus 3 separately-transmitted fragment collections, all preserved and disclosed on the About page. No public-domain English translation is bundled: the one available (Featherstonhaugh, 1829) has significant internal gaps and omits Book 6/the Dream of Scipio entirely; shipped Latin-only pending a better source.',
      license: "Mueller's 1889 Latin text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-legibus-la',
    authorId: 'cicero',
    title: 'De Legibus',
    commonTitle: 'On the Laws',
    group: 'De Legibus',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Wikisource',
    source: {
      provenance:
        'Latin Wikisource, "De legibus" (Liber I/II/III) - Perseus does not have this text (confirmed against its own tracking data: status "not migrated"). Wikisource\'s own page cites no specific source edition ("editio: incognita"), disclosed on the About page; Book 3 genuinely breaks off mid-dialogue in the surviving transmission. No public-domain English translation was found.',
      license: "Cicero's Latin text is itself public domain (1st century BC); transcription CC BY-SA 4.0 (Wikisource).",
    },
  },
  {
    id: 'de-officiis-la',
    authorId: 'cicero',
    title: 'De Officiis',
    commonTitle: 'On Duties',
    group: 'De Officiis',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Miller',
    source: {
      editor: 'Walter Miller',
      edition: 'De Officiis, ed. Walter Miller, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi055.perseus-lat1).',
      license: "Miller's 1913 Latin text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-officiis-en',
    authorId: 'cicero',
    title: 'On Duties',
    group: 'De Officiis',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Miller',
    source: {
      translator: 'Walter Miller',
      edition: 'De Officiis, trans. Walter Miller, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi055.perseus-eng1).',
      license: "Miller's 1913 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-finibus-la',
    authorId: 'cicero',
    title: 'De Finibus Bonorum et Malorum',
    commonTitle: 'On the Ends of Good and Evil',
    group: 'De Finibus',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Schiche',
    source: {
      editor: 'Theodor Schiche',
      edition: 'M. Tulli Ciceronis De Finibus Bonorum et Malorum Libri Quinque, ed. Theodor Schiche (Leipzig: Teubner, 1915)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi048.perseus-lat2).',
      license: "Schiche's 1915 Teubner text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-finibus-en',
    authorId: 'cicero',
    title: 'On the Ends of Good and Evil',
    group: 'De Finibus',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: "Yonge's translation, Bohn's Classical Library, 1891 printing (first published 1853)",
      provenance:
        'English Wikisource, "The Academic Questions, Treatise De Finibus, and Tusculan Disputations / De Finibus, a Treatise on the Chief Good and Evil" (page-scan transcription, 5 books).',
      license: "Yonge's translation is public domain; transcription CC BY-SA 4.0 (Wikisource).",
    },
  },
  {
    id: 'tusculan-disputations-la',
    authorId: 'cicero',
    title: 'Tusculanae Disputationes',
    commonTitle: 'Tusculan Disputations',
    group: 'Tusculan Disputations',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Pohlenz',
    source: {
      editor: 'Max Pohlenz',
      edition: 'M. Tulli Ciceronis Tusculanae Disputationes, ed. Max Pohlenz (Leipzig: Teubner, 1918)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi049.perseus-lat2). This edition carries no chapter milestones and no printed headings (confirmed by direct inspection, unlike sibling Cicero editions) - Division.ref/sourceHeading are null throughout, disclosed on the About page.',
      license: "Pohlenz's 1918 Teubner text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'tusculan-disputations-en',
    authorId: 'cicero',
    title: 'Tusculan Disputations',
    group: 'Tusculan Disputations',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge (chiefly)',
      edition: "Harper's New Classical Library, 1877",
      provenance:
        'Project Gutenberg ebook #14988, "Cicero\'s Tusculan Disputations; Also, Treatises On the Nature of the Gods, and On the Commonwealth" (Harper & Brothers, 1877) - only the Tusculan Disputations portion of this shared three-work volume is used; the other two works are not bundled from this source.',
      license: 'This 1877 translation is public domain.',
    },
  },
  {
    id: 'de-natura-deorum-la',
    authorId: 'cicero',
    title: 'De Natura Deorum',
    commonTitle: 'On the Nature of the Gods',
    group: 'De Natura Deorum',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Plasberg',
    source: {
      editor: 'Otto Plasberg',
      edition: 'M. Tulli Ciceronis Scripta Quae Manserunt Omnia, Fasc. 45: De Natura Deorum, ed. Otto Plasberg (Leipzig: Teubner, 1917)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi050.perseus-lat2).',
      license: "Plasberg's 1917 Teubner text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-natura-deorum-en',
    authorId: 'cicero',
    title: 'On the Nature of the Gods',
    group: 'De Natura Deorum',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Yonge',
    source: {
      translator: 'Charles Duke Yonge',
      edition: "Bohn's Classical Library, 1888",
      provenance:
        'English Wikisource, "Cicero\'s Tusculan Disputations/On the Nature of the Gods" (page-scan transcription, 3 books).',
      license: "Yonge's 1888 translation is public domain; transcription CC BY-SA 4.0 (Wikisource).",
    },
  },
  {
    id: 'de-divinatione-la',
    authorId: 'cicero',
    title: 'De Divinatione',
    commonTitle: 'On Divination',
    group: 'De Divinatione',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Mueller',
    source: {
      editor: 'C. F. W. Mueller',
      edition: 'M. Tullii Ciceronis De divinatione libri duo libri de fato quae manserunt, ed. C. F. W. Mueller (Leipzig: Teubner, 1915)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi053.perseus-lat1).',
      license: "Mueller's 1915 Teubner text is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-divinatione-en',
    authorId: 'cicero',
    title: 'On Divination',
    group: 'De Divinatione',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Falconer',
    source: {
      translator: 'William Armistead Falconer',
      edition: 'Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library, 1923 printing',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi053.perseus-eng1).',
      license: "Falconer's 1923 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-amicitia-la',
    authorId: 'cicero',
    title: 'Laelius De Amicitia',
    commonTitle: 'On Friendship',
    group: 'De Amicitia',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Falconer',
    source: {
      editor: 'W. A. Falconer',
      edition: 'Cicero: De Senectute, De Amicitia, De Divinatione, ed. W. A. Falconer, Loeb Classical Library, 1923',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi052.perseus-lat2).',
      license: "Falconer's 1923 Loeb edition is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-amicitia-en',
    authorId: 'cicero',
    title: 'On Friendship',
    group: 'De Amicitia',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Falconer',
    source: {
      translator: 'William Armistead Falconer',
      edition: 'Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library, 1923 printing',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi052.perseus-eng2).',
      license: "Falconer's 1923 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-senectute-la',
    authorId: 'cicero',
    title: 'Cato Maior De Senectute',
    commonTitle: 'On Old Age',
    group: 'De Senectute',
    language: 'la',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'Latin · Falconer',
    source: {
      editor: 'W. A. Falconer',
      edition: 'Cicero: De Senectute, De Amicitia, De Divinatione, ed. W. A. Falconer (London: William Heinemann Ltd; New York: G. P. Putnam\'s Sons, 1923 printing)',
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi051.perseus-lat2).',
      license: "Falconer's 1923 Loeb edition is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'de-senectute-en',
    authorId: 'cicero',
    title: 'On Old Age',
    group: 'De Senectute',
    language: 'en',
    citationScheme: 'cicero-section',
    profile: 'generic',
    meta: 'English · trans. Falconer',
    source: {
      translator: 'William Armistead Falconer',
      edition: "London: William Heinemann Ltd; New York: G. P. Putnam's Sons, 1923 printing",
      provenance: 'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi051.perseus-eng1).',
      license: "Falconer's 1923 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-atticum-selection-la',
    authorId: 'cicero',
    title: 'Epistulae ad Atticum (Selection)',
    commonTitle: 'Letters to Atticus (Selection)',
    group: 'Ad Atticum (Selection)',
    language: 'la',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'Latin · Purser',
    source: {
      editor: 'Louis Claude Purser',
      edition: 'Cicero. Epistulae, Vol. II, Pars Prior and Pars Posterior, ed. Louis Claude Purser (Oxford: Clarendon Press, 1903)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi057.perseus-lat1). A curated SELECTION personally chosen from the full correspondence, not the complete collection - see the About page for exactly which letters/books are included.',
      license: "Purser's critical Latin text is a scholarly edition of a public-domain text; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-atticum-selection-en',
    authorId: 'cicero',
    title: 'Letters to Atticus (Selection)',
    group: 'Ad Atticum (Selection)',
    language: 'en',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'English · trans. Shuckburgh',
    source: {
      translator: 'Evelyn S. Shuckburgh',
      edition: 'The Letters of Cicero: The Whole Extant Correspondence in Chronological Order (London: George Bell & Sons, 1899-1900)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi057.perseus-eng1). A curated SELECTION, not the complete collection; re-sorted from Shuckburgh\'s own chronological print order into traditional book.letter order for navigation - see the About page.',
      license: "Shuckburgh's 1899-1900 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-familiares-selection-la',
    authorId: 'cicero',
    title: 'Epistulae ad Familiares (Selection)',
    commonTitle: 'Letters to his Friends (Selection)',
    group: 'Ad Familiares (Selection)',
    language: 'la',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'Latin · Purser',
    source: {
      editor: 'Louis Claude Purser',
      edition: 'Cicero. Epistulae, Vol. 1, ed. Louis Claude Purser (Oxford: Clarendon Press, 1901)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi056.perseus-lat1). A curated SELECTION, not the complete collection - see the About page.',
      license: "Purser's critical Latin text is a scholarly edition of a public-domain text; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-familiares-selection-en',
    authorId: 'cicero',
    title: 'Letters to his Friends (Selection)',
    group: 'Ad Familiares (Selection)',
    language: 'en',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'English · trans. Shuckburgh',
    source: {
      translator: 'Evelyn S. Shuckburgh',
      edition: 'The Letters of Cicero: The Whole Extant Correspondence in Chronological Order (London: George Bell & Sons, 1899-1900)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi056.perseus-eng1). A curated SELECTION, not the complete collection - see the About page.',
      license: "Shuckburgh's 1899-1900 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-quintum-fratrem-selection-la',
    authorId: 'cicero',
    title: 'Epistulae ad Quintum Fratrem (Selection)',
    commonTitle: 'Letters to his Brother Quintus (Selection)',
    group: 'Ad Quintum Fratrem (Selection)',
    language: 'la',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'Latin · Purser',
    source: {
      editor: 'Louis Claude Purser',
      edition: 'Cicero. Epistulae, Vol. III, ed. Louis Claude Purser (Oxford: Clarendon Press, 1901)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi058.perseus-lat1). A curated SELECTION (one letter, 1.1) - see the About page.',
      license: "Purser's critical Latin text is a scholarly edition of a public-domain text; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-quintum-fratrem-selection-en',
    authorId: 'cicero',
    title: 'Letters to his Brother Quintus (Selection)',
    group: 'Ad Quintum Fratrem (Selection)',
    language: 'en',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'English · trans. Shuckburgh',
    source: {
      translator: 'Evelyn S. Shuckburgh',
      edition: 'The Letters of Cicero: The Whole Extant Correspondence in Chronological Order (London: George Bell & Sons, 1899-1900)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi058.perseus-eng1). A curated SELECTION (one letter, 1.1); a genuine source duplication bug (the whole collection doubled inside two erroneous wrapper divs) was found and de-duplicated - see the About page.',
      license: "Shuckburgh's 1899-1900 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-brutum-selection-la',
    authorId: 'cicero',
    title: 'Epistulae ad M. Brutum (Selection)',
    commonTitle: 'Letters to Brutus (Selection)',
    group: 'Ad Brutum (Selection)',
    language: 'la',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'Latin · Purser',
    source: {
      editor: 'Louis Claude Purser',
      edition: 'Cicero. Epistulae, Vol. III, ed. Louis Claude Purser (Oxford: Clarendon Press, 1901)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi059.perseus-lat1). A curated SELECTION (letters 1.16-17) - see the About page.',
      license: "Purser's critical Latin text is a scholarly edition of a public-domain text; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
    },
  },
  {
    id: 'ad-brutum-selection-en',
    authorId: 'cicero',
    title: 'Letters to Brutus (Selection)',
    group: 'Ad Brutum (Selection)',
    language: 'en',
    citationScheme: 'cicero-letter',
    profile: 'generic',
    meta: 'English · trans. Shuckburgh',
    source: {
      translator: 'Evelyn S. Shuckburgh',
      edition: 'The Letters of Cicero: The Whole Extant Correspondence in Chronological Order (London: George Bell & Sons, 1899-1900)',
      provenance:
        'TEI from PerseusDL/canonical-latinLit (CTS urn:cts:latinLit:phi0474.phi059.perseus-eng1). A curated SELECTION (letters 1.16-17) - see the About page.',
      license: "Shuckburgh's 1899-1900 translation is public domain; digital text CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).",
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
