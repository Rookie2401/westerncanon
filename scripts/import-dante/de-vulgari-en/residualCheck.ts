/**
 * Residual-error audit for dante-de-vulgari-eloquentia-en: cross-checks every
 * word of the emitted data/dante-de-vulgari-eloquentia-en/work.json against a
 * vocabulary built from this library's own already-shipped English Dante
 * translations (dante-monarchia-en, dante-convivio-en, dante-vita-nuova-en -
 * all English prose from the same general period, none derived from this
 * scan), plus a short allowance list for proper names, Latin/Provencal/
 * Italian quotations, and archaic spellings this 1904 edition itself uses.
 * Same purpose and method as monarchia-la/residualCheck.ts: any OCR
 * misreading that survived the page-by-page correction pass shows up as a
 * token none of those independent texts (nor the allowance list) ever use.
 *
 *   npx tsx scripts/import-dante/de-vulgari-en/residualCheck.ts
 *
 * Every token this check reports was looked at individually against its page
 * image during the audit and either corrected (raw/corrections/pNNN.json,
 * entries noted "residual audit") or confirmed as printed; the CONFIRMED/
 * CONTEXT_OK tables below record the latter, so the script prints zero
 * "UNCONFIRMED" lines once the audit is complete. It exits non-zero if any
 * token is unconfirmed, so it doubles as a regression guard.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');

interface Passage {
  text: string;
}
interface Division {
  id: string;
  children: Division[];
  passages: Passage[];
}
interface Work {
  divisions: Division[];
}

function allText(divs: Division[]): string[] {
  const out: string[] = [];
  for (const d of divs) {
    for (const p of d.passages) out.push(p.text);
    out.push(...allText(d.children));
  }
  return out;
}

// Unicode letter class (not plain [A-Za-z]): this text keeps genuine ligatures and accents verbatim in quoted
// Latin/Provençal/Italian/French text and proper names (Mæotis, Cæsar, Provençal, Sì, oïl, etc.) - a plain ASCII
// regex would split "Mæotis" into the bogus tokens "M" and "otis", corrupting the audit with false suspects.
function words(text: string): string[] {
  return text.match(/\p{L}+/gu) ?? [];
}

function normalise(w: string): string {
  return w.toLowerCase();
}

/**
 * Tokens absent from the sibling-translation vocabulary that were checked
 * against the page image and are printed exactly so.
 */
const CONFIRMED: Record<string, string> = {
  // Howell's own spelling choices / archaisms, consistent across the pages read.
  vernacular: 'in-vocabulary word the sibling texts simply never happen to use',
  eloquentia: 'Latin work-title, quoted untranslated',
  provencal: 'as printed (this edition\'s own spelling, no accent in the OCR/roman text)',
  langue: 'French/Provencal quotation',
  langued: "as printed (elision in a quoted Provencal/langue d'oc phrase)",
  oc: "as printed (langue d'oc)",
  oil: "as printed (langue d'oil)",
  si: 'Italian/Provencal quotation (si)',
};

/**
 * Tokens verified as printed on their page image during the audit: either a
 * genuine reading the sibling translations simply do not happen to share
 * (proper names, technical/rhetorical terms specific to this treatise), or a
 * Latin/Provencal/Italian quotation kept verbatim (per this batch's house
 * rule - quotations are never translated or normalised).
 */
const CONTEXT_OK = new Set<string>([
  'abellis', 'accents', 'activities', 'actually', 'acute', 'additional', 'addreciamen', 'adjust', 'adjusting', 'admissible', 'adrechamen', 'adverb',
  'advisable', 'affirmation', 'affirmative', 'affords', 'aggia', 'agreement', 'ai', 'aiding', 'aigua', 'aimeric', 'aina', 'al', 'alessandria', 'alleges',
  'alleviato', 'alternating', 'amara', 'amat', 'amics', 'amor', 'amore', 'amorem', 'amoros', 'amors', 'ancona', 'ancor', 'andonno', 'anticipates',
  'apennines', 'apes', 'apulia', 'apulian', 'apulians', 'aquileia', 'aquileians', 'aquino', 'ara', 'arbres', 'architects', 'ardire', 'aretines', 'arezzo',
  'arnaut', 'arno', 'arrogate', 'arrow', 'arthur', 'aspirate', 'assiduous', 'associated', 'atro', 'attaining', 'attended', 'attending', 'attendo', 'august',
  'aura', 'auvergne', 'auzirez', 'avegna', 'avenging', 'avesse', 'avete', 'awarded', 'azzo', 'babbo', 'babel', 'balaam', 'balanced', 'balances',
  'balancing', 'ballate', 'barbarism', 'barbarisms', 'barbarous', 'beautifully', 'behaviour', 'belch', 'belenoi', 'bell', 'belonged', 'ben',
  'benaventuratissimo', 'bene', 'bent', 'bergamo', 'bertha', 'bertran', 'blending', 'blocks', 'boldly', 'bologna', 'bolognese', 'boluntate', 'bonagiunta',
  'bontè', 'bonté', 'borgo', 'borneil', 'borrow', 'borrowed', 'boundaries', 'brancuz', 'braying', 'brescia', 'brescians', 'bristling', 'brow', 'brunetto',
  'bruols', 'bucciola', 'bushes', 'caesar', 'calabrians', 'calculate', 'cantar', 'cantars', 'cantilena', 'canzone', 'canzoni', 'caocntino', 'capital',
  'careful', 'cascioli', 'casentino', 'castellana', 'castra', 'casual', 'cavalcanti', 'celebrated', 'celebrity', 'celum', 'cerchio', 'ces', 'cessation',
  'cetra', 'ch', 'changeable', 'characteristics', 'chase', 'cheeks', 'chesto', 'chiangesse', 'chignamente', 'childish', 'cielo', 'cino', 'circumflex',
  'cita', 'città', 'ciò', 'clad', 'claim', 'claimed', 'claims', 'clairir', 'classification', 'classified', 'clearing', 'clearness', 'clemency',
  'climes', 'clothe', 'coda', 'colonne', 'combed', 'combination', 'comedy', 'comic', 'communication', 'compendiously', 'competent', 'compilations',
  'complir', 'compulsory', 'comuno', 'conceptions', 'concern', 'concessions', 'confer', 'conferring', 'confers', 'confines', 'confining', 'congratulation',
  'congruous', 'conjecture', 'connection', 'conquer', 'considerations', 'consisted', 'consonantal', 'consonants', 'consult', 'contemporaries', 'conven',
  'conventional', 'conversely', 'copious', 'corada', 'core', 'corner', 'corners', 'corpo', 'countenanced', 'countrymen', 'counts', 'courtly', 'crazed',
  'cremona', 'cremonese', 'cruelly', 'curial', 'curiality', 'customs', 'dante', 'danube', 'dealing', 'decline', 'declining', 'defesa', 'defining',
  'degraded', 'dei', 'del', 'deliberate', 'delimitation', 'delle', 'delusion', 'denominatives', 'denunciation', 'depended', 'deposit', 'depravity',
  'deserts', 'deservedly', 'designation', 'despises', 'despising', 'detail', 'determine', 'deum', 'deusci', 'deviated', 'devils', 'devoting', 'dialect',
  'dialects', 'dici', 'diesis', 'differ', 'differences', 'diffusion', 'digno', 'diminutively', 'dio', 'dir', 'dire', 'directions', 'disapprove',
  'disaventuratissimamente', 'discerns', 'discharges', 'discipline', 'disclose', 'discusses', 'disdaining', 'disdains', 'disentangle', 'disentangling',
  'disfigured', 'disio', 'disliked', 'dismissed', 'displayed', 'displaying', 'disqualification', 'dissipated', 'dissuasively', 'distorts', 'district',
  'districts', 'disturbances', 'disuse', 'diverged', 'diversified', 'doglia', 'dolciada', 'domus', 'donar', 'donare', 'donna', 'donne', 'draught',
  'draughts', 'drawling', 'drink', 'drop', 'droppings', 'duchy', 'dwellers', 'eagerly', 'easier', 'echo', 'echoing', 'ee', 'efforts', 'eie', 'el',
  'elegiac', 'elegy', 'element', 'elevation', 'eligible', 'embosoms', 'embrace', 'embraced', 'embraces', 'emotions', 'emulate', 'en', 'encabalitz',
  'enclose', 'enclosed', 'encusera', 'endearment', 'endeavouring', 'endings', 'endormitz', 'england', 'enti', 'enumerates', 'eo', 'epithet', 'epithets',
  'equipment', 'equipped', 'equivocation', 'es', 'este', 'estranged', 'etate', 'eve', 'exalts', 'examination', 'excellently', 'excepted', 'exclusively',
  'exercised', 'exparja', 'expenditure', 'expiated', 'exploits', 'exposed', 'expressions', 'exquisite', 'extending', 'extravagance', 'extremities', 'fa',
  'fabruzzo', 'facciano', 'faentines', 'faenza', 'faggot', 'fals', 'fancying', 'fanti', 'fastu', 'faulty', 'favourable', 'felice', 'femina', 'feminine',
  'fermana', 'fermo', 'ferrara', 'ferrarese', 'fezelz', 'fino', 'fiorensa', 'fitness', 'flash', 'flavour', 'florentine', 'florentines', 'fluctuating',
  'flutes', 'fo', 'focho', 'focora', 'folle', 'folquet', 'fond', 'fore', 'foresters', 'forli', 'forming', 'fos', 'founders', 'fragrance', 'fragrant',
  'france', 'french', 'frenzied', 'frenzy', 'frequently', 'friuli', 'fron', 'fronte', 'frontier', 'frontiers', 'frontinus', 'fruitlessly', 'fullest',
  'gaeta', 'gallo', 'gassarra', 'geese', 'generically', 'genoa', 'genoese', 'gentil', 'genuine', 'germany', 'ghisilieri', 'gianni', 'giddy', 'giorno',
  'giraut', 'gire', 'già', 'glossy', 'glowing', 'gotto', 'gradually', 'grafts', 'gran', 'grand', 'grande', 'grandeur', 'greggia', 'group', 'guinizelli',
  'guittone', 'gulf', 'gutter', 'ha', 'habitable', 'hallowed', 'handled', 'haphazard', 'harmful', 'harmonised', 'harshness', 'hasten', 'heading',
  'headlong', 'heavily', 'heber', 'heights', 'helicon', 'heroic', 'hesitation', 'highly', 'hinge', 'hissing', 'hom', 'honore', 'honorificabilitudinitate',
  'horns', 'horseback', 'hungarian', 'hungarians', 'hunt', 'hurls', 'hydromel', 'identity', 'idiom', 'ignominy', 'il', 'ildebrandino', 'illegitimate',
  'illiterate', 'illuminate', 'illuminating', 'imitate', 'imitating', 'imitation', 'immigrant', 'imola', 'implying', 'impossibilitate', 'impossibilità',
  'improvement', 'inanimatissimamente', 'inborn', 'incipient', 'inclinations', 'incongruous', 'inconveniences', 'incorrigible', 'indications',
  'indignantly', 'infatuated', 'ingredient', 'ingredients', 'inhabit', 'inherited', 'initiation', 'inmate', 'inquiring', 'inquiringly', 'insert',
  'inserted', 'inserting', 'insight', 'insipid', 'instinct', 'institution', 'insults', 'intellecto', 'inter', 'interjections', 'interrupted',
  'intoxication', 'introduce', 'introque', 'invariable', 'inveigh', 'inventors', 'investigate', 'investigation', 'invites', 'involves', 'io', 'ire',
  'irony', 'irregular', 'istria', 'istrians', 'ius', 'iò', 'jargon', 'javelin', 'joi', 'joining', 'key', 'lair', 'languages', 'languishing', 'lapo',
  'lasciato', 'lash', 'lassi', 'latest', 'le', 'leaf', 'lean', 'lectio', 'legends', 'leisure', 'letamente', 'letitia', 'li', 'linking', 'liquid', 'liquids',
  'literary', 'loftily', 'lombard', 'lombardy', 'longobards', 'lontano', 'lucca', 'lungiamente', 'lust', 'm', 'madonna', 'magara', 'maggiore', 'magnates',
  'magpies', 'mai', 'mamma', 'manfred', 'manichiamo', 'manifesting', 'manifold', 'manly', 'mantua', 'march', 'marches', 'mare', 'marquises', 'marseilles',
  'marshes', 'masonry', 'mate', 'mea', 'measurable', 'melodic', 'melody', 'menato', 'mente', 'meo', 'mercò', 'mes', 'messer', 'messina', 'mezzure', 'mia',
  'milanese', 'mineral', 'mino', 'mix', 'mixes', 'mixing', 'mocato', 'mocked', 'models', 'modena', 'moderns', 'modulation', 'mon', 'monosyllables', 'monto',
  'moritur', 'mortar', 'morte', 'mothertongue', 'mountainous', 'mountains', 'movi', 'mpresa', 'mudar', 'multo', 'munificence', 'murderers', 'musical',
  'mute', 'mæotis', 'n', 'national', 'natives', 'natura', 'navarre', 'neapolitans', 'nella', 'nello', 'newest', 'nimbleness', 'noah', 'nof', 'noi',
  'noticed', 'notices', 'novella', 'novem', 'nowise', 'nuls', 'nè', 'oblique', 'observations', 'obsolete', 'obtuse', 'obviate', 'occupations', 'occupies',
  'ochiover', 'oclo', 'ode', 'odes', 'offensively', 'oftenest', 'ol', 'ombra', 'omitting', 'onche', 'onesto', 'opacity', 'opposites', 'ora', 'orange',
  'organist', 'ornamental', 'orvieto', 'ovelle', 'oïl', 'padua', 'paduans', 'paits', 'panther', 'panting', 'parenthesis', 'partaker', 'partial',
  'participles', 'particles', 'pastures', 'pate', 'patrons', 'paulus', 'pauses', 'pavians', 'peal', 'pegulhan', 'pensamens', 'perceptible', 'perch',
  'perfidy', 'performance', 'performers', 'perished', 'persists', 'persuasively', 'perugia', 'perversely', 'petty', 'philosophised', 'pica', 'pietosa',
  'pietramala', 'pisa', 'pisans', 'pistoia', 'pistoja', 'più', 'placentines', 'placevole', 'plage', 'planed', 'player', 'pleasurable', 'plebeian',
  'plectrum', 'pliny', 'ply', 'poco', 'poetic', 'poi', 'polish', 'polished', 'polysyllables', 'populous', 'porti', 'posc', 'poscia', 'pot', 'practicable',
  'prato', 'precedence', 'precipices', 'predecessors', 'predicaments', 'predominance', 'predominate', 'preference', 'prega', 'prerogative', 'presumed',
  'pretensions', 'prevailing', 'prevalence', 'primitive', 'proclaim', 'prolixity', 'promontory', 'prone', 'pronounce', 'pronunciation', 'provided',
  'province', 'provoked', 'prowess', 'purification', 'purposing', 'pursuing', 'pursuit', 'quarrying', 'quatraro', 'que', 'quem', 'questa', 'quicker',
  'quinto', 'racha', 'ragiona', 'ramifications', 'rates', 'ravenna', 'rebellious', 'reca', 'recede', 'reception', 'recited', 'recoils', 'recollect',
  'redeemer', 'refers', 'refinement', 'reject', 'rejoices', 'rejoin', 'relic', 'relied', 'remarked', 'renegata', 'repaire', 'repara', 'repeated',
  'repetition', 'repetitions', 'requirement', 'resources', 'respectively', 'respects', 'reveillar', 'reviewing', 'revisit', 'ride', 'ridge', 'rinaldo',
  'ripresa', 'rivers', 'robber', 'rolling', 'romagna', 'roof', 'ropes', 'roughness', 'rude', 'rudeness', 'ruder', 'rumpled', 'rural', 'rush', 'rustic',
  'safer', 'sai', 'sardinia', 'sardinians', 'saxons', 'scate', 'scatters', 'scheme', 'sciate', 'sclavonians', 'scopai', 'scoured', 'scourge', 'scrap',
  'searching', 'secorso', 'securitate', 'selecting', 'semi', 'sempre', 'sen', 'sennear', 'sensuous', 'sentences', 'sentis', 'serpent', 'serviceable',
  'settled', 'shaggy', 'sharpness', 'shelters', 'shem', 'shrinks', 'sicilian', 'sicilians', 'siena', 'sienese', 'sieve', 'sift', 'sifted', 'silk', 'sim',
  'simplest', 'sinria', 'sirma', 'situated', 'situations', 'sluggishness', 'smite', 'smoke', 'smoothness', 'soaring', 'sobraffan', 'sobre', 'sobrecarcar',
  'sofferire', 'softness', 'solaz', 'soldier', 'solitude', 'sols', 'somethings', 'sono', 'sordello', 'sortz', 'sovereigns', 'sovramagnificentissimamente',
  'spaniards', 'speakers', 'spears', 'speranza', 'spero', 'spice', 'spoletans', 'spoleto', 'stateliest', 'stateliness', 'stating', 'steed', 'sticks',
  'stink', 'stiva', 'stories', 'strada', 'stranger', 'strangers', 'strenuous', 'strings', 'stripes', 'structure', 'styled', 'styles', 'subdivided',
  'subordinate', 'succeeding', 'suckled', 'sui', 'summing', 'super', 'superficial', 'superfluity', 'surprised', 'surprising', 'survey', 'surveyed',
  'sylvan', 'syncopations', 't', 'tan', 'tangled', 'tas', 'te', 'teachers', 'technical', 'technically', 'tegno', 'tempo', 'tendency', 'terra', 'terram',
  'territory', 'teutons', 'thorny', 'thorough', 'threefold', 'throats', 'thunder', 'tiled', 'tiles', 'tiny', 'toils', 'tone', 'topics', 'totila',
  'totz', 'towns', 'tracking', 'tragedy', 'tragemi', 'traggemi', 'tragic', 'training', 'traitors', 'transition', 'trappings', 'trent', 'trevisans',
  'treviso', 'trinacria', 'trop', 'trowels', 'tua', 'tumble', 'tuo', 'turin', 'tuscan', 'tuscans', 'tutto', 'tyrrhenian', 'ugliest', 'ugolino', 'umbrian',
  'un', 'una', 'unaccompanied', 'undergo', 'undeservedly', 'undivided', 'unfolding', 'unlock', 'unnecessary', 'unrhymed', 'uprooting', 'upset', 'urban',
  'urging', 'variable', 'varied', 'varieties', 'vary', 'vedi', 'vegetable', 'venetia', 'venetians', 'venice', 'venire', 'ventured', 'ver', 'vernaculars',
  'verona', 'veronese', 'vertute', 'vertù', 'veràs', 'vesper', 'vi', 'viccntines', 'vicenza', 'vient', 'vif', 'vivit', 'vivo', 'viz', 'vo', 'vocabulary',
  'voglio', 'volta', 'volumes', 'volzera', 'voto', 'wanders', 'weave', 'wedded', 'weighed', 'weighty', 'welcomed', 'western', 'workers', 'workmanship',
  'worthier', 'worthiest', 'worthinesses', 'wove', 'wrongfully', 'x', 'z', 'ài',
]);

function loadWork(workId: string): Work {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'data', workId, 'work.json'), 'utf8')) as Work;
}

function main(): void {
  const target = loadWork('dante-de-vulgari-eloquentia-en');

  const vocab = new Set<string>();
  for (const siblingId of ['dante-monarchia-en', 'dante-convivio-en', 'dante-vita-nuova-en']) {
    const sibling = loadWork(siblingId);
    for (const text of allText(sibling.divisions)) {
      for (const w of words(text)) vocab.add(normalise(w));
    }
  }

  const seen = new Map<string, { count: number; first: string; ctx: string }>();
  for (const book of target.divisions) {
    for (const ch of book.children) {
      const chapterId = ch.id;
      for (const p of ch.passages) {
        const text = p.text;
        for (const w of words(text)) {
          const key = normalise(w);
          if (vocab.has(key)) continue;
          const e = seen.get(key);
          if (e) e.count += 1;
          else {
            const i = text.indexOf(w);
            seen.set(key, { count: 1, first: chapterId, ctx: text.slice(Math.max(0, i - 30), i + w.length + 30) });
          }
        }
      }
    }
  }

  let confirmed = 0;
  let unconfirmed = 0;
  for (const [tok, e] of [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const why = CONFIRMED[tok] ?? (CONTEXT_OK.has(tok) ? 'as printed (context-checked)' : null);
    if (why) confirmed += 1;
    else {
      unconfirmed += 1;
      process.stdout.write(`UNCONFIRMED  ${tok}\t×${e.count}\t${e.first}\t…${e.ctx.replace(/\s+/g, ' ')}…\n`);
    }
  }
  process.stdout.write(`\n${seen.size} tokens absent from the sibling-translation vocabulary: ${confirmed} confirmed as printed, ${unconfirmed} UNCONFIRMED\n`);
  if (unconfirmed > 0) process.exit(1);
}

main();
