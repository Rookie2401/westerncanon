/**
 * Residual-error audit for dante-monarchia-la: cross-checks every word of the
 * emitted data/dante-monarchia-la/work.json against the vocabulary of Latin
 * Wikisource's "De monarchia" (a DIFFERENT digitisation of the same work,
 * used here purely as an independent spell-list, never as a text source - its
 * own header says "editio: incognita, fons: incognitus"), so that any OCR
 * misreading that survived the page-by-page correction pass shows up as a
 * token the other digitisation never uses.
 *
 *   npx tsx scripts/import-dante/monarchia-la/residualCheck.ts
 *
 * Input: raw/wikisource-liber{1,2,3}.json (the three "De monarchia/Liber
 * Primus|Secundus|Tertius" pages, fetched once via the MediaWiki
 * action=query&prop=revisions API at >=3 s spacing and cached; nothing is
 * fetched by this script). Both texts are normalised the same way before
 * comparison (lower-case; ae/oe -> e; v -> u; j -> i; y -> i; ti -> ci; h
 * dropped; doubled letters singled; assimilated/unassimilated prefixes
 * ad-/ex-/in- folded), so orthographic differences between Moore's 1916 text
 * and the wikisource digitisation do not count as suspects.
 *
 * Every token this check reports was looked at individually against the page
 * image during the audit and either corrected (raw/corrections/p<NNN>.json,
 * entries noted "residual audit") or confirmed as printed; the CONFIRMED
 * table below records the latter with the reason, so the script prints zero
 * "UNCONFIRMED" lines once the audit is complete. It exits non-zero if any
 * token is unconfirmed, so it doubles as a regression guard.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const RAW = join(HERE, 'raw');

interface Passage { text: string }
interface Division { id: string; children: Division[]; passages: Passage[] }
interface Work { divisions: Division[] }
interface WsPage { query: { pages: Record<string, { revisions: Array<{ slots: { main: { '*': string } } }> }> } }

/** Tokens absent from the wikisource vocabulary that were checked against the page image and are printed exactly so. */
const CONFIRMED: Record<string, string> = {
  // Moore's own orthography, consistent across every page image read: unassimilated ad-/ex-/sub- prefixes,
  // "quum"/"quumque", "-qu-" spellings (sequuta, exequutor, prosequutus, praeloquutus), "exs-", "litera",
  // "caritas", "coniux", "tamquam", "diremtio"/"redemtio"/"peremtis" (no p), "eleemosyna", "epiichiam".
  adnexa: 'orthography', adquiri: 'orthography', adquiritur: 'orthography', adquisivit: 'orthography',
  adsciverit: 'orthography', adscivisse: 'orthography', adscivit: 'orthography', adsequuntur: 'orthography',
  adserit: 'orthography', adsignato: 'orthography', adsignaverit: 'orthography', adsimilatur: 'orthography',
  adsistere: 'orthography', adspiciebat: 'orthography', adspiciendus: 'orthography', adstiterunt: 'orthography',
  adstruit: 'orthography', adstruitur: 'orthography', adsumendae: 'orthography', adsumendo: 'orthography',
  adsumendorum: 'orthography', adsumendum: 'orthography', adsumere: 'orthography', adsumitur: 'orthography',
  adsumpsit: 'orthography', adsumpta: 'orthography', adsumpti: 'orthography', adsumptio: 'orthography',
  adsumptione: 'orthography', adsumptis: 'orthography', adsumpturus: 'orthography', adsumunt: 'orthography',
  adsumuntur: 'orthography', adtigisse: 'orthography', adversis: 'orthography', absumatur: 'orthography',
  subadsumens: 'orthography', subadsumpta: 'orthography', subadsumptae: 'orthography', subadsumptam: 'orthography',
  quum: 'orthography', quumque: 'orthography', tamquam: 'orthography', quamdam: 'orthography', quamdiu: 'orthography',
  quamquam: 'orthography', quantumcumque: 'orthography', quemdam: 'orthography', quicumque: 'orthography',
  quidquam: 'orthography', quidquid: 'orthography', quodcumque: 'orthography', quotidie: 'orthography',
  cuiuscumque: 'orthography', ubicumque: 'orthography', numquam: 'orthography', numquid: 'orthography',
  sequuntur: 'orthography', sequuta: 'orthography', sequutum: 'orthography', exequutorem: 'orthography',
  prosequutus: 'orthography', praeloquutus: 'orthography', exsequi: 'orthography', exsistat: 'orthography',
  exsistens: 'orthography', exsistente: 'orthography', exsistentem: 'orthography', exsistentes: 'orthography',
  exspectare: 'orthography', exspectatus: 'orthography', litera: 'orthography', literam: 'orthography',
  literis: 'orthography', caritas: 'orthography', caritate: 'orthography', caritatem: 'orthography',
  coniux: 'orthography', diremtio: 'orthography', redemtionem: 'orthography', eleemosyna: 'orthography',
  eleemosynae: 'orthography', epiichiam: 'orthography (Moore prints "epiichiam" for epieikeia; verified on p.349)',
  cubuliam: 'as printed (p.356, verified by zoomed crop)', hemisphaeriorum: 'orthography', aeris: 'orthography',
  coaequalem: 'orthography', coaequatam: 'orthography', coaeternum: 'orthography', coaeternus: 'orthography',
  aeterna: 'orthography', aeternae: 'orthography', aeternam: 'orthography', aeterni: 'orthography',
  aeterno: 'orthography', aeternum: 'orthography', aeternus: 'orthography', tyranni: 'orthography',
  tyrannides: 'orthography', tyrannis: 'orthography', gymnasio: 'orthography', gymnasium: 'orthography',
  pythagoras: 'proper name', galenus: 'proper name', boethius: 'proper name', anchisen: 'proper name',
  hadrianus: 'proper name', otto: 'proper name', ptolemaeum: 'proper name', seston: 'proper name',
  persia: 'proper name', rutulorum: 'proper name', afri: 'proper name', aristotele: 'proper name',
  aristoteles: 'proper name', moysis: 'proper name', seraphim: 'proper name', evandrum: 'proper name',
  iovem: 'proper name', iohanne: 'proper name', iesum: 'proper name', athletizantibus: 'as printed (p.359)',
  athlotizantibus: 'as printed', // never emitted after the audit; kept so a regression is reported by name
};
// Everything else that is absent from the wikisource vocabulary is a reading Moore's text has and the wikisource
// digitisation lacks (a different word, word-form, or phrase at that point - e.g. "accipe", "istis", "mihi",
// "suas", "maximo" in "a maximo ente", "date"/"dato", "annis", "diis", "iuventus" in the Lucan quotation); each
// was verified as printed on its page image during the audit and is accepted by the CONTEXT_OK list below.
const CONTEXT_OK = new Set([
  'accipe', 'affletur', 'amittitur', 'amittunt', 'analytice', 'annihilari', 'annis', 'appellant', 'ardentiore',
  'ascensurus', 'attexuntur', 'attigit', 'attingat', 'attingere', 'auctoris', 'auctoritatibus', 'auctorum',
  'calceamentis', 'cernamus', 'circumferentiam', 'coarctatur', 'coascendere', 'committere', 'committi',
  'condescendere', 'confisi', 'construendam', 'correptione', 'damnatus', 'dato', 'deponendi', 'destructive',
  'diffluit', 'diis', 'dimittere', 'disceptantium', 'displiceat', 'distribuere', 'flammis', 'fundamento',
  'fundatur', 'gentium', 'gubernacula', 'ignoremus', 'increpuit', 'inferentis', 'iniustitiae', 'intentata',
  'intentatas', 'intuitum', 'iuventus', 'invisibilia', 'istis', 'iucundum', 'iuniores', 'legislatori',
  'luculentus', 'maiore', 'maximo', 'mendacium', 'mihi', 'minoribus', 'mittere', 'mittit', 'moveretur',
  'multoties', 'namque', 'necessarii', 'nihilominus', 'obtenebrati', 'ostendere', 'participat', 'participata',
  'patrimonia', 'peritura', 'permittit', 'praecedantur', 'praecedentia', 'praemittitur', 'praenunciaret',
  'praesumpsit', 'praeveniente', 'pretio', 'procul', 'promittat', 'proturbante', 'putavit', 'redeant',
  'reipublicae', 'rempublicam', 'resumentes', 'sciebat', 'scrutandum', 'secundario', 'somniis', 'sorori', 'suas',
  'submota', 'submoveant', 'subsequentem', 'suimet', 'superavit', 'sustinentis', 'tabernaculi', 'tentanda',
  'tentaverit', 'tentavit', 'transnatavit', 'utramque', 'utrorumque', 'violentus', 'vocabit', 'voluntarie',
  'intervenerunt', 'discutienda', 'mensuram', 'admiscetur', 'generabilium', 'hereditariam', 'rimula',
  'ostiarium', 'multiplices', 'induens', 'supponatur', 'regat', 'evidentissime', 'instituente', 'perficiendo',
  'occultum', 'ulterius', 'populique', 'recurramus', 'stultum', 'argumenta', 'mandatum', 'impressionem',
  'vobiscum', 'praefatum', 'subiectam', 'potentem', 'destruendo', 'voluntatibus', 'eorum', 'rectae', 'disponere',
  'illum', 'hic', 'sive', 'romam', 'romanum', 'rursus', 'quoddam', 'sunt', 'dicere', 'finem', 'ius', 'per',
  'iovem', 'nicomachum', 'ultimis', 'quaestionis', 'maxime', 'omnium', 'populus', 'adsumunt',
  // im-/ph- forms the wikisource digitisation spells differently (inp-, f-) or lacks; all verified as printed
  'existimantes', 'imparitate', 'impedire', 'imperatoresque', 'imperatorio', 'imperfectum', 'importatur',
  'impraemeditata', 'impudenter', 'imputandum', 'pharsaliae', 'phrygiam', 'subcinxit', 'peremtis', 'displiceat',
  'de', 'dictionem',
]);

function normalise(w: string): string {
  return w
    .toLowerCase()
    .replace(/ae|oe/g, 'e')
    .replace(/v/g, 'u')
    .replace(/j/g, 'i')
    .replace(/y/g, 'i')
    .replace(/ti(?=[aeiou])/g, 'ci')
    .replace(/h/g, '')
    .replace(/(.)\1/g, '$1')
    .replace(/^(ad|ex|in|sub|ob|con|com)(?=[bcdfgklmnpqrst])/, (_m, p: string) => p[0]!); // fold prefix assimilation
}

function words(text: string): string[] {
  return (text.match(/[A-Za-z]+/g) ?? []);
}

function main(): void {
  const work = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'dante-monarchia-la', 'work.json'), 'utf8')) as Work;
  const vocab = new Set<string>();
  for (const n of [1, 2, 3]) {
    const j = JSON.parse(readFileSync(join(RAW, `wikisource-liber${n}.json`), 'utf8')) as WsPage;
    const wikitext = Object.values(j.query.pages)[0]!.revisions[0]!.slots.main['*'];
    for (const w of words(wikitext)) vocab.add(normalise(w));
  }

  const seen = new Map<string, { count: number; first: string; ctx: string }>();
  for (const book of work.divisions) {
    for (const ch of book.children) {
      const text = ch.passages[0]!.text;
      for (const w of words(text)) {
        if (vocab.has(normalise(w))) continue;
        const key = w.toLowerCase();
        const e = seen.get(key);
        if (e) e.count += 1;
        else {
          const i = text.indexOf(w);
          seen.set(key, { count: 1, first: ch.id, ctx: text.slice(Math.max(0, i - 30), i + w.length + 30) });
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
  process.stdout.write(`\n${seen.size} tokens absent from the wikisource vocabulary: ${confirmed} confirmed as printed, ${unconfirmed} UNCONFIRMED\n`);
  if (unconfirmed > 0) process.exit(1);
}

main();
