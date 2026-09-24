// Copy the generated, committed corpus JSON from data/ into public/ so Vite
// serves it at ${BASE_URL}<dir>/*.json and Workbox precaches it into dist/ for
// full offline use. The app fetches these at runtime (same-origin); it never
// hits the network for anything else.
//
// This is build glue only. It does not read or modify any import pipeline and
// never regenerates a corpus — data/**/*.json is treated as read-only input.
// Wired as `predev` + `prebuild` (and runnable directly via `npm run copy-corpus`).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dataRoot = join(root, 'data');
const publicRoot = join(root, 'public');

// The Summa: hard-required. A missing file here fails the build.
const SUMMA_DIR = 'summa';
const SUMMA_FILES = [
  'index.json',
  'prooemium.json',
  'gaps.json',
  'search-index.json',
  'part-I.json',
  'part-I-II.json',
  'part-II-II.json',
  'part-III.json',
  'part-suppl.json',
  'suppl-anomalies.json',
];

// The English Summa: soft, unlike its Latin counterpart above — a much
// larger, more recent addition, so a missing file here is a warning, not a
// build failure.
const SUMMA_EN_DIR = 'summa-en';
const SUMMA_EN_FILES = [
  'part-I.json',
  'part-I-II.json',
  'part-II-II.json',
  'part-III.json',
  'part-suppl.json',
  'anomalies.json',
];

// Generic works: soft. A parallel task may not have landed these yet, so a
// missing file is a WARNING, not a failure.
const GENERIC_DIRS = [
  'isagoge-grc',
  'isagoge-la',
  'categoriae-grc',
  'categoriae-la',
  'de-interpretatione-grc',
  'de-interpretatione-la',
  'euclid-elements',
  'euclid-elements-en',
  'archimedes-sphere-cylinder',
  'archimedes-measurement-circle',
  'archimedes-conoids-spheroids',
  'archimedes-spirals',
  'archimedes-plane-equilibrium',
  'archimedes-sand-reckoner',
  'archimedes-quadrature-parabola',
  'archimedes-floating-bodies',
  'archimedes-stomachion',
  'archimedes-method',
  'archimedes-liber-assumptorum',
  'archimedes-cattle-problem',
  'archimedes-fragments',
  'categoriae-en',
  'de-interpretatione-en',
  'isagoge-en',
  'augustine-confessions-la',
  'augustine-confessions-en',
  'augustine-city-of-god-la',
  'augustine-city-of-god-en',
  'augustine-christian-doctrine-la',
  'augustine-christian-doctrine-en',
  'iliad-grc',
  'iliad-en',
  'odyssey-grc',
  'odyssey-en',
  'theogony-grc',
  'theogony-en',
  'works-and-days-grc',
  'works-and-days-en',
  'shield-of-heracles-grc',
  'shield-of-heracles-en',
  'aeneid-la',
  'aeneid-en',
  'plato-euthyphro-grc',
  'plato-euthyphro-en',
  'plato-apology-grc',
  'plato-apology-en',
  'plato-crito-grc',
  'plato-crito-en',
  'plato-phaedo-grc',
  'plato-phaedo-en',
  'plato-symposium-grc',
  'plato-symposium-en',
  'plato-phaedrus-grc',
  'plato-phaedrus-en',
  'plato-protagoras-grc',
  'plato-protagoras-en',
  'plato-gorgias-grc',
  'plato-gorgias-en',
  'plato-meno-grc',
  'plato-meno-en',
  'plato-ion-grc',
  'plato-ion-en',
  'plato-timaeus-grc',
  'plato-timaeus-en',
  'plato-laws-grc',
  'plato-laws-en',
  'plato-republic-grc',
  'plato-republic-en',
  'plato-cratylus-grc',
  'plato-cratylus-en',
  'plato-theaetetus-grc',
  'plato-theaetetus-en',
  'plato-sophist-grc',
  'plato-sophist-en',
  'plato-statesman-grc',
  'plato-statesman-en',
  'plato-parmenides-grc',
  'plato-parmenides-en',
  'plato-philebus-grc',
  'plato-philebus-en',
  'plato-alcibiades-1-grc',
  'plato-alcibiades-1-en',
  'plato-alcibiades-2-grc',
  'plato-alcibiades-2-en',
  'plato-hipparchus-grc',
  'plato-hipparchus-en',
  'plato-lovers-grc',
  'plato-lovers-en',
  'plato-theages-grc',
  'plato-theages-en',
  'plato-charmides-grc',
  'plato-charmides-en',
  'plato-laches-grc',
  'plato-laches-en',
  'plato-lysis-grc',
  'plato-lysis-en',
  'plato-euthydemus-grc',
  'plato-euthydemus-en',
  'plato-greater-hippias-grc',
  'plato-greater-hippias-en',
  'plato-lesser-hippias-grc',
  'plato-lesser-hippias-en',
  'plato-menexenus-grc',
  'plato-menexenus-en',
  'plato-cleitophon-grc',
  'plato-cleitophon-en',
  'plato-critias-grc',
  'plato-critias-en',
  'plato-minos-grc',
  'plato-minos-en',
  'plato-epinomis-grc',
  'plato-epinomis-en',
  'plato-letters-grc',
  'plato-letters-en',
  'physics-grc',
  'metaphysics-grc',
  'metaphysics-en',
  'posterior-analytics-grc',
  'posterior-analytics-en',
  'nicomachean-ethics-grc',
  'nicomachean-ethics-en',
  'pro-archia-la',
  'pro-archia-en',
  'pro-roscio-amerino-la',
  'pro-roscio-amerino-en',
  'pro-caelio-la',
  'in-catilinam-la',
  'in-catilinam-en',
  'philippics-la',
  'philippics-en',
  'in-verrem-la',
  'in-verrem-en',
  'pro-sestio-la',
  'pro-milone-la',
  'pro-marcello-la',
  'pro-ligario-la',
  'de-oratore-la',
  'brutus-la',
  'brutus-en',
  'orator-la',
  'orator-en',
  'de-republica-la',
  'de-legibus-la',
  'de-officiis-la',
  'de-officiis-en',
  'de-finibus-la',
  'de-finibus-en',
  'tusculan-disputations-la',
  'tusculan-disputations-en',
  'de-natura-deorum-la',
  'de-natura-deorum-en',
  'de-divinatione-la',
  'de-divinatione-en',
  'de-amicitia-la',
  'de-amicitia-en',
  'de-senectute-la',
  'de-senectute-en',
  'ad-atticum-selection-la',
  'ad-atticum-selection-en',
  'ad-familiares-selection-la',
  'ad-familiares-selection-en',
  'ad-quintum-fratrem-selection-la',
  'ad-quintum-fratrem-selection-en',
  'ad-brutum-selection-la',
  'ad-brutum-selection-en',
  'de-bello-gallico-la',
  'de-bello-gallico-en',
  'de-bello-civili-la',
  'de-bello-civili-en',
  'jewish-war-grc',
  'jewish-war-en',
  'jewish-antiquities-grc',
  'jewish-antiquities-en',
  'meditations-grc',
  'meditations-en',
  'athenian-constitution-grc',
  'athenian-constitution-en',
  'de-anima-grc',
  'de-audibilibus-grc',
  'de-caelo-grc',
  'de-caelo-en',
  'de-coloribus-grc',
  'de-divinatione-per-somnum-grc',
  'de-divinatione-per-somnum-en',
  'de-generatione-animalium-grc',
  'de-generatione-animalium-en',
  'de-generatione-et-corruptione-grc',
  'de-generatione-et-corruptione-en',
  'de-incessu-animalium-grc',
  'de-incessu-animalium-en',
  'de-insomniis-grc',
  'de-insomniis-en',
  'de-iuventute-grc',
  'de-iuventute-en',
  'de-lineis-insecabilibus-grc',
  'de-longitudine-grc',
  'de-longitudine-en',
  'de-melisso-xenophane-gorgia-grc',
  'de-memoria-grc',
  'de-memoria-en',
  'de-mirabilibus-grc',
  'de-motu-animalium-grc',
  'de-motu-animalium-en',
  'de-partibus-animalium-grc',
  'de-partibus-animalium-en',
  'de-plantis-grc',
  'de-plantis-en',
  'de-respiratione-grc',
  'de-respiratione-en',
  'de-sensu-grc',
  'de-sensu-en',
  'de-somno-grc',
  'de-somno-en',
  'de-spiritu-grc',
  'de-ventis-grc',
  'economics-grc',
  'eudemian-ethics-grc',
  'eudemian-ethics-en',
  'historia-animalium-grc',
  'historia-animalium-en',
  'magna-moralia-grc',
  'mechanica-grc',
  'meteorologica-grc',
  'meteorologica-en',
  'physiognomonica-grc',
  'poetics-grc',
  'poetics-en',
  'politics-grc',
  'politics-en',
  'prior-analytics-grc',
  'prior-analytics-en',
  'problemata-grc',
  'rhetoric-grc',
  'rhetoric-en',
  'sophistical-refutations-grc',
  'sophistical-refutations-en',
  'topics-grc',
  'topics-en',
  'virtues-and-vices-grc',
  'virtues-and-vices-en',
  'aeschylus-agamemnon-grc',
  'aeschylus-agamemnon-en',
  'aeschylus-eumenides-grc',
  'aeschylus-eumenides-en',
  'aeschylus-libation-bearers-grc',
  'aeschylus-libation-bearers-en',
  'aeschylus-persians-grc',
  'aeschylus-persians-en',
  'aeschylus-prometheus-bound-grc',
  'aeschylus-prometheus-bound-en',
  'aeschylus-seven-against-thebes-grc',
  'aeschylus-seven-against-thebes-en',
  'aeschylus-suppliants-grc',
  'aeschylus-suppliants-en',
  'sophocles-ajax-grc',
  'sophocles-ajax-en',
  'sophocles-antigone-grc',
  'sophocles-antigone-en',
  'sophocles-electra-grc',
  'sophocles-electra-en',
  'sophocles-ichneutae-grc',
  'sophocles-oedipus-at-colonus-grc',
  'sophocles-oedipus-at-colonus-en',
  'sophocles-oedipus-tyrannus-grc',
  'sophocles-oedipus-tyrannus-en',
  'sophocles-philoctetes-grc',
  'sophocles-philoctetes-en',
  'sophocles-trachiniae-grc',
  'sophocles-trachiniae-en',
  'euripides-alcestis-grc',
  'euripides-alcestis-en',
  'euripides-andromache-grc',
  'euripides-andromache-en',
  'euripides-bacchae-grc',
  'euripides-bacchae-en',
  'euripides-cyclops-grc',
  'euripides-cyclops-en',
  'euripides-electra-grc',
  'euripides-electra-en',
  'euripides-hecuba-grc',
  'euripides-hecuba-en',
  'euripides-helen-grc',
  'euripides-helen-en',
  'euripides-heracleidae-grc',
  'euripides-heracleidae-en',
  'euripides-heracles-grc',
  'euripides-heracles-en',
  'euripides-hippolytus-grc',
  'euripides-hippolytus-en',
  'euripides-ion-grc',
  'euripides-ion-en',
  'euripides-iphigenia-in-aulis-grc',
  'euripides-iphigenia-in-aulis-en',
  'euripides-iphigenia-in-tauris-grc',
  'euripides-iphigenia-in-tauris-en',
  'euripides-medea-grc',
  'euripides-medea-en',
  'euripides-orestes-grc',
  'euripides-orestes-en',
  'euripides-phoenician-women-grc',
  'euripides-phoenician-women-en',
  'euripides-rhesus-grc',
  'euripides-rhesus-en',
  'euripides-suppliants-grc',
  'euripides-suppliants-en',
  'euripides-trojan-women-grc',
  'euripides-trojan-women-en',
  'aristophanes-acharnians-grc',
  'aristophanes-acharnians-en',
  'aristophanes-birds-grc',
  'aristophanes-birds-en',
  'aristophanes-clouds-grc',
  'aristophanes-clouds-en',
  'aristophanes-ecclesiazusae-grc',
  'aristophanes-ecclesiazusae-en',
  'aristophanes-frogs-grc',
  'aristophanes-frogs-en',
  'aristophanes-knights-grc',
  'aristophanes-knights-en',
  'aristophanes-lysistrata-grc',
  'aristophanes-lysistrata-en',
  'aristophanes-peace-grc',
  'aristophanes-peace-en',
  'aristophanes-plutus-grc',
  'aristophanes-plutus-en',
  'aristophanes-thesmophoriazusae-grc',
  'aristophanes-thesmophoriazusae-en',
  'aristophanes-wasps-grc',
  'aristophanes-wasps-en',
  'herodotus-histories-grc',
  'herodotus-histories-en',
  'thucydides-history-grc',
  'thucydides-history-en',
  'xenophon-agesilaus-grc',
  'xenophon-agesilaus-en',
  'xenophon-anabasis-grc',
  'xenophon-anabasis-en',
  'xenophon-apology-grc',
  'xenophon-apology-en',
  'xenophon-cavalry-commander-grc',
  'xenophon-cavalry-commander-en',
  'xenophon-constitution-of-the-lacedaemonians-grc',
  'xenophon-constitution-of-the-lacedaemonians-en',
  'xenophon-cyropaedia-grc',
  'xenophon-cyropaedia-en',
  'xenophon-hellenica-grc',
  'xenophon-hellenica-en',
  'xenophon-hiero-grc',
  'xenophon-hiero-en',
  'xenophon-memorabilia-grc',
  'xenophon-memorabilia-en',
  'xenophon-oeconomicus-grc',
  'xenophon-oeconomicus-en',
  'xenophon-on-horsemanship-grc',
  'xenophon-on-horsemanship-en',
  'xenophon-on-hunting-grc',
  'xenophon-on-hunting-en',
  'xenophon-symposium-grc',
  'xenophon-symposium-en',
  'xenophon-ways-and-means-grc',
  'xenophon-ways-and-means-en',
  'polybius-histories-grc',
  'polybius-histories-en',
  'plutarch-aemilius-paulus-grc',
  'plutarch-aemilius-paulus-en',
  'plutarch-agesilaus-grc',
  'plutarch-agesilaus-en',
  'plutarch-agis-and-cleomenes-grc',
  'plutarch-agis-and-cleomenes-en',
  'plutarch-alcibiades-grc',
  'plutarch-alcibiades-en',
  'plutarch-alexander-grc',
  'plutarch-alexander-en',
  'plutarch-antony-grc',
  'plutarch-antony-en',
  'plutarch-aratus-grc',
  'plutarch-aratus-en',
  'plutarch-aristides-grc',
  'plutarch-aristides-en',
  'plutarch-artaxerxes-grc',
  'plutarch-artaxerxes-en',
  'plutarch-brutus-grc',
  'plutarch-brutus-en',
  'plutarch-caesar-grc',
  'plutarch-caesar-en',
  'plutarch-caius-marcius-coriolanus-grc',
  'plutarch-caius-marcius-coriolanus-en',
  'plutarch-caius-marius-grc',
  'plutarch-caius-marius-en',
  'plutarch-camillus-grc',
  'plutarch-camillus-en',
  'plutarch-cato-the-younger-grc',
  'plutarch-cato-the-younger-en',
  'plutarch-cicero-grc',
  'plutarch-cicero-en',
  'plutarch-cimon-grc',
  'plutarch-cimon-en',
  'plutarch-comparison-of-agesilaus-and-pompey-grc',
  'plutarch-comparison-of-agesilaus-and-pompey-en',
  'plutarch-comparison-of-agis-and-cleomenes-and-the-gracchi-grc',
  'plutarch-comparison-of-agis-and-cleomenes-and-the-gracchi-en',
  'plutarch-comparison-of-alcibiades-and-coriolanus-grc',
  'plutarch-comparison-of-alcibiades-and-coriolanus-en',
  'plutarch-comparison-of-aristides-and-marcus-cato-grc',
  'plutarch-comparison-of-aristides-and-marcus-cato-en',
  'plutarch-comparison-of-demetrius-and-antony-grc',
  'plutarch-comparison-of-demetrius-and-antony-en',
  'plutarch-comparison-of-demosthenes-and-cicero-grc',
  'plutarch-comparison-of-demosthenes-and-cicero-en',
  'plutarch-comparison-of-dion-and-brutus-grc',
  'plutarch-comparison-of-dion-and-brutus-en',
  'plutarch-comparison-of-lucullus-and-cimon-grc',
  'plutarch-comparison-of-lucullus-and-cimon-en',
  'plutarch-comparison-of-lycurgus-and-numa-grc',
  'plutarch-comparison-of-lycurgus-and-numa-en',
  'plutarch-comparison-of-lysander-and-sulla-grc',
  'plutarch-comparison-of-lysander-and-sulla-en',
  'plutarch-comparison-of-nicias-and-crassus-grc',
  'plutarch-comparison-of-nicias-and-crassus-en',
  'plutarch-comparison-of-pelopidas-and-marcellus-grc',
  'plutarch-comparison-of-pelopidas-and-marcellus-en',
  'plutarch-comparison-of-pericles-and-fabius-maximus-grc',
  'plutarch-comparison-of-pericles-and-fabius-maximus-en',
  'plutarch-comparison-of-philopoemen-and-titus-grc',
  'plutarch-comparison-of-philopoemen-and-titus-en',
  'plutarch-comparison-of-sertorius-and-eumenes-grc',
  'plutarch-comparison-of-sertorius-and-eumenes-en',
  'plutarch-comparison-of-solon-and-publicola-grc',
  'plutarch-comparison-of-solon-and-publicola-en',
  'plutarch-comparison-of-theseus-and-romulus-grc',
  'plutarch-comparison-of-theseus-and-romulus-en',
  'plutarch-comparison-of-timoleon-and-aemilius-grc',
  'plutarch-comparison-of-timoleon-and-aemilius-en',
  'plutarch-crassus-grc',
  'plutarch-crassus-en',
  'plutarch-demetrius-grc',
  'plutarch-demetrius-en',
  'plutarch-demosthenes-grc',
  'plutarch-demosthenes-en',
  'plutarch-dion-grc',
  'plutarch-dion-en',
  'plutarch-eumenes-grc',
  'plutarch-eumenes-en',
  'plutarch-fabius-maximus-grc',
  'plutarch-fabius-maximus-en',
  'plutarch-galba-grc',
  'plutarch-galba-en',
  'plutarch-lucullus-grc',
  'plutarch-lucullus-en',
  'plutarch-lycurgus-grc',
  'plutarch-lycurgus-en',
  'plutarch-lysander-grc',
  'plutarch-lysander-en',
  'plutarch-marcellus-grc',
  'plutarch-marcellus-en',
  'plutarch-marcus-cato-grc',
  'plutarch-marcus-cato-en',
  'plutarch-nicias-grc',
  'plutarch-nicias-en',
  'plutarch-numa-grc',
  'plutarch-numa-en',
  'plutarch-otho-grc',
  'plutarch-otho-en',
  'plutarch-pelopidas-grc',
  'plutarch-pelopidas-en',
  'plutarch-pericles-grc',
  'plutarch-pericles-en',
  'plutarch-philopoemen-grc',
  'plutarch-philopoemen-en',
  'plutarch-phocion-grc',
  'plutarch-phocion-en',
  'plutarch-pompey-grc',
  'plutarch-pompey-en',
  'plutarch-publicola-grc',
  'plutarch-publicola-en',
  'plutarch-pyrrhus-grc',
  'plutarch-pyrrhus-en',
  'plutarch-romulus-grc',
  'plutarch-romulus-en',
  'plutarch-sertorius-grc',
  'plutarch-sertorius-en',
  'plutarch-solon-grc',
  'plutarch-solon-en',
  'plutarch-sulla-grc',
  'plutarch-sulla-en',
  'plutarch-themistocles-grc',
  'plutarch-themistocles-en',
  'plutarch-theseus-grc',
  'plutarch-theseus-en',
  'plutarch-tiberius-and-caius-gracchus-grc',
  'plutarch-tiberius-and-caius-gracchus-en',
  'plutarch-timoleon-grc',
  'plutarch-timoleon-en',
  'plutarch-titus-flamininus-grc',
  'plutarch-titus-flamininus-en',
  'ptolemy-almagest-grc',
  'ptolemy-tetrabiblos-grc',
  'ptolemy-tetrabiblos-en',
  'boethius-consolatio-la',
  'boethius-consolatio-en',
  'boethius-de-trinitate-la',
  'boethius-de-trinitate-en',
  'boethius-utrum-pater-la',
  'boethius-utrum-pater-en',
  'boethius-quomodo-substantiae-la',
  'boethius-quomodo-substantiae-en',
  'boethius-de-fide-catholica-la',
  'boethius-de-fide-catholica-en',
  'boethius-contra-eutychen-la',
  'boethius-contra-eutychen-en',
  'dante-commedia-en',
  'dante-vita-nuova-it',
  'dante-vita-nuova-en',
  'dante-convivio-en',
  'dante-monarchia-la',
  'dante-monarchia-en',
  'dante-de-vulgari-eloquentia-la',
  'shakespeare-alls-well-that-ends-well-en',
  'shakespeare-antony-and-cleopatra-en',
  'shakespeare-as-you-like-it-en',
  'shakespeare-the-comedy-of-errors-en',
  'shakespeare-coriolanus-en',
  'shakespeare-cymbeline-en',
  'shakespeare-hamlet-en',
  'shakespeare-henry-iv-part-1-en',
  'shakespeare-henry-iv-part-2-en',
  'shakespeare-henry-v-en',
  'shakespeare-henry-vi-part-1-en',
  'shakespeare-henry-vi-part-2-en',
  'shakespeare-henry-vi-part-3-en',
  'shakespeare-henry-viii-en',
  'shakespeare-julius-caesar-en',
  'shakespeare-king-john-en',
  'shakespeare-king-lear-en',
  'shakespeare-richard-ii-en',
  'shakespeare-richard-iii-en',
  'shakespeare-loves-labours-lost-en',
  'shakespeare-macbeth-en',
  'shakespeare-measure-for-measure-en',
  'shakespeare-the-merchant-of-venice-en',
  'shakespeare-the-merry-wives-of-windsor-en',
  'shakespeare-a-midsummer-nights-dream-en',
  'shakespeare-much-ado-about-nothing-en',
  'shakespeare-othello-en',
  'shakespeare-pericles-en',
  'shakespeare-romeo-and-juliet-en',
  'shakespeare-the-taming-of-the-shrew-en',
  'shakespeare-the-tempest-en',
  'shakespeare-timon-of-athens-en',
  'shakespeare-titus-andronicus-en',
  'shakespeare-troilus-and-cressida-en',
  'shakespeare-twelfth-night-en',
  'shakespeare-the-two-gentlemen-of-verona-en',
  'shakespeare-the-two-noble-kinsmen-en',
  'shakespeare-the-winters-tale-en',
  'shakespeare-venus-and-adonis-en',
  'shakespeare-the-rape-of-lucrece-en',
  'shakespeare-sonnets-en',
  'shakespeare-a-lovers-complaint-en',
  'shakespeare-the-passionate-pilgrim-en',
  'shakespeare-the-phoenix-and-the-turtle-en',
  'newton-principia-la',
  'newton-principia-en',
  'newton-opticks-en',
  'dante-de-vulgari-eloquentia-en',
];
const GENERIC_FILES = ['work.json', 'about.json'];

// --- Editions ----------------------------------------------------------
// EDITION=en | original | all (default all). Mirrors src/library/edition.ts:
// the English edition takes every language="en" work; the original-language
// edition takes every non-English work plus the English ORIGINALS (an
// English work with no translator). Decided from each data dir's about.json
// so this build glue needs no TypeScript import; edition.test.ts asserts the
// two rules agree.
const EDITION = process.env.EDITION ?? 'all';
if (!['en', 'original', 'all'].includes(EDITION)) {
  console.error(`[copy-corpus] EDITION must be en | original | all, got "${EDITION}"`);
  process.exit(1);
}
function dirInEdition(dir) {
  if (EDITION === 'all') return true;
  let about;
  try {
    about = JSON.parse(readFileSync(join(dataRoot, dir, 'about.json'), 'utf8'));
  } catch {
    return true; // not present yet: let copyOne report it
  }
  const isEnglish = about.language === 'en';
  if (EDITION === 'en') return isEnglish;
  return !isEnglish || !about.translator;
}
const summaInEdition = EDITION !== 'en';
const summaEnInEdition = EDITION !== 'original';
// Remove anything a previous run left in public/ that this edition does not
// ship, so Workbox never precaches a stale corpus.
for (const dir of [SUMMA_DIR, SUMMA_EN_DIR, ...GENERIC_DIRS]) {
  const keep = dir === SUMMA_DIR ? summaInEdition : dir === SUMMA_EN_DIR ? summaEnInEdition : dirInEdition(dir);
  if (!keep) rmSync(join(publicRoot, dir), { recursive: true, force: true });
}
let skippedByEdition = 0;

let hardFailures = 0;
let copied = 0;
let bytes = 0;

/** @param {string} dir @param {string} name @param {boolean} required */
function copyOne(dir, name, required) {
  const from = join(dataRoot, dir, name);
  const to = join(publicRoot, dir, name);
  try {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
    bytes += statSync(to).size;
    copied += 1;
  } catch (err) {
    if (required) {
      console.error(`[copy-corpus] FAILED to copy ${dir}/${name}: ${err.message}`);
      hardFailures += 1;
      process.exitCode = 1;
    } else {
      console.warn(
        `[copy-corpus] skipped ${dir}/${name} (not present yet): ${err.message}`,
      );
    }
  }
}

/**
 * Copy a work's optional `images/` subdirectory (real diagram/plate assets
 * referenced by a passage's `figure.image`) whole. Soft: most works have no
 * images directory yet, so a missing one is silent, not even a warning.
 */
function copyImagesDir(dir) {
  const from = join(dataRoot, dir, 'images');
  const to = join(publicRoot, dir, 'images');
  let files;
  try {
    files = readdirSync(from);
  } catch {
    return;
  }
  mkdirSync(to, { recursive: true });
  for (const file of files) {
    cpSync(join(from, file), join(to, file));
    bytes += statSync(join(to, file)).size;
    copied += 1;
  }
}

if (summaInEdition) {
  mkdirSync(join(publicRoot, SUMMA_DIR), { recursive: true });
  for (const name of SUMMA_FILES) copyOne(SUMMA_DIR, name, true);
}
if (summaEnInEdition) for (const name of SUMMA_EN_FILES) copyOne(SUMMA_EN_DIR, name, false);
for (const dir of GENERIC_DIRS) {
  if (!dirInEdition(dir)) {
    skippedByEdition += 1;
    continue;
  }
  for (const name of GENERIC_FILES) copyOne(dir, name, false);
  copyImagesDir(dir);
}

// Language help (docs/LEXIS-PLAN.md): the original-language edition ships
// data/lexis (per-work analysis bundles + dictionary shards) as public/lexis;
// the English edition never gets it. Soft: absent until the lexis build runs.
{
  const from = join(dataRoot, 'lexis');
  const to = join(publicRoot, 'lexis');
  rmSync(to, { recursive: true, force: true });
  if (EDITION !== 'en' && existsSync(join(from, 'manifest.json'))) {
    cpSync(from, to, { recursive: true });
    console.log('[copy-corpus] lexis: copied data/lexis -> public/lexis');
  } else if (EDITION !== 'en') {
    console.warn('[copy-corpus] lexis: data/lexis/manifest.json not present yet - language help data not bundled');
  }
}

const summaPresent = (summaInEdition ? readdirSync(join(publicRoot, SUMMA_DIR)) : []).filter((f) =>
  f.endsWith('.json'),
);
console.log(
  `[copy-corpus] ${copied} files copied into public/ ` +
    `(${(bytes / 1024 / 1024).toFixed(1)} MB). ` +
    `edition=${EDITION}, ${skippedByEdition} dir(s) not in this edition. Summa present: ${summaPresent.join(', ')}`,
);

if (hardFailures > 0) process.exit(1);
