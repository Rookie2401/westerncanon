/**
 * Importer for the **Supplementum Tertiae Partis** of the Summa Theologiae
 * (qq. 1-99) plus the three **Appendix de Purgatorio** questions.
 *
 * This part is NOT in the vicmortelmans base transcription used by `index.ts`.
 * It is assembled here from two committed public-domain OCR witnesses:
 *
 *   PRIMARY  raw/marietti-1931-suppl.json   (Marietti ed., Turin 1926/1931)
 *            raw/marietti-1931-app1.json  + raw/marietti-1931-app2.json
 *   SECONDARY raw/roman-1894-suppl-vol5_djvu.txt
 *            (Editio altera Romana, vol. V, Forzani, Rome 1894;
 *             archive.org id `divithomaeaquina0005thom`)
 *
 * Method (see `data/summa/suppl-anomalies.json` for the machine-readable log):
 *  - The Marietti JSON supplies the structural grid (99 qq, 446 articles,
 *    contiguous article numbering — all verified) and is the primary witness for
 *    every member (objections / sed contra / corpus / replies).
 *  - Deterministic OCR-artefact cleanup only: the editorial `CONCLUSIO. <synopsis>`
 *    run-in before the real `Respondeo dicendum` is stripped; a space is inserted
 *    after `, ; : .` when glued to a letter (abbreviations guarded); a small
 *    curated map splits the most common word-internal concatenations; stray scan
 *    marks / quotes / page numbers / leaked running heads are removed; hyphenat-
 *    ion at line breaks is rejoined.
 *  - Where a Marietti member is column-scrambled (a leaked page running head of
 *    the form `<n> <n> SUPPL. PARTIS TERTIAE`), the aligned member of the 1894
 *    Roman edition is used instead when it OCR's cleanly; every such substitution,
 *    and every passage where neither witness is clean, is flagged in the anomaly
 *    log with a ~15-word quote of each witness. Connective text is never invented.
 *  - Article titles: the Marietti `UTRUM ...` line, sanity-checked; the 1894
 *    `UTRUM ...` line is used when Marietti's fails; `null` + a flag when both do.
 *    Stored lower-cased (matching the `part-III.json` convention) but otherwise
 *    verbatim, keeping the Supplementum's `j`/`ae` orthography.
 *
 * Nothing is translated, modernised, or conjecturally emended.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from './normalize.ts';
import type { Article, Part, Question } from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

/* ------------------------------------------------------------------ *
 * Raw source shapes
 * ------------------------------------------------------------------ */

interface RawMarArticle {
  q: number;
  a: number;
  t?: string;
  p?: number;
  ap?: string;
  ob?: { n: number; t: string }[];
  sc?: string;
  co?: string;
  rp?: { n: number; t: string }[];
}
interface RawMarFile {
  part: string;
  articles: RawMarArticle[];
}

/* ------------------------------------------------------------------ *
 * Anomaly collection
 * ------------------------------------------------------------------ */

export interface SupplAnomaly {
  where: string;
  note: string;
}
const ANOMALIES: SupplAnomaly[] = [];
let AUTO_SPACE_FIXES = 0;
let CURATED_SPLITS = 0;
let RESIDUAL_CONCAT_ARTICLES = 0;

function flag(where: string, note: string): void {
  ANOMALIES.push({ where, note });
}

/* ------------------------------------------------------------------ *
 * Deterministic text cleanup
 * ------------------------------------------------------------------ */

/** Leaked page running head, usually accompanied by two-column scramble. */
const RUNNING_HEAD_RE =
  /\b\d{1,4}\s+\d{1,4}\s+SUPPL\.?\s+PARTIS\s+(?:TERTIAE|TERTI[AÆ]?E?|FERTIAE|TERTIE|TERTIA|FERTIE|FERTIAE)\b/gi;
const BARE_HEAD_RE =
  /\bSUPPL\.?\s+PARTIS\s+(?:TERTIAE|TERTI[AÆ]?E?|FERTIAE|TERTIE|TERTIA)\b|\bINDEX\s+QUAEST\w*/gi;
const DIGIT_SCRAMBLE_RE = /\b\d{2,4}\s+\d{2,4}\s+(?:SUPPL|PARTIS)\b/i;

function isContaminated(s: string): boolean {
  if (!s) return false;
  RUNNING_HEAD_RE.lastIndex = 0;
  BARE_HEAD_RE.lastIndex = 0;
  return (
    RUNNING_HEAD_RE.test(s) ||
    BARE_HEAD_RE.test(s) ||
    DIGIT_SCRAMBLE_RE.test(s)
  );
}

function stripRunningHead(s: string): string {
  return s
    .replace(RUNNING_HEAD_RE, ' ')
    .replace(BARE_HEAD_RE, ' ')
    .replace(/\b\d{2,4}\s+\d{2,4}\s+/g, ' ')
    // A running head often lands between the two halves of a line-break
    // hyphenation ("pec- <head> cator"); rejoin once the head is gone.
    .replace(/([A-Za-zÀ-ÿ])-\s+([a-zà-ÿ])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ~15 words from the middle-ish of a string, for anomaly quotes. */
function quote15(s: string): string {
  const w = cleanText(s).split(' ');
  return w.slice(0, 15).join(' ');
}

/**
 * Curated word-internal concatenation splits actually observed in the Marietti
 * OCR of the Supplementum. Only unambiguous proclitic + real-word glues are
 * listed; anything not here is left untouched and its article is flagged.
 */
const CONCAT_MAP: Record<string, string> = {
  amandatis: 'a mandatis',
  aproprio: 'a proprio',
  asuo: 'a suo',
  aDeo: 'a Deo',
  aDeonon: 'a Deo non',
  aChristo: 'a Christo',
  aDomino: 'a Domino',
  aPilato: 'a Pilato',
  etsic: 'et sic',
  etideo: 'et ideo',
  etdurus: 'et durus',
  etfrangi: 'et frangi',
  etsecundum: 'et secundum',
  etobjectum: 'et objectum',
  etelectio: 'et electio',
  ethaec: 'et haec',
  ettimorem: 'et timorem',
  etoriginem: 'et originem',
  etsatisfaciendi: 'et satisfaciendi',
  etsoliditatem: 'et soliditatem',
  etcomminutionem: 'et comminutionem',
  ettamen: 'et tamen',
  ettunc: 'et tunc',
  etsimiliter: 'et similiter',
  etiterum: 'et iterum',
  etaliis: 'et aliis',
  etaliud: 'et aliud',
  etaliquid: 'et aliquid',
  etcorporis: 'et corporis',
  etcorpora: 'et corpora',
  etquantum: 'et quantum',
  ethujusmodi: 'et hujusmodi',
  etetiam: 'et etiam',
  etpost: 'et post',
  etpostea: 'et postea',
  etpropter: 'et propter',
  etsine: 'et sine',
  etomines: 'et omnes',
  etomnes: 'et omnes',
  etsicut: 'et sicut',
  etmaxime: 'et magis',
  etmagis: 'et magis',
  etprima: 'et prima',
  etremittitur: 'et remittitur',
  eteadem: 'et eadem',
  etterram: 'et terram',
  etloquitur: 'et loquitur',
  etdefectus: 'et defectus',
  etinquantum: 'et inquantum',
  etEcclesiae: 'et Ecclesiae',
  etDeo: 'et Deo',
  etApoc: 'et Apoc',
  nonpotest: 'non potest',
  nonpossit: 'non possit',
  nonpossunt: 'non possunt',
  nonest: 'non est',
  nonsunt: 'non sunt',
  nonhabet: 'non habet',
  nonfuit: 'non fuit',
  nonsit: 'non sit',
  nonsolum: 'non solum',
  incontritione: 'in contritione',
  insensu: 'in sensu',
  inhoc: 'in hoc',
  inpraecepto: 'in praecepto',
  intum: 'in eo tum',
  sesubjicit: 'se subjicit',
  sehabet: 'se habet',
  utdicitur: 'ut dicitur',
  utanimadvertit: 'ut animadvertit',
  utPhilosophus: 'ut Philosophus',
  utAugustinus: 'ut Augustinus',
  sicutdicitur: 'sicut dicitur',
  quodde: 'quod de',
  exverbis: 'ex verbis',
  videturquod: 'videtur quod',
  viderturquod: 'videtur quod',
  etpart: 'et part',
  etart: 'et art',
  inaliquibus: 'in aliquibus',
  inpotestate: 'in potestate',
  sirem: 'si rem',
  hujusquaest: 'hujus quaest',
  praedictaquaest: 'praedicta quaest',
};

const ABBR_GUARD: [RegExp, string][] = [
  [/S\.\s?Th\.\s?Sent\./gi, 'XZSTHSENTXZ'],
  [/S\.\s?Thom\./gi, 'XZSTHOMXZ'],
  [/S\.\s?Th\./gi, 'XZSTHXZ'],
  [/e\.\s?g\./gi, 'XZEGXZ'],
  [/i\.\s?e\./gi, 'XZIEXZ'],
  [/v\.\s?g\./gi, 'XZVGXZ'],
];

/** Insert a space after `, ; : .` glued to a letter (abbreviations guarded). */
function fixGluedPunctuation(input: string): string {
  let s = input;
  for (const [re, tok] of ABBR_GUARD) s = s.replace(re, tok);
  s = s.replace(/([,;:.])([A-Za-zÀ-ÿ])/g, (_m, p1: string, p2: string) => {
    AUTO_SPACE_FIXES += 1;
    return `${p1} ${p2}`;
  });
  s = s
    .replace(/XZSTHSENTXZ/g, 'S. Th. Sent.')
    .replace(/XZSTHOMXZ/g, 'S. Thom.')
    .replace(/XZSTHXZ/g, 'S. Th.')
    .replace(/XZEGXZ/g, 'e.g.')
    .replace(/XZIEXZ/g, 'i.e.')
    .replace(/XZVGXZ/g, 'v.g.');
  return s;
}

function applyConcatMap(input: string, where: string): string {
  let residual = 0;
  // digit glued to a following short function word ("4et 5" -> "4 et 5")
  const s = input.replace(/\b(\d{1,3})(et|ad|in|ex|de)\b/gi, '$1 $2');
  const out = s.replace(/[A-Za-zÀ-ÿ]{4,}/g, (w) => {
    const lower = w.charAt(0).toLowerCase() + w.slice(1);
    const hit = Object.prototype.hasOwnProperty.call(CONCAT_MAP, w)
      ? CONCAT_MAP[w]
      : Object.prototype.hasOwnProperty.call(CONCAT_MAP, lower)
        ? CONCAT_MAP[lower]
        : null;
    if (hit != null) {
      CURATED_SPLITS += 1;
      // preserve an original leading capital
      return w.charAt(0) === w.charAt(0).toUpperCase() && /[a-z]/.test(hit.charAt(0))
        ? hit.charAt(0).toUpperCase() + hit.slice(1)
        : hit;
    }
    // Detect a residual proclitic glue we did not map (for reporting only).
    if (/^(?:et|non|nec)[a-zà-ÿ]{4,}$/.test(w) && !RESIDUAL_OK.has(w)) residual += 1;
    return w;
  });
  if (residual >= 3) {
    RESIDUAL_CONCAT_ARTICLES += 1;
    flag(
      where,
      `${residual} residual word-internal concatenations left verbatim (Marietti OCR "missing space" defect not in the curated split map)`,
    );
  }
  return out;
}

/** All-lowercase tokens beginning et/non/nec that are genuinely single words. */
const RESIDUAL_OK = new Set<string>([
  'etiam',
  'etiamsi',
  'etenim',
  'necesse',
  'necessitas',
  'necessitate',
  'necessitatem',
  'necessitatis',
  'necessitati',
  'necessarium',
  'necessaria',
  'necessario',
  'necessariis',
  'nectar',
  'nonnisi',
  'nonnunquam',
  'nonnullus',
  'nonnulli',
]);

/**
 * Fold Greek / Cyrillic homoglyphs the OCR emitted for Latin capitals
 * ("ΟΜΝΙΑ ΜEMBRA" for "OMNIA MEMBRA", "номо" for "HOMO"). Visual mapping only.
 */
const HOMOGLYPH: Record<string, string> = {
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N',
  Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ϲ: 'C',
  а: 'a', в: 'B', е: 'e', к: 'k', м: 'M', н: 'H', о: 'o', р: 'p', с: 'c',
  т: 'T', у: 'y', х: 'x', А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H',
  О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X',
};
function foldHomoglyphs(s: string): string {
  return s.replace(/[Ͱ-ϿЀ-ӿ]/g, (ch) => HOMOGLYPH[ch] ?? ch);
}

/** Drop spaces the OCR left before punctuation ("confessione ;" -> "confessione;"). */
function tightenPunctuation(s: string): string {
  return s.replace(/\s+([;:,.!?])/g, '$1');
}

/**
 * Remove OCR scan noise that is not text: dingbats, bullets, geometric shapes,
 * stray boxes, quotation glyphs, underscores. Dashes are normalised to `-` and
 * ellipses to `...` first so the de-hyphenation / run-in-dash passes still work.
 */
function stripSymbols(input: string): string {
  return input
    .replace(/[‐-―]/g, '-') // hyphen/dash variants -> '-'
    .replace(/…/g, '...')
    .replace(/[❘|¥*«»„“”"'‘’]/g, ' ')
    .replace(/[<>%]/g, ' ') // stray OCR angle brackets / percent signs (never text here)
    .replace(/[_~]+/g, ' ')
    .replace(/[·•∙■-➿⸀-⹿�]/g, ' ') // ·•∙ ■▪⚫ dingbats etc.
    .replace(/[̀-ͯ]/g, ''); // stray combining marks
}

/**
 * Surgical removal of five decorative-scan garbage runs that slipped past the
 * generic noise filters (rules of dingbats / mangled running heads interleaved
 * mid-sentence at a column break). Each pattern is exact and matches nothing but
 * the scar; every hit is recorded in suppl-anomalies.json.
 */
const SCAN_SCARS: { re: RegExp; to: string; label: string }[] = [
  { re: /praesupponit cornig ee eke a re\.?\s*Sal!?\s*2 5 =?\s*>?\s*poralem/i, to: 'praesupponit corporalem', label: 'rejoined "corporalem" (decorative-scan run excised)' },
  { re: /virtute divina\s*<?\s*unde cum\b/i, to: 'virtute divina unde cum', label: 'stray scan bracket removed' },
  { re: /nascitur\.\s*BOP:.*$/is, to: 'nascitur.', label: 'trailing decorative-scan block removed (reply ends at "nascitur.")' },
  { re: /plurium angelorum\.\s*UTRUM AD RESURRECTIONEM.*$/is, to: 'plurium angelorum.', label: 'trailing block (leaked next-question heading + scan rule) removed (reply ends at "angelorum.")' },
  { re: /quamvis\s*% ?wv a br >? ?BS a ae ees SS ae Sete 2 contrarium/i, to: 'quamvis contrarium', label: 'decorative-scan run excised between "quamvis" and "contrarium"' },
  { re: /inclinat ratio natu- t Po vee ralis/i, to: 'inclinat ratio naturalis', label: 'rejoined "naturalis" (decorative-scan tokens "t Po vee" excised)' },
];

function exciseScanScars(s: string, where: string): string {
  let out = s;
  for (const scar of SCAN_SCARS) {
    if (scar.re.test(out)) {
      out = out.replace(scar.re, scar.to);
      flag(where, scar.label);
    }
  }
  return out;
}

/** Full deterministic cleanup for a Marietti member string. */
function cleanMarietti(input: string | undefined | null, where: string): string {
  if (input == null) return '';
  let s = stripSymbols(foldHomoglyphs(String(input)));
  // Rejoin hyphenation ("divi- duntur", "ORI- GINALI").
  s = s.replace(/([A-Za-zÀ-ÿ])[-¬=]\s+([A-Za-zà-ÿ])/g, '$1$2');
  // Editorial run-in dashes ("CONCLUSIO.- ", "definitio. -").
  s = s.replace(/\.\s*-\s*/g, '. ').replace(/\s+-\s+/g, ' ');
  // Reply-marker OCR slips: "Ap TERTIUM dicendum" / "Ab primum dicendum" -> "Ad tertium dicendum"
  // (a reply head is invariably "Ad <ordinal> [ergo] dicendum"; the ordinal is
  //  lower-cased to match the rest of the corpus).
  s = s.replace(
    /\bA[bp]\s+(PRIMUM|SECUNDUM|TERTIUM|QUARTUM|QUINTUM|SEXTUM|SEPTIMUM|OCTAVUM|NONUM|DECIMUM|primum|secundum|tertium|quartum|quintum|sextum|septimum|octavum|nonum|decimum)\s+((?:ergo|autem|vero)\s+)?dicendum/g,
    (_m, ord: string, mid: string | undefined) => `Ad ${ord.toLowerCase()} ${mid ?? ''}dicendum`,
  );
  s = fixGluedPunctuation(s);
  s = applyConcatMap(s, where);
  return tightenPunctuation(cleanText(s));
}

/** Strip the editorial `CONCLUSIO. <synopsis>.` run-in before the real corpus. */
function stripConclusio(co: string | undefined, where: string): string | null {
  if (co == null || co.trim() === '') return null;
  const m = /Respondeo\s+dicendum/i.exec(co);
  if (!m) {
    flag(
      where,
      `corpus has no "Respondeo dicendum" marker; the whole Marietti \`co\` field is kept verbatim (may retain the editorial CONCLUSIO synopsis). Marietti reads: "${quote15(co)} ..."`,
    );
    return co;
  }
  return co.slice(m.index);
}

/* ------------------------------------------------------------------ *
 * Title sanitising
 * ------------------------------------------------------------------ */

function titlePlausible(t: string | null): t is string {
  if (t == null) return false;
  const s = t.trim();
  if (s.length < 8) return false;
  if (!/^[a-zà-ÿ]/i.test(s)) return false;
  if (/\d/.test(s)) return false;
  if (/[.,;:!?]{2,}/.test(s)) return false;
  if (!/^utrum\b/i.test(s)) return false;
  // A title must not run past a sentence boundary into leaked body text.
  if (/[.;]\s+\p{L}/u.test(s)) return false;
  // implausibly long for an "utrum ..." clause => probably leaked running text
  if (s.split(/\s+/).length > 26) return false;
  return true;
}

/**
 * Clean a raw UTRUM title and return its lower-cased verbatim form, or `null`
 * when what remains does not pass the sanity check. Handles homoglyphs,
 * line-break hyphenation, a leading non-UTRUM fragment, and trailing leaked
 * apparatus / running text.
 */
function cleanTitle(raw: string): string | null {
  let s = foldHomoglyphs(raw).replace(/[❘|¥*«»„“”"'‘’]/g, ' ');
  s = s.replace(/([A-Za-zÀ-ÿ])[-¬=]\s+([A-Za-zà-ÿ])/g, '$1$2'); // de-hyphenate
  s = fixGluedPunctuation(s);
  // If "UTRUM" appears after some junk, start there.
  const u = /\bUTRUM\b/i.exec(s);
  if (u && u.index > 0) s = s.slice(u.index);
  // Cut trailing editorial apparatus.
  s = s.replace(/\s+De\s?his\s+etiam\b.*$/i, '');
  s = s.replace(/\s+S\.?\s?Thom?\.?\s+Sent\.?.*$/i, '');
  s = s.replace(/,\s*(?:ETC\.?|&C\.?)\b.*$/i, '');
  // Cut at the first sentence boundary or stray numbered token.
  s = s.replace(/([.;])\s+\S.*$/, '');
  s = s.replace(/\s+\d+\..*$/, '');
  s = cleanText(s).replace(/[.\s]+$/, '');
  const lc = s.toLowerCase();
  return titlePlausible(lc) ? lc : null;
}

/* ------------------------------------------------------------------ *
 * 1894 Roman edition parser (secondary witness)
 * ------------------------------------------------------------------ */

interface Mem1894 {
  /** member number (objection / reply-to-objection), or null when unnumbered. */
  n: number | null;
  text: string;
}
interface Rec1894 {
  title: string | null;
  objections: Mem1894[];
  sedContra: string | null;
  respondeo: string | null;
  replies: Mem1894[];
}

const WORD_NUM: Record<string, number> = {
  primum: 1, secundum: 2, tertium: 3, quartum: 4, quintum: 5, sextum: 6,
  septimum: 7, octavum: 8, nonum: 9, decimum: 10, undecimum: 11, duodecimum: 12,
};
function romanToInt(r: string): number | null {
  const map: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  const s = r.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const cur = map[s[i] as string];
    const nxt = map[s[i + 1] as string];
    if (cur == null) return null;
    total += nxt != null && nxt > cur ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}
function ordinalToNum(word: string): number | null {
  const w = word.toLowerCase();
  if (WORD_NUM[w] != null) return WORD_NUM[w] as number;
  return romanToInt(word);
}

const NOISE_1894 = [
  /\bQUAESTIO\b[^a-z]{0,40}\bARTICUL/i, // running head "16 ~< QUAESTIO I. ARTICULUS I. pe a"
  /^\s*[\d~<>«»^\s.]*QUAESTIO\s+[IVXLC]+\b/i,
  /\bARTICULUS\s+[IVXLC]{1,6}\.?\s*$/i, // bare next-article header line
  /SUPPL\.?\s+PARTIS/i,
  /^\s*\d+\s*[:.]?\s*(?:ads?\s+)?APPENDIX/i,
  /\bAPPENDIX\.?\s*$/i,
  /INDEX QUAESTIONUM/i,
  /QUAEST\.\s+&?\s*ARTIC/i,
  /^\s*TERTIAE PARTIS SUPPLEMENTUM/i,
  /Ex e[jy]usdem Auctoris/i,
  /^\s*MONITUM\b/i,
];

function isNoiseLine(l: string): boolean {
  const t = l.trim();
  if (!t) return false;
  if (NOISE_1894.some((re) => re.test(t))) return true;
  if (/^\d{1,4}$/.test(t)) return true;
  if (/^[ivxlcdm]{1,8}[.,]?$/i.test(t) && t.replace(/[.,]/g, '').length <= 6) return true;
  const letters = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (letters < 3) return true;
  if (letters / t.length < 0.45 && t.length < 44) return true;
  if (!/[aeiouyAEIOUY]/.test(t) && t.length < 25) return true;
  return false;
}

/**
 * Excise a page running head that leaked into the middle of a 1894 passage
 * ("... (loc. sup. cit.), 94 SS QUAESTIO XVI. ARTICULUS II, Res quod ..."). The
 * `QUAESTIO <n>. ARTICULUS <n>.` shape never occurs in Aquinas' prose, so this
 * is safe; up to 3 adjacent OCR-garble tokens and a preceding bare page number
 * are taken with it. Text on both sides is left untouched (no bridging words).
 */
/** A capitalised token that legitimately starts a sentence in Aquinas' Latin. */
const SENTENCE_STARTERS =
  /^(?:Sed|Et|Unde|Nam|Ergo|Praeterea|Respondeo|Item|Alia|Sic|Hoc|His|Ad|Nec|Circa|Quia|Quod|Non|Nihil|Similiter|Praedicta|Dico|Dicendum|Videtur|Cum|Si|Ut|Quamvis|Ideo|Igitur|Tunc|Prima|Secunda|Tertia|Primo|Secundo|Tertio|Deinde|Respondendum|Contra)$/;

function stripLeakedHeads1894(s: string): string {
  const RE =
    /\s*\d{0,4}\s*(?:SS\s+)?QUAESTIO\s+[IVXLCil]+[.,]?\s+ARTICULUS\s*[IVXLCil]*[.,:]?((?:\s+\S+){0,4})/gi;
  const out = s.replace(RE, (_full: string, trail: string) => {
    const toks: string[] = trail.trim() ? trail.trim().split(/\s+/) : [];
    let drop = 0;
    for (const raw of toks) {
      const bare = raw.replace(/^[.,;:()]+/, '').replace(/[.,;:()]+$/, '');
      const plausible =
        bare.length === 0 ||
        /^[a-z0-9]/.test(bare) ||
        SENTENCE_STARTERS.test(bare) ||
        /[a-z]{4,}/.test(bare); // a genuine capitalised word (Damascenum, Augustinus…)
      if (plausible) break;
      drop += 1;
    }
    return ' ' + toks.slice(drop).join(' ');
  });
  return out.replace(/\s+/g, ' ').trim();
}


const ORDINAL_WORDS =
  'PRIMUM|SECUNDUM|TERTIUM|QUARTUM|QUINTUM|SEXTUM|SEPTIMUM|OCTAVUM|NONUM|DECIMUM|UNDECIMUM|DUODECIMUM';

/**
 * The 1894 edition sets the scholastic formulas in small caps ("RESPONDEO
 * dicendum", "AD PRIMUM ergo dicendum", "SED CONTRA", "PRAETEREA"). Lower-case
 * them to the ordinary orthography used everywhere else in this corpus
 * (`part-III.json` etc.). This is a typographic normalisation, not a change of
 * wording.
 */
function normalizeFormulas1894(s: string): string {
  return s
    .replace(/\bRESPONDEO\b/g, 'Respondeo')
    .replace(/\bSED\s+CONTRA\b/g, 'Sed contra')
    .replace(/\bPR[AÆ]?E?TEREA\b/g, 'Praeterea')
    .replace(
      new RegExp(`\\bAD\\s+(${ORDINAL_WORDS})\\b`, 'g'),
      (_m, w: string) => 'Ad ' + w.charAt(0) + w.slice(1).toLowerCase(),
    )
    .replace(/\bAD\s+([IVXL]{1,5})\s+(ergo\s+|autem\s+|vero\s+)?dicendum\b/g, 'Ad $1 $2dicendum')
    .replace(/\bAD\s+QUAESTIUNCULAM\b/gi, 'Ad quaestiunculam');
}

function clean1894(s: string): string {
  let out = stripLeakedHeads1894(stripSymbols(foldHomoglyphs(s)));
  // line-break hyphenation, including the "re-   - gitiva" catch-word form the
  // 1894 press sets at a page break: letter, hyphen(s)/spaces soup, then a
  // lower-case continuation -> rejoin the word.
  out = out.replace(/([A-Za-zÀ-ÿ])-[\s-]*\s([a-zà-ÿ])/g, '$1$2');
  out = out.replace(/([A-Za-zÀ-ÿ])[-¬=]+\s*([a-zà-ÿ])/g, '$1$2');
  out = out.replace(/(^|\s)[-]+(?=[A-Za-zÀ-ÿ])/g, '$1');
  out = out.replace(/([A-Za-zÀ-ÿ])[-]+([A-Za-zà-ÿ])/g, '$1$2');
  out = out.replace(/\s+-\s+/g, ' ');
  out = normalizeFormulas1894(out);
  return tightenPunctuation(cleanText(out));
}

const REPLY_MARK_RE =
  /\bA[DP]\s+(PRIMUM|SECUNDUM|TERTIUM|QUARTUM|QUINTUM|SEXTUM|SEPTIMUM|OCTAVUM|NONUM|DECIMUM|UNDECIMUM|DUODECIMUM|[IVXL]{1,5})\s+(?:ergo\s+|autem\s+|vero\s+)?dicendum/gi;
const PRAETEREA_RE = /\b(\d{1,2})\.\s*PR[AÆ]?E?TEREA\.?/i;

function segmentBody1894(body: string): Omit<Rec1894, 'title'> {
  const scM = /\bSED\s+CONTRA\b/i.exec(body);
  const objPart = scM ? body.slice(0, scM.index) : body;
  let rest = scM ? body.slice(scM.index) : '';

  // ---- objections (numbered) ----------------------------------------
  const objections: Mem1894[] = [];
  const objSplit = objPart.split(new RegExp(PRAETEREA_RE.source, 'i'));
  // objSplit = [chunk0, num1, chunk1, num2, chunk2, ...]
  const first = clean1894(
    (objSplit[0] ?? '').replace(/^.*?sic\s+proceditur\.?\s*/i, ''),
  );
  if (first.length > 12) objections.push({ n: 1, text: first });
  for (let k = 1; k + 1 < objSplit.length; k += 2) {
    const num = parseInt(objSplit[k] as string, 10);
    const txt = clean1894(objSplit[k + 1] as string);
    if (txt.length > 10) objections.push({ n: Number.isFinite(num) ? num : null, text: txt });
  }

  let sedContra: string | null = null;
  let respondeo: string | null = null;
  const replies: Mem1894[] = [];

  if (rest) {
    const respM = /\bRESPONDEO\s+dicendum/i.exec(rest);
    if (respM) {
      sedContra = clean1894(rest.slice(0, respM.index).replace(/^\s*SED\s+CONTRA\.?\s*/i, ''));
      rest = rest.slice(respM.index);
    } else {
      sedContra = clean1894(rest.replace(/^\s*SED\s+CONTRA\.?\s*/i, ''));
      rest = '';
    }
  }
  if (rest) {
    REPLY_MARK_RE.lastIndex = 0;
    const marks: { idx: number; n: number | null }[] = [];
    let mm: RegExpExecArray | null;
    while ((mm = REPLY_MARK_RE.exec(rest)) !== null) {
      marks.push({ idx: mm.index, n: ordinalToNum(mm[1] as string) });
    }
    if (marks.length) {
      respondeo = clean1894(rest.slice(0, (marks[0] as { idx: number }).idx));
      for (let i = 0; i < marks.length; i += 1) {
        const from = (marks[i] as { idx: number }).idx;
        const to = i + 1 < marks.length ? (marks[i + 1] as { idx: number }).idx : rest.length;
        const piece = clean1894(rest.slice(from, to));
        if (piece.length > 8) replies.push({ n: (marks[i] as { n: number | null }).n, text: piece });
      }
    } else {
      respondeo = clean1894(rest);
    }
  }
  if (respondeo && respondeo.length < 15) respondeo = null;
  if (sedContra && sedContra.length < 8) sedContra = null;
  return { objections, sedContra, respondeo, replies };
}

function parse1894Window(startRe: RegExp, endRe: RegExp): Rec1894[] {
  const file = join(RAW_DIR, 'roman-1894-suppl-vol5_djvu.txt');
  const rawLines = readFileSync(file, 'utf8').split(/\r?\n/);
  const startIdx = rawLines.findIndex((l) => startRe.test(l));
  const endIdx = rawLines.findIndex((l, i) => i > startIdx && endRe.test(l));
  const body = rawLines
    .slice(startIdx >= 0 ? startIdx : 0, endIdx >= 0 ? endIdx : rawLines.length)
    .filter((l) => !isNoiseLine(l));
  let text = body.join('\n');
  text = text.replace(/([A-Za-zÀ-ÿ])[-¬=]\s*\n\s*([a-zà-ÿ])/g, '$1$2'); // de-hyphenate at breaks
  text = text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ');

  const anchorRe = /\bsic\s+proceditur\b/gi;
  const anchors: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(text)) !== null) anchors.push(m.index);

  const recs: Rec1894[] = [];
  for (let i = 0; i < anchors.length; i += 1) {
    const anchor = anchors[i] as number;
    const before = text.slice(Math.max(0, anchor - 320), anchor);
    const titleMatches = [...before.matchAll(/\bUTRUM\b[^.]{6,200}?\./gi)];
    const rawTitle =
      titleMatches.length > 0 ? (titleMatches[titleMatches.length - 1]![0] as string) : null;
    const bodyEnd = i + 1 < anchors.length ? (anchors[i + 1] as number) : text.length;
    let chunk = text.slice(anchor, bodyEnd);
    // Trim a trailing next-article header ("ARTICULUS II. UTRUM ...") only when it
    // sits in the last third of the chunk (never a mid-body leaked running head).
    const hdr = /\bARTI[CGT]UL\S*\s+[IVXLU]{1,6}[.,:\s]/i.exec(chunk);
    if (hdr && hdr.index > chunk.length * 0.66) chunk = chunk.slice(0, hdr.index);
    recs.push({ title: rawTitle ? cleanTitle(rawTitle) : null, ...segmentBody1894(chunk) });
  }
  return recs;
}

let _cache1894: Rec1894[] | null = null;
function parse1894(): Rec1894[] {
  if (!_cache1894) {
    _cache1894 = parse1894Window(
      /TERTIAE PARTIS SUPPLEMENTUM/i,
      /MONITUM IN SEQUENTEM APPENDICEM/i,
    );
  }
  return _cache1894;
}

let _cacheApp1894: Rec1894[] | null = null;
/** The 10 appendix articles (App I q1:2, App I q2:6, App II q1:2) from the 1894 text. */
function parse1894Appendix(): Rec1894[] {
  if (!_cacheApp1894) {
    _cacheApp1894 = parse1894Window(/MONITUM IN SEQUENTEM APPENDICEM/i, /INDEX QUAESTIONUM/i);
  }
  return _cacheApp1894;
}

/* ------------------------------------------------------------------ *
 * 1894 <-> Marietti alignment
 * ------------------------------------------------------------------ */

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\b(j)/g, 'i')
    .replace(/ae/g, 'e')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleJaccard(a: string, b: string): number {
  const A = new Set(fold(a).split(' ').filter((w) => w.length > 2));
  const B = new Set(fold(b).split(' ').filter((w) => w.length > 2));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Align the 1894 article sequence to the Marietti one. Both witnesses print the
 * articles in the same canonical order, so we (1) anchor on the articles whose
 * titles are good in BOTH witnesses and match strongly, discarding any anchor
 * that breaks monotonicity, then (2) interpolate the Marietti->1894 index offset
 * for every other article (including those whose Marietti `t` is running-text
 * garbage — exactly the ones that need a 1894 reading most). A positionally
 * interpolated pick is still rejected if both titles are good yet disagree.
 */
function alignWitnesses(marTitles: (string | null)[]): (Rec1894 | null)[] {
  const recs = parse1894();
  const n = marTitles.length;

  // ---- (1) strong anchors -------------------------------------------------
  const anchors: { i: number; j: number }[] = [];
  const guessOffset = recs.length - n;
  for (let i = 0; i < n; i += 1) {
    const mt = marTitles[i];
    if (!mt) continue;
    let bestJ = -1;
    let bestScore = 0;
    const lo = Math.max(0, i + Math.min(0, guessOffset) - 5);
    const hi = Math.min(recs.length - 1, i + Math.max(0, guessOffset) + 5);
    for (let j = lo; j <= hi; j += 1) {
      const r = recs[j];
      if (!r?.title) continue;
      const sc = titleJaccard(mt, r.title);
      if (sc > bestScore) {
        bestScore = sc;
        bestJ = j;
      }
    }
    if (bestScore >= 0.6 && bestJ >= 0) anchors.push({ i, j: bestJ });
  }
  // enforce monotonic non-decreasing j
  const mono: { i: number; j: number }[] = [];
  for (const a of anchors) {
    while (mono.length && (mono[mono.length - 1] as { i: number; j: number }).j >= a.j) mono.pop();
    if (!mono.length || (mono[mono.length - 1] as { i: number; j: number }).i < a.i) mono.push(a);
  }

  // ---- (2) interpolate an offset for every i ---------------------------
  const offsetAt = (i: number): number => {
    if (!mono.length) return Math.max(0, guessOffset);
    if (i <= (mono[0] as { i: number; j: number }).i) {
      const a = mono[0] as { i: number; j: number };
      return a.j - a.i;
    }
    const last = mono[mono.length - 1] as { i: number; j: number };
    if (i >= last.i) return last.j - last.i;
    for (let k = 0; k + 1 < mono.length; k += 1) {
      const a = mono[k] as { i: number; j: number };
      const b = mono[k + 1] as { i: number; j: number };
      if (i >= a.i && i <= b.i) return (i - a.i <= b.i - i ? a.j - a.i : b.j - b.i);
    }
    return last.j - last.i;
  };

  const out: (Rec1894 | null)[] = [];
  for (let i = 0; i < n; i += 1) {
    const j = i + offsetAt(i);
    const r = j >= 0 && j < recs.length ? (recs[j] ?? null) : null;
    if (!r) {
      out.push(null);
      continue;
    }
    const mt = marTitles[i];
    if (mt && r.title && titleJaccard(mt, r.title) < 0.34) {
      // both titles are good but disagree -> alignment unsafe here
      out.push(null);
    } else {
      out.push(r);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Member reconstruction
 * ------------------------------------------------------------------ */

function looksCleanFrom1894(s: string | null | undefined): s is string {
  if (!s) return false;
  if (s.length < 20) return false;
  if (isContaminated(s)) return false;
  // a physically leaked running head ("QUAESTIO I. ARTICULUS I." / "ARTICULUS II. UTRUM")
  // means the 1894 chunk is itself column-broken here -> not a clean reconstruction.
  // (Lower-case "art." / "quaest." cross-references in the body are fine.)
  if (/\bQUAESTIO\s+[IVXLC]+\.\s+ARTICUL/i.test(s)) return false;
  if (/\bARTICULUS\s+[IVXLC]{1,6}\.\s+UTRUM/i.test(s)) return false;
  if (isContaminated(s)) return false;
  // residual OCR noise: too many characters outside a generous Latin-text set
  const weird = (s.match(/[^\p{L}\p{N}\s.,;:!?()º°%/–—'-]/gu) || []).length;
  if (weird > 8) return false;
  return true;
}

/**
 * Resolve one member. `mar` is the cleaned Marietti text; `alt` the aligned
 * 1894 text (may be undefined). Returns the text plus an optional anomaly note.
 */
function resolveMember(
  memberName: string,
  marRaw: string,
  alt: string | null | undefined,
): { text: string; note?: string } {
  if (!isContaminated(marRaw)) return { text: marRaw };
  const marStripped = stripRunningHead(marRaw);
  if (looksCleanFrom1894(alt)) {
    return {
      text: alt,
      note: `${memberName} reconstructed from the 1894 Roman edition (Marietti OCR was column-scrambled here). Marietti fragment: "${quote15(marRaw)} ..."`,
    };
  }
  return {
    text: marStripped,
    note:
      `${memberName}: Marietti OCR column-scrambled and no clean 1894 reconstruction available; ` +
      `the least-bad Marietti reading is kept with the leaked running head removed. ` +
      `Marietti: "${quote15(marRaw)} ..."` +
      (alt ? ` | 1894: "${quote15(alt)} ..."` : ' | 1894: (no aligned reading)'),
  };
}

/* ------------------------------------------------------------------ *
 * Assemble one article
 * ------------------------------------------------------------------ */

function buildArticle(
  citationBase: string,
  mar: RawMarArticle,
  alt: Rec1894 | null,
  articleNumber: number | null,
): Article {
  const where = citationBase;
  const notes: string[] = [];

  // ---- title -----------------------------------------------------------
  let title: string | null = null;
  const marTitleRaw = (mar.t ?? '').trim();
  const marTitleClean = cleanTitle(marTitleRaw);
  const altTitle = alt?.title ?? null;
  if (marTitleClean) {
    title = marTitleClean;
  } else if (titlePlausible(altTitle)) {
    title = altTitle;
    notes.push(
      `title taken from the 1894 Roman edition (Marietti \`t\` was ${
        marTitleRaw ? `unusable: "${quote15(marTitleRaw)}"` : 'empty'
      })`,
    );
  } else {
    notes.push(
      `title could not be established from either witness (Marietti \`t\`: ${
        marTitleRaw ? `"${quote15(marTitleRaw)}"` : 'empty'
      }); left null`,
    );
  }

  // ---- objections ----------------------------------------------------
  const objections: { number: number; text: string }[] = [];
  const marObs = [...(mar.ob ?? [])].sort((a, b) => a.n - b.n);
  marObs.forEach((o) => {
    const cleaned = cleanMarietti(o.t, `${where} / objection ${o.n}`);
    const alt1894 = alt?.objections.find((x) => x.n === o.n)?.text ?? null;
    const r = resolveMember(`objection ${o.n}`, cleaned, alt1894);
    if (r.note) notes.push(r.note);
    objections.push({ number: o.n, text: r.text });
  });

  // ---- sed contra --------------------------------------------------
  const sedContra: { number: number; text: string }[] = [];
  if (mar.sc && mar.sc.trim()) {
    const cleaned = cleanMarietti(mar.sc, `${where} / sed contra`);
    const r = resolveMember('sed contra', cleaned, alt?.sedContra ?? null);
    if (r.note) notes.push(r.note);
    sedContra.push({ number: 1, text: r.text });
  }

  // ---- respondeo -------------------------------------------------
  let respondeo: string | null = null;
  const strippedCo = stripConclusio(mar.co, `${where} / respondeo`);
  if (strippedCo != null) {
    const cleaned = cleanMarietti(strippedCo, `${where} / respondeo`);
    const r = resolveMember('respondeo', cleaned, alt?.respondeo ?? null);
    if (r.note) notes.push(r.note);
    respondeo = r.text || null;
  } else if (looksCleanFrom1894(alt?.respondeo)) {
    respondeo = alt.respondeo;
    notes.push('respondeo reconstructed from the 1894 Roman edition (Marietti `co` field was empty)');
  } else {
    notes.push('respondeo absent from the Marietti witness and no clean 1894 reading; left null');
  }

  // ---- replies -------------------------------------------------
  const replies: { objectionNumber: number | null; text: string }[] = [];
  const marReplies = [...(mar.rp ?? [])];
  const seenN = new Set<number>();
  const hasDupSubQ = marReplies.some((r) => {
    if (seenN.has(r.n)) return true;
    seenN.add(r.n);
    return false;
  });
  marReplies.forEach((rp, idx) => {
    const cleaned = cleanMarietti(rp.t, `${where} / reply ${rp.n}`);
    const alt1894 = hasDupSubQ
      ? null
      : alt?.replies.find((x) => x.n === rp.n)?.text ?? null;
    const r = resolveMember(`reply to objection ${rp.n}`, cleaned, alt1894);
    if (r.note) notes.push(r.note);
    let objectionNumber: number | null = rp.n;
    if (/^Ad\s+(?:primum\s+et\s+secundum|ea\s+quae|omnia|objecta|praedicta|utrumque)\b/i.test(r.text)) {
      objectionNumber = null;
    }
    if (hasDupSubQ) objectionNumber = idx + 1;
    replies.push({ objectionNumber, text: r.text });
  });
  if (hasDupSubQ) {
    notes.push(
      'replies are sub-quaestiuncula ("Ad primum quaestionis primae ...") — kept in printed order with objectionNumber set to the running index',
    );
  }
  // combined-reply word form ("Ad primum ergo dicendum" with n encoding all)
  replies.forEach((r) => {
    if (r.objectionNumber != null && !Number.isFinite(r.objectionNumber)) r.objectionNumber = null;
  });

  // Final surgical pass: excise five decorative-scan scars that survive the
  // generic filters (each hit is flagged by exciseScanScars).
  for (const o of objections) o.text = exciseScanScars(o.text, `${where} / objection ${o.number}`);
  for (const s of sedContra) s.text = exciseScanScars(s.text, `${where} / sed contra`);
  if (respondeo) respondeo = exciseScanScars(respondeo, `${where} / respondeo`);
  for (const rp of replies) rp.text = exciseScanScars(rp.text, `${where} / reply`);
  if (title) title = exciseScanScars(title, `${where} / title`);

  const article: Article = {
    number: articleNumber,
    citation: where,
    title,
    objections,
    sedContra,
    respondeo,
    replies,
    witness: 'marietti-1931',
  };
  if (notes.length) {
    article.anomaly = notes.join(' | ');
    for (const n of notes) flag(`${where}`, n);
  }
  return article;
}

/* ------------------------------------------------------------------ *
 * Part-level & question-level prooemia (from the 1894 text)
 * ------------------------------------------------------------------ */

function extractPartProoemium(): string | null {
  const file = join(RAW_DIR, 'roman-1894-suppl-vol5_djvu.txt');
  const txt = readFileSync(file, 'utf8').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
  const m = /Deinde considerandum est de singulis partibus poenitentiae:(.*?)Circa primum quaeruntur/i.exec(
    txt,
  );
  if (!m) {
    flag('Suppl. / prooemium', 'part-level prooemium not located in the 1894 text; set to null');
    return null;
  }
  let body = clean1894('Deinde considerandum est de singulis partibus poenitentiae:' + m[1]);
  // Unambiguous OCR-letter artefacts in this one sentence.
  body = body
    .replace(/\bteriio\b/g, 'tertio')
    .replace(/\bpoeniientiae\b/g, 'poenitentiae')
    .replace(/\bqguinto\b/g, 'quinto');
  body = tightenPunctuation(body);
  if (isContaminated(body) || body.length < 60) {
    flag('Suppl. / prooemium', 'part-level prooemium OCR unclean; set to null');
    return null;
  }
  flag(
    'Suppl. / prooemium',
    'part-level prooemium is the treatise prologue opening Suppl. q. 1 in the 1894 Roman edition, verbatim up to "Circa primum quaeruntur"; line-break hyphens rejoined and three OCR-letter slips corrected ("teriio" to "tertio", "poeniientiae" to "poenitentiae", "qguinto" to "quinto").',
  );
  return body.replace(/[\s.;:,]+$/, '') + '.';
}

/* ------------------------------------------------------------------ *
 * Appendix
 * ------------------------------------------------------------------ */

interface AppSpec {
  number: number;
  appendix: 'I' | 'II';
  appendixNumber: number;
  citation: string;
  file: string;
  srcQ: number;
  /** 1894 UTRUM titles for this appendix question, in article order. */
  titles1894: string[];
  prooemium1894: string;
}

const APP_SPECS: AppSpec[] = [
  {
    number: 100,
    appendix: 'I',
    appendixNumber: 1,
    citation: 'Suppl. App. I q. 1',
    file: 'marietti-1931-app2.json',
    srcQ: 1,
    titles1894: [
      'utrum purgatorium sit post hanc vitam',
      'utrum sit idem locus, quo animae purgantur, et quo damnati puniuntur',
    ],
    prooemium1894:
      'Circa existentiam purgatorii quaeruntur duo. Primo. Utrum purgatorium sit post hanc vitam. Secundo. Utrum sit idem locus, quo animae purgantur, et quo damnati puniuntur.',
  },
  {
    number: 101,
    appendix: 'I',
    appendixNumber: 2,
    citation: 'Suppl. App. I q. 2',
    file: 'marietti-1931-app1.json',
    srcQ: 2,
    titles1894: [
      'utrum poena purgatorii excedat omnem poenam temporalem hujus vitae',
      'utrum illa poena sit voluntaria',
      'utrum animae in purgatorio per daemones puniantur',
      'utrum per poenam purgatorii expietur peccatum veniale quoad culpam',
      'utrum ignis purgatorius liberet a reatu poenae',
      'utrum ab illa poena unus liberetur alio citius',
    ],
    prooemium1894:
      'Deinde considerandum est de animabus, quae post hanc vitam, propter actualium peccatorum poenam, igne purgatorio expiantur. Circa quod quaeruntur sex. Primo. Utrum poena purgatorii excedat omnem poenam temporalem hujus vitae. Secundo. Utrum illa poena sit voluntaria. Tertio. Utrum animae in purgatorio per daemones puniantur. Quarto. Utrum per poenam purgatorii expietur peccatum veniale quoad culpam. Quinto. Utrum ignis purgatorius liberet a reatu poenae. Sexto. Utrum ab illa poena unus alio citius liberetur.',
  },
  {
    number: 102,
    appendix: 'II',
    appendixNumber: 1,
    citation: 'Suppl. App. II q. 1',
    file: 'marietti-1931-app1.json',
    srcQ: 1,
    titles1894: [
      'utrum animae cum sola originali culpa decedentes a corporeo igne patiantur, vel affligantur poena ignis',
      'utrum ejusmodi animae patiantur afflictionem spiritualem, propter statum in quo sunt',
    ],
    prooemium1894:
      'Deinde considerandum est in particulari de diversis qualitatibus animarum a corporibus exutarum juxta diversum statum earumdem. Circa quod quaeruntur duo. Primo. Utrum tales animae a corporeo igne patiantur vel affligantur poena ignis. Secundo. Utrum patiantur afflictionem spiritualem propter statum in quo sunt.',
  },
];

/** Ends abruptly at a hyphen / is far too short to be a full member. */
function looksTruncated(s: string, kind: 'objection' | 'reply' | 'respondeo' | 'sc'): boolean {
  if (/[-‐]\s*$/.test(s)) return true;
  const min = kind === 'respondeo' ? 60 : kind === 'sc' ? 20 : 40;
  return s.replace(/\s+/g, ' ').trim().length < min;
}

function buildAppendixQuestion(spec: AppSpec, appRecs: Rec1894[]): Question {
  const raw = JSON.parse(readFileSync(join(RAW_DIR, spec.file), 'utf8')) as RawMarFile;
  const arts = raw.articles.filter((a) => a.q === spec.srcQ).sort((a, b) => a.a - b.a);
  const articles: Article[] = arts.map((mar, idx) => {
    const artNo = mar.a;
    const where = `${spec.citation} a. ${artNo}`;
    const alt = appRecs[idx] ?? null;
    const notes: string[] = [];

    const repair = (
      marText: string,
      altText: string | null | undefined,
      name: string,
      kind: 'objection' | 'reply' | 'respondeo' | 'sc',
    ): string => {
      const stripped = stripRunningHead(marText);
      const bad = isContaminated(marText) || looksTruncated(stripped, kind);
      if (!bad) return stripped;
      if (looksCleanFrom1894(altText)) {
        notes.push(
          `${name} completed / de-scrambled from the 1894 Roman edition (Marietti appendix OCR was ${
            /[-‐]\s*$/.test(marText) ? 'truncated' : 'column-scrambled'
          } here). Marietti: "${quote15(marText)} ..."`,
        );
        return altText;
      }
      notes.push(
        `${name}: Marietti appendix OCR ${
          /[-‐]\s*$/.test(marText) ? 'truncated' : 'unclean'
        } and no clean 1894 reading; least-bad Marietti kept. Marietti: "${quote15(marText)} ..."`,
      );
      return stripped;
    };

    // title: prefer the clean 1894 UTRUM line (Marietti appendix `t` OCR loses
    // ae -> "ANIME"/"PENA" and is often hyphen-broken or empty).
    let title: string | null = spec.titles1894[idx] ?? null;
    const marTitleRaw = (mar.t ?? '').trim();
    if (title) {
      if (marTitleRaw) {
        notes.push(
          `title uses the 1894 Roman-edition reading; the Marietti appendix \`t\` ("${quote15(
            marTitleRaw,
          )}") has ae-for-e OCR loss / hyphen breaks`,
        );
      } else {
        notes.push('title uses the 1894 Roman-edition reading; the Marietti appendix `t` is empty');
      }
    } else if (marTitleRaw) {
      title = cleanTitle(marTitleRaw);
      if (!title) notes.push(`title unusable in both witnesses ("${quote15(marTitleRaw)}"); left null`);
    }

    const objections: { number: number; text: string }[] = [...(mar.ob ?? [])]
      .sort((a, b) => a.n - b.n)
      .map((o) => ({
        number: o.n,
        text: repair(
          cleanMarietti(o.t, `${where} / objection ${o.n}`),
          alt?.objections.find((x) => x.n === o.n)?.text ?? null,
          `objection ${o.n}`,
          'objection',
        ),
      }));

    const sedContra: { number: number; text: string }[] = [];
    if (mar.sc && mar.sc.trim()) {
      sedContra.push({
        number: 1,
        text: repair(
          cleanMarietti(mar.sc, `${where} / sed contra`),
          alt?.sedContra ?? null,
          'sed contra',
          'sc',
        ),
      });
    }

    let respondeo: string | null = null;
    const strippedCo = stripConclusio(mar.co, `${where} / respondeo`);
    if (strippedCo != null) {
      respondeo =
        repair(
          cleanMarietti(strippedCo, `${where} / respondeo`),
          alt?.respondeo ?? null,
          'respondeo',
          'respondeo',
        ) || null;
    } else if (looksCleanFrom1894(alt?.respondeo)) {
      respondeo = alt.respondeo;
      notes.push('respondeo supplied from the 1894 Roman edition (Marietti appendix `co` was empty)');
    } else {
      notes.push('respondeo absent from the Marietti appendix witness; left null');
    }

    const replies: { objectionNumber: number | null; text: string }[] = [...(mar.rp ?? [])].map(
      (rp) => {
        const text = repair(
          cleanMarietti(rp.t, `${where} / reply ${rp.n}`),
          alt?.replies.find((x) => x.n === rp.n)?.text ?? null,
          `reply to objection ${rp.n}`,
          'reply',
        );
        let objectionNumber: number | null = rp.n;
        if (/^Ad\s+(?:primum\s+et\s+secundum|ea\s+quae|omnia|objecta)\b/i.test(text)) {
          objectionNumber = null;
        }
        return { objectionNumber, text };
      },
    );

    const article: Article = {
      number: artNo,
      citation: where,
      title,
      objections,
      sedContra,
      respondeo,
      replies,
      witness: 'marietti-1931',
    };
    if (notes.length) {
      article.anomaly = notes.join(' | ');
      for (const n of notes) flag(where, n);
    }
    return article;
  });

  const q: Question = {
    number: spec.number,
    citation: spec.citation,
    title: null,
    prooemium: spec.prooemium1894,
    articles,
    witness: 'marietti-1931',
    appendix: spec.appendix,
    appendixNumber: spec.appendixNumber,
  };
  flag(
    spec.citation,
    `appendix question assembled from ${spec.file} (q ${spec.srcQ}); Marietti is the primary witness for every member. The 1894 Roman edition supplies the article titles and the question prooemium, and is used to complete any Marietti member that is truncated or column-scrambled (each such member is flagged individually). A full word-by-word 1894 collation of the clean Marietti members was not performed.`,
  );
  return q;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

let _cachePart: Part | null = null;

function build(): Part {
  if (_cachePart) return _cachePart;
  ANOMALIES.length = 0;
  AUTO_SPACE_FIXES = 0;
  CURATED_SPLITS = 0;
  RESIDUAL_CONCAT_ARTICLES = 0;

  const raw = JSON.parse(
    readFileSync(join(RAW_DIR, 'marietti-1931-suppl.json'), 'utf8'),
  ) as RawMarFile;
  const all = [...raw.articles].sort((a, b) => a.q - b.q || a.a - b.a);

  // flat title list for witness alignment
  const flatTitles = all.map((a) => cleanTitle((a.t ?? '').trim()));
  const aligned = alignWitnesses(flatTitles);

  // group by question
  const byQ = new Map<number, RawMarArticle[]>();
  for (const a of all) {
    if (!byQ.has(a.q)) byQ.set(a.q, []);
    (byQ.get(a.q) as RawMarArticle[]).push(a);
  }

  const partProoemium = extractPartProoemium();

  const questions: Question[] = [];
  let flatIdx = 0;
  for (let qn = 1; qn <= 99; qn += 1) {
    const arts = (byQ.get(qn) ?? []).sort((a, b) => a.a - b.a);
    if (arts.length === 0) {
      flag(`Suppl. q. ${qn}`, 'question missing entirely from the Marietti witness');
      continue;
    }
    const single = arts.length === 1;
    const articles: Article[] = arts.map((mar) => {
      const artNo: number | null = single ? null : mar.a;
      const citation = artNo == null ? `Suppl. q. ${qn}` : `Suppl. q. ${qn} a. ${mar.a}`;
      const art = buildArticle(citation, mar, aligned[flatIdx] ?? null, artNo);
      flatIdx += 1;
      return art;
    });
    // Only q. 1's question-level prooemium is unambiguously identifiable in the
    // 1894 OCR (it is the treatise prologue itself). The rest are left null
    // rather than risk mis-attributing a mis-segmented block.
    if (qn === 1 && partProoemium == null) {
      flag('Suppl. q. 1 / prooemium', 'question-level prooemium unavailable (see part prooemium note)');
    }
    questions.push({
      number: qn,
      citation: `Suppl. q. ${qn}`,
      title: null,
      prooemium: qn === 1 ? partProoemium : null,
      articles,
      witness: 'marietti-1931',
    });
  }

  // appendix questions last
  const appRecs = parse1894Appendix();
  let appOff = 0;
  for (const spec of APP_SPECS) {
    const slice = appRecs.slice(appOff, appOff + spec.titles1894.length);
    appOff += spec.titles1894.length;
    questions.push(buildAppendixQuestion(spec, slice));
  }

  const part: Part = {
    id: 'supplementum',
    code: 'Suppl.',
    latinTitle: 'Supplementum Tertiae Partis',
    shortTitle: 'Supplementum',
    prooemium: partProoemium,
    compilationNote:
      "Assembled after Aquinas' death (c. 1274) by Reginald (Rainaldus) of Piperno from Aquinas' earlier Scriptum super libros Sententiarum, Book IV; not written by Aquinas as part of the Summa. Latin text: Marietti edition (Turin 1926/1931), cross-checked against the Editio altera Romana vol. V (Rome, Forzani, 1894).",
    questions,
  };

  // ---- global method / orthography anomalies -------------------------
  flag(
    'Suppl. (whole part)',
    `METHOD: structural grid + primary text from the Marietti 1931 OCR (raw/marietti-1931-suppl.json); ` +
      `deterministic artefact cleanup only (CONCLUSIO synopsis strip, glued-punctuation spacing, curated concatenation splits, ` +
      `running-head / scan-mark removal, line-break de-hyphenation). Column-scrambled members reconstructed from the 1894 Roman ` +
      `edition OCR (raw/roman-1894-suppl-vol5_djvu.txt) when it reads cleanly, else kept least-bad and flagged. ` +
      `Approx. ${AUTO_SPACE_FIXES} automatic "space after punctuation" fixes and ${CURATED_SPLITS} curated concatenation splits applied; ` +
      `${RESIDUAL_CONCAT_ARTICLES} article(s) retain >=3 unmapped concatenations verbatim. Nothing translated, modernised or conjecturally emended.`,
  );
  flag(
    'Suppl. (orthography)',
    'The Supplementum text (both witnesses) uses consonantal `j` (ejus, objecto, cujus) and the `ae` digraph. This is KEPT VERBATIM and deliberately NOT regularised to the `i` / classical spelling used in the Prima–Tertia Pars JSON of this corpus.',
  );
  flag(
    'Suppl. (editorial apparatus)',
    'The Marietti `ap` field ("De his etiam S. Th. Sent. iv, dist. ...") is an editorial parallel-place note, not text of Aquinas; it is dropped from every article (not stored as an anomaly per-article).',
  );

  _cachePart = part;
  return part;
}

/** Build the assembled Supplementum `Part`. */
export function buildSupplement(): Part {
  return build();
}

/** Every preserved irregularity / uncertain reading, for `suppl-anomalies.json`. */
export function collectSupplementAnomalies(): SupplAnomaly[] {
  build();
  return ANOMALIES.slice();
}

