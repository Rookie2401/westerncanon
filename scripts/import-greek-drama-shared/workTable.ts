/**
 * The play table for the Greek drama corpus: tragedy (Aeschylus 7, Sophocles
 * 7 + Ichneutae, Euripides 19) plus comedy (Aristophanes, all 11 surviving
 * plays, Greek only - see ARISTOPHANES_WORKS below), Perseus
 * canonical-greekLit TEI.
 *
 * Every edition/translation citation string below is copied VERBATIM from
 * that work's own `__cts__.xml` (`<ti:edition>`/`<ti:translation>`
 * `<ti:description>`), fetched from
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/<group>/<work>/__cts__.xml
 * and saved alongside the raw TEI under each driver's `raw/` directory - not
 * paraphrased, not reconstructed from memory. Where the brief's assumed
 * provenance turned out to differ from what the file actually says, the
 * file's own text wins (see individual notes below).
 *
 * workId scheme: `<playwright>-<slug>-grc` / `-en` (Ichneutae and all of
 * Aristophanes: grc only).
 */

export type Playwright = 'aeschylus' | 'sophocles' | 'euripides' | 'aristophanes';

export interface Witness {
  /** e.g. 'perseus-grc2' */
  witness: string;
  /** raw filename under the driver's raw/ directory */
  file: string;
  /** verbatim <ti:description> from __cts__.xml for this edition/translation */
  citation: string;
  /** editor (grc) or translator (en) surname, given name - for about.json prose */
  person: string;
}

export interface PlayEntry {
  playwright: Playwright;
  playwrightLabel: string;
  tlgGroup: string;
  tlgWork: string;
  /** kebab-case English slug used in workId and data/ dir names */
  slug: string;
  /** canonical English title used in prose/headings */
  title: string;
  /** the source's own Greek title (<ti:label xml:lang="grc">) */
  greekLabel: string | null;
  grc: Witness;
  /** null only for Sophocles' Ichneutae (no confirmed-PD English translation) */
  en: Witness | null;
  /** special provenance/shipping notes for this play, surfaced in about.json */
  notes?: string[];
}

const AESCHYLUS = 'aeschylus' as const;
const SOPHOCLES = 'sophocles' as const;
const EURIPIDES = 'euripides' as const;

function grcFile(group: string, work: string, witness: string): string {
  return `${group}.${work}.${witness}.xml`;
}

// ---------------------------------------------------------------- Aeschylus
// grc2 = Smyth's OCT-successor edition (Loeb vol. 1: tlg001-004; vol. 2:
// tlg005-007). eng2 = Smyth's own translation of the same, "Modernized by
// Perseus" - EXCEPT Agamemnon, whose Perseus translation witness is eng3
// (still Smyth; eng4 is Robert Browning's 1877 verse translation, excluded
// per the brief to keep the corpus on one consistent translator).
const AESCH_VOL1_EDITION =
  "Aeschylus, Volume 1. Smyth, Herbert Weir, editor. London; New York: \n            William Heinemann; G.P. Putnam's Sons, 1922.".replace(/\s+/g, ' ').trim();
const AESCH_VOL2_EDITION =
  "Aeschylus, Volume 2. Smyth, Herbert Weir, editor. London; New York: \n            William Heinemann; G.P. Putnam's Sons, 1926.".replace(/\s+/g, ' ').trim();
const AESCH_VOL1_TRANSLATION =
  "Aeschylus, Volume 1. Smyth, Herbert Weir, translator. London; New York: \n            William Heinemann; G.P. Putnam's Sons, 1922. (Modernized by Perseus.)".replace(/\s+/g, ' ').trim();
const AESCH_VOL2_TRANSLATION =
  "Aeschylus, Volume 2. Smyth, Herbert Weir, translator. London; New York: \n            William Heinemann; G.P. Putnam's Sons, 1926. (Modernized by Perseus.)".replace(/\s+/g, ' ').trim();

const AESCHYLUS_WORKS: PlayEntry[] = [
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg001',
    slug: 'suppliants',
    title: 'Suppliants',
    greekLabel: 'Ἱκέτιδες',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg001', 'perseus-grc2'), citation: AESCH_VOL1_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg001', 'perseus-eng2'), citation: AESCH_VOL1_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg002',
    slug: 'persians',
    title: 'Persians',
    greekLabel: 'Πέρσαι',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg002', 'perseus-grc2'), citation: AESCH_VOL1_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg002', 'perseus-eng2'), citation: AESCH_VOL1_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg003',
    slug: 'prometheus-bound',
    title: 'Prometheus Bound',
    greekLabel: 'Προμηθεὺς δεσμώτης',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg003', 'perseus-grc2'), citation: AESCH_VOL1_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg003', 'perseus-eng2'), citation: AESCH_VOL1_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg004',
    slug: 'seven-against-thebes',
    title: 'Seven Against Thebes',
    greekLabel: 'Ἑπτὰ ἐπὶ Θήβας',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg004', 'perseus-grc2'), citation: AESCH_VOL1_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg004', 'perseus-eng2'), citation: AESCH_VOL1_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg005',
    slug: 'agamemnon',
    title: 'Agamemnon',
    greekLabel: 'Ἀγαμέμνων',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg005', 'perseus-grc2'), citation: AESCH_VOL2_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng3', file: grcFile('tlg0085', 'tlg005', 'perseus-eng3'), citation: AESCH_VOL2_TRANSLATION, person: 'Herbert Weir Smyth' },
    notes: [
      'Perseus carries a SECOND English translation of Agamemnon (perseus-eng4: Robert Browning\'s 1877 verse translation, ed. Edward Berdoe, 1889) not used here, to keep the whole corpus on one consistent translator (Smyth) rather than mixing prose-Loeb and Victorian-verse registers across plays.',
    ],
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg006',
    slug: 'libation-bearers',
    title: 'Libation Bearers',
    greekLabel: 'Χοηφóρoι',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg006', 'perseus-grc2'), citation: AESCH_VOL2_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg006', 'perseus-eng2'), citation: AESCH_VOL2_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
  {
    playwright: AESCHYLUS,
    playwrightLabel: 'Aeschylus',
    tlgGroup: 'tlg0085',
    tlgWork: 'tlg007',
    slug: 'eumenides',
    title: 'Eumenides',
    greekLabel: 'Εὐμενίδες',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0085', 'tlg007', 'perseus-grc2'), citation: AESCH_VOL2_EDITION, person: 'Herbert Weir Smyth' },
    en: { witness: 'perseus-eng2', file: grcFile('tlg0085', 'tlg007', 'perseus-eng2'), citation: AESCH_VOL2_TRANSLATION, person: 'Herbert Weir Smyth' },
  },
];

// ---------------------------------------------------------------- Sophocles
// grc2 = Francis Storr's Loeb edition (vol. 1: Antigone/OT/OC; vol. 2:
// Trachiniae/Ajax/Electra/Philoctetes). eng2 = Sir Richard Jebb's Cambridge
// translation, "Modernized by Perseus" - EXCEPT Trachiniae, whose Perseus
// translation witness is eng3 (still Jebb, 1892; eng4 is Robert Torrance's
// 1966 verse translation, commented out of Perseus's own __cts__.xml as
// NOT public domain - excluded here for the same reason). Ichneutae
// (tlg008, the Oxyrhynchus papyrus satyr-play fragment) ships Greek only:
// its only Perseus translation (eng2, Anne Mahoney) carries no confirmed
// public-domain status.
const SOPH_VOL1_EDITION =
  'Sophocles, Volume 1. Storr, Francis, editor. London; New York: William Heinemann Ltd.; The Macmillan Company, 1912.';
const SOPH_VOL2_EDITION =
  'Sophocles, Volume 2. Storr, Francis, editor. London; New York: William Heinemann Ltd.; The Macmillan Company, 1913.';

const SOPHOCLES_WORKS: PlayEntry[] = [
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg001',
    slug: 'trachiniae',
    title: 'Trachiniae',
    greekLabel: 'Τραχίνιαι',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg001', 'perseus-grc2'), citation: SOPH_VOL2_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng3',
      file: grcFile('tlg0011', 'tlg001', 'perseus-eng3'),
      citation:
        'Sophocles the plays and fragments, Part 5: The Trachiniae. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1892. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
    notes: [
      "Perseus carries a second English translation (perseus-eng4: Robert Torrance's 1966 verse translation, Houghton Mifflin) that its own __cts__.xml keeps commented out as not public domain; not used here for the same reason.",
    ],
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg002',
    slug: 'antigone',
    title: 'Antigone',
    greekLabel: 'Ἀντιγόνη',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg002', 'perseus-grc2'), citation: SOPH_VOL1_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg002', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 3: The Antigone. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1891. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg003',
    slug: 'ajax',
    title: 'Ajax',
    greekLabel: 'Αἴας',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg003', 'perseus-grc2'), citation: SOPH_VOL2_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg003', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 7: The Ajax. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1891. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg004',
    slug: 'oedipus-tyrannus',
    title: 'Oedipus Tyrannus',
    greekLabel: 'Οἰδίπους Τύραννος',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg004', 'perseus-grc2'), citation: SOPH_VOL1_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg004', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 1: The Oedipus Tyrannus. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1887. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg005',
    slug: 'electra',
    title: 'Electra',
    greekLabel: 'Ἠλέκτρα',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg005', 'perseus-grc2'), citation: SOPH_VOL2_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg005', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 6: The Electra. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1894. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg006',
    slug: 'philoctetes',
    title: 'Philoctetes',
    greekLabel: 'Φιλοκτήτης',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg006', 'perseus-grc2'), citation: SOPH_VOL2_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg006', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 4: The Philoctetes. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1898. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg007',
    slug: 'oedipus-at-colonus',
    title: 'Oedipus at Colonus',
    greekLabel: 'Οἰδίπους ἐπὶ Κολωνῷ',
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0011', 'tlg007', 'perseus-grc2'), citation: SOPH_VOL1_EDITION, person: 'Francis Storr' },
    en: {
      witness: 'perseus-eng2',
      file: grcFile('tlg0011', 'tlg007', 'perseus-eng2'),
      citation:
        'Sophocles the plays and fragments, Part 2: The Oedipus at Colonus. Jebb, Richard Claverhouse, Sir, translator. Cambridge: Cambridge University Press, 1889. (Modernized by Perseus.)',
      person: 'Sir Richard C. Jebb',
    },
  },
  {
    playwright: SOPHOCLES,
    playwrightLabel: 'Sophocles',
    tlgGroup: 'tlg0011',
    tlgWork: 'tlg008',
    slug: 'ichneutae',
    title: 'Ichneutae',
    greekLabel: null,
    grc: {
      witness: 'perseus-grc2',
      file: grcFile('tlg0011', 'tlg008', 'perseus-grc2'),
      citation:
        'Sophocles. Oxyrhynchus Papyri, Part 9. Grenfell, Bernard P. (Bernard Pyne); Hunt, Arthur S. (Arthur Surridge), editors.\n      London: Egypt Exploration Fund, 1912.'
        .replace(/\s+/g, ' ')
        .trim(),
      person: 'Bernard P. Grenfell and Arthur S. Hunt',
    },
    en: null,
    notes: [
      'Ichneutae ("Tracking Satyrs") survives only as a fragmentary Oxyrhynchus papyrus (P.Oxy. 1174), edited by Grenfell and Hunt. It ships GREEK ONLY in this corpus: Perseus\'s only English translation (perseus-eng2, Anne Mahoney) is a modern rendering with no confirmed public-domain status, so it is not bundled here.',
    ],
  },
];

// ---------------------------------------------------------------- Euripides
// grc2 = Gilbert Murray's Oxford Classical Text (Euripidis Fabulae, 3 vols.,
// 1902/1913/1913). eng2 = Edward P. Coleridge's prose translation (The Plays
// of Euripides, Bell, vol. I 1906 / vol. II 1891), "Modernized by Perseus" -
// EXCEPT Bacchae (tlg017), whose Perseus translation is Theodore Alois
// Buckley's 1850 prose (Bohn), and Rhesus (tlg019), whose Perseus
// translation witness is eng3 (Coleridge, kept for corpus consistency; eng4
// is Gilbert Murray's own 1913 verse translation, excluded per the brief).
const EUR_VOL1_EDITION = 'Euripides. Euripidis Fabulae, Vol. I. Murray, Gilbert, editor. Oxford: Clarendon Press, 1902.';
const EUR_VOL2_EDITION =
  'Euripides. Euripidis Fabulae, Vol. II. Murray, Gilbert, editor. Oxford: Clarendon Press, 1913. (Reprinted 1921-1962)';
const EUR_VOL3_EDITION =
  'Euripides. Euripidis Fabulae, Vol. III. Murray, Gilbert, editor. Oxford: Clarendon Press, 1913. (Reprinted 1920-1978)';
const EUR_TRANS_VOL1_1906 = 'Euripides. The Plays of Euripides, Vol. I. Coleridge, Edward P., translator. London: George Bell and Sons, 1906.';
const EUR_TRANS_VOL2_1891 = 'Euripides. The Plays of Euripides, Vol. II. Coleridge, Edward P., translator. London: George Bell and Sons, 1891.';
const COLERIDGE = 'Edward P. Coleridge';

function eurEntry(
  tlgWork: string,
  slug: string,
  title: string,
  greekLabel: string,
  edition: string,
  translation: string | null,
  translator: string | null,
  enWitness: string,
  notes?: string[],
): PlayEntry {
  return {
    playwright: EURIPIDES,
    playwrightLabel: 'Euripides',
    tlgGroup: 'tlg0006',
    tlgWork,
    slug,
    title,
    greekLabel,
    grc: { witness: 'perseus-grc2', file: grcFile('tlg0006', tlgWork, 'perseus-grc2'), citation: edition, person: 'Gilbert Murray' },
    en:
      translation === null
        ? null
        : { witness: enWitness, file: grcFile('tlg0006', tlgWork, enWitness), citation: translation, person: translator ?? COLERIDGE },
    notes,
  };
}

const EURIPIDES_WORKS: PlayEntry[] = [
  eurEntry('tlg001', 'cyclops', 'Cyclops', 'Κύκλωψ', EUR_VOL1_EDITION, EUR_TRANS_VOL2_1891, COLERIDGE, 'perseus-eng2'),
  eurEntry('tlg002', 'alcestis', 'Alcestis', 'Ἄλκηστις', EUR_VOL1_EDITION, EUR_TRANS_VOL1_1906, COLERIDGE, 'perseus-eng2'),
  eurEntry('tlg003', 'medea', 'Medea', 'Μήδεια', EUR_VOL1_EDITION, EUR_TRANS_VOL1_1906, COLERIDGE, 'perseus-eng2'),
  eurEntry('tlg004', 'heracleidae', 'Heracleidae', 'Ἡρακλεῖδαι', EUR_VOL1_EDITION, EUR_TRANS_VOL1_1906, COLERIDGE, 'perseus-eng2'),
  eurEntry('tlg005', 'hippolytus', 'Hippolytus', 'Ἱππόλυτος', EUR_VOL1_EDITION, EUR_TRANS_VOL1_1906, COLERIDGE, 'perseus-eng2'),
  eurEntry('tlg006', 'andromache', 'Andromache', 'Ἀνδρομάχη', EUR_VOL1_EDITION, EUR_TRANS_VOL2_1891, COLERIDGE, 'perseus-eng2'),
  eurEntry(
    'tlg007',
    'hecuba',
    'Hecuba',
    'Ἑκάβη',
    'Euripides. Euripidis Fabulae, Vol. I. Murray, Gilbert, editor. Oxford: Clarendon Press, 1902. (Reprinted 1906-1974)',
    `${EUR_TRANS_VOL2_1891} (Modernized by Perseus.)`,
    COLERIDGE,
    'perseus-eng2',
  ),
  eurEntry(
    'tlg008',
    'suppliants',
    'The Suppliants',
    'Ἱκέτιδες',
    EUR_VOL2_EDITION,
    EUR_TRANS_VOL1_1906,
    COLERIDGE,
    'perseus-eng2',
    ["Perseus's own translation label for this witness is \"The Suppliants\"; its edition title is also given as \"The Suppliant Maidens\" and, in Latin, \"Supplices\"."],
  ),
  eurEntry(
    'tlg009',
    'heracles',
    'Heracles',
    'Ἡρακλῆς',
    EUR_VOL2_EDITION,
    `${EUR_TRANS_VOL2_1891} (Modernized by Perseus.)`,
    COLERIDGE,
    'perseus-eng2',
    ['Perseus\'s own translation label for this witness is "Heracles Mad"; the Latin conventional title is "Hercules".'],
  ),
  eurEntry('tlg010', 'ion', 'Ion', 'Ἴων', EUR_VOL2_EDITION, EUR_TRANS_VOL1_1906, COLERIDGE, 'perseus-eng2'),
  eurEntry(
    'tlg011',
    'trojan-women',
    'The Trojan Women',
    'Τρῳάδες',
    EUR_VOL2_EDITION,
    `${EUR_TRANS_VOL1_1906} (Modernized by Perseus.)`,
    COLERIDGE,
    'perseus-eng2',
  ),
  eurEntry('tlg012', 'electra', 'Electra', 'Ἠλέκτρα', EUR_VOL2_EDITION, EUR_TRANS_VOL2_1891, COLERIDGE, 'perseus-eng2'),
  eurEntry(
    'tlg013',
    'iphigenia-in-tauris',
    'Iphigenia in Tauris',
    'Ἰφιγένεια ἐν Ταύροις',
    EUR_VOL2_EDITION,
    EUR_TRANS_VOL2_1891,
    COLERIDGE,
    'perseus-eng2',
    ['Perseus\'s own translation label for this witness is "Iphigenia Among the Tauri"; the Latin conventional title is "Iphigenia Taurica".'],
  ),
  eurEntry(
    'tlg014',
    'helen',
    'Helen',
    'Ἑλένη',
    EUR_VOL3_EDITION,
    `${EUR_TRANS_VOL1_1906} (Modernized by Perseus.)`,
    COLERIDGE,
    'perseus-eng2',
  ),
  eurEntry(
    'tlg015',
    'phoenician-women',
    'The Phoenician Women',
    'Φοίνισσαι',
    EUR_VOL3_EDITION,
    EUR_TRANS_VOL2_1891,
    COLERIDGE,
    'perseus-eng2',
    ['Perseus\'s own translation label for this witness is "The Phoenician Maidens"; the Latin conventional title is "Phoenissae".'],
  ),
  eurEntry('tlg016', 'orestes', 'Orestes', 'Ὀρέστης', EUR_VOL3_EDITION, EUR_TRANS_VOL2_1891, COLERIDGE, 'perseus-eng2'),
  eurEntry(
    'tlg017',
    'bacchae',
    'Bacchae',
    'Βάκχαι',
    EUR_VOL3_EDITION,
    'Euripides. The Tragedies of Euripides. Vol. I. Buckley, Theodore Alois, translator. London: Henry G. Bohn, 1850. (Modernized by Perseus.)',
    'Theodore Alois Buckley',
    'perseus-eng2',
    ['Unlike every other Euripides play in this corpus, the bundled English translation is NOT Coleridge: Perseus\'s eng2 witness for Bacchae is Theodore Alois Buckley\'s 1850 prose translation (Bohn\'s Classical Library).'],
  ),
  eurEntry(
    'tlg018',
    'iphigenia-in-aulis',
    'Iphigenia in Aulis',
    'Ἰφιγένεια ἐν Αὐλίδι',
    EUR_VOL3_EDITION,
    EUR_TRANS_VOL2_1891,
    COLERIDGE,
    'perseus-eng2',
  ),
  eurEntry(
    'tlg019',
    'rhesus',
    'Rhesus',
    'Ῥῆσος',
    EUR_VOL3_EDITION,
    `${EUR_TRANS_VOL1_1906} (Modernized by Perseus.)`,
    COLERIDGE,
    'perseus-eng3',
    [
      "Perseus carries a second English translation (perseus-eng4: Gilbert Murray's own 1913 verse translation, George Allen and Company) not used here, to keep the whole corpus on one consistent prose translator (Coleridge) rather than mixing prose and Victorian/Edwardian verse registers across plays - the same judgment call made for Aeschylus' Agamemnon.",
    ],
  ),
];

// -------------------------------------------------------------- Aristophanes
// grc2 = Hall & Geldart's Oxford Classical Text (Aristophanis Comoediae,
// 2 vols., Clarendon Press: vol. 1, 1906, plays tlg001-006; vol. 2, 1907,
// plays tlg007-011) - verified per-play against each work's own __cts__.xml
// (not assumed from the brief). GREEK ONLY: per the task brief, the English
// side is being imported separately by another agent from a different
// source, so no `en` witness is wired here even where Perseus itself
// carries one (Clouds tlg003 and Birds tlg006 both have a perseus-eng2
// translation in canonical-greekLit; Frogs and the rest have none at all -
// none of that is used or fetched by this driver).
const ARISTOPHANES_VOL1_EDITION =
  'Aristophanes. Aristophanis Comoediae, Vol. 1. Hall, F. W. and Geldart, William M., editors. Oxford: Clarendon Press, 1906.';
const ARISTOPHANES_VOL2_EDITION =
  'Aristophanes. Aristophanis Comoediae, Vol. 2. Hall, F. W. and Geldart, William M., editors. Oxford: Clarendon Press, 1907.';

function aristophanesEntry(
  tlgWork: string,
  slug: string,
  title: string,
  greekLabel: string,
  edition: string,
  notes?: string[],
): PlayEntry {
  return {
    playwright: 'aristophanes',
    playwrightLabel: 'Aristophanes',
    tlgGroup: 'tlg0019',
    tlgWork,
    slug,
    title,
    greekLabel,
    grc: {
      witness: 'perseus-grc2',
      file: grcFile('tlg0019', tlgWork, 'perseus-grc2'),
      citation: edition,
      person: 'F. W. Hall and W. M. Geldart',
    },
    en: null,
    notes,
  };
}

export const ARISTOPHANES_WORKS: readonly PlayEntry[] = [
  aristophanesEntry('tlg001', 'acharnians', 'Acharnians', 'Ἀχαρνῆς', ARISTOPHANES_VOL1_EDITION),
  aristophanesEntry('tlg002', 'knights', 'Knights', 'Ἱππῆς', ARISTOPHANES_VOL1_EDITION),
  aristophanesEntry('tlg003', 'clouds', 'Clouds', 'Νεφέλαι', ARISTOPHANES_VOL1_EDITION, [
    'Perseus also carries an English translation of Clouds (perseus-eng2: William James Hickie, The Comedies of Aristophanes, Vol. I, Bohn, 1853) - not fetched or used by this (Greek-only) driver; the English side of this corpus is being imported separately, from a different source.',
  ]),
  aristophanesEntry('tlg004', 'wasps', 'Wasps', 'Σφῆκες', ARISTOPHANES_VOL1_EDITION),
  aristophanesEntry('tlg005', 'peace', 'Peace', 'Εἰρήνη', ARISTOPHANES_VOL1_EDITION),
  aristophanesEntry('tlg006', 'birds', 'Birds', 'Ὄρνιθες', ARISTOPHANES_VOL1_EDITION, [
    'Perseus also carries an English translation of Birds (perseus-eng2: anonymous, The Complete Greek Drama, Vol. 2, eds. O\'Neill and Oates, Random House, 1938 printing) - not fetched or used by this (Greek-only) driver; the English side of this corpus is being imported separately, from a different source.',
  ]),
  aristophanesEntry('tlg007', 'lysistrata', 'Lysistrata', 'Λυσιστράτη', ARISTOPHANES_VOL2_EDITION),
  aristophanesEntry('tlg008', 'thesmophoriazusae', 'Thesmophoriazusae', 'Θεσμοφοριάζουσαι', ARISTOPHANES_VOL2_EDITION),
  aristophanesEntry('tlg009', 'frogs', 'Frogs', 'Βάτραχοι', ARISTOPHANES_VOL2_EDITION),
  aristophanesEntry('tlg010', 'ecclesiazusae', 'Ecclesiazusae', 'Ἐκκλησιάζουσαι', ARISTOPHANES_VOL2_EDITION),
  aristophanesEntry('tlg011', 'plutus', 'Plutus', 'Πλοῦτος', ARISTOPHANES_VOL2_EDITION, [
    'Perseus\'s own CTS title for this play is "Wealth" (a literal rendering of Πλοῦτος); the traditional Latin-derived title "Plutus" is used here instead for the slug/title, matching this corpus\'s naming convention for the other plays.',
  ]),
];

export const DRAMA_WORKS: readonly PlayEntry[] = [
  ...AESCHYLUS_WORKS,
  ...SOPHOCLES_WORKS,
  ...EURIPIDES_WORKS,
  ...ARISTOPHANES_WORKS,
];

export function workId(entry: PlayEntry, lang: 'grc' | 'en'): string {
  return `${entry.playwright}-${entry.slug}-${lang}`;
}
