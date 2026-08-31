/**
 * Fill the thirteen lacunae in the bundled vicmortelmans transcription of the
 * Summa (see `gaps.ts` for how they were found) from cited public-domain
 * ORIGINAL-LANGUAGE witnesses. Nothing here is translated, normalised or
 * silently corrected: each paragraph is the verbatim Latin of its witness with
 * only transport scaffolding (wiki templates / HTML tags / reference sigla)
 * removed and whitespace collapsed.
 *
 * Witnesses (raw dumps committed under raw/):
 *   - raw/lacunae-wikisource-prima-pars.json
 *       Latin Wikisource, "Summa Theologiae/Prima pars/Quaestio {LXXII,II,LVII,LXXXIV}",
 *       fetched via the MediaWiki action=parse&prop=wikitext API. The running
 *       text there is the Leonine edition (classical orthography). Supplies:
 *         I q. 72 (whole question, single article)
 *         I q. 2 a. 1 · I q. 57 a. 4 · I q. 84 a. 2
 *   - raw/lacunae-corpusthomisticum.json
 *       corpusthomisticum.org quaestio pages (Textum Leoninum Romae 1888/1899,
 *       rec. E. Alarcón). Supplies:
 *         II-II q. 143 (whole question, single article)
 *         I-II q. 42 a. 2 · I-II q. 104 a. 2 · II-II q. 57 a. 3 · II-II q. 137 a. 2
 *         III q. 2 a. 6 · III q. 7 a. 9 · III q. 15 a. 9 · III q. 56 a. 1
 *
 * The Latin text of the Summa is itself public domain. The Wikisource
 * transcription is CC BY-SA 4.0; the corpusthomisticum digital edition is
 * © Fundación Tomás de Aquino — only its verbatim public-domain Leonine text is
 * reused here, not its markup or apparatus.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from './normalize.ts';
import type { PartCode, WitnessId } from '../../data/summa/types.ts';

export type { WitnessId } from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

/** Human-readable edition/URL string per witness, cited on the Summa About page. */
export const WITNESS_LABEL: Record<WitnessId, string> = {
  'wikisource-la':
    'Latin Wikisource, "Summa Theologiae / Prima pars" (Leonine text; CC BY-SA 4.0), retrieved via the MediaWiki action=parse API',
  corpusthomisticum:
    'corpusthomisticum.org — Textum Leoninum (Romae 1888 / 1899) recognovit E. Alarcón (public-domain Leonine text)',
  'marietti-1931':
    'S. Thomae Aquinatis Summa Theologica, editio Marietti (Taurini, 1926/1931), Supplementum Tertiae Partis — public domain; digital transcription via github.com/pantaleonfassbender-coder/Aquinas-summa (data CC0)',
  'roman-1894':
    'S. Thomae Aquinatis Summa Theologica, Editio altera Romana, vol. V: Tertiae Partis Supplementum (Romae, ex Typographia Forzani et S., 1894) — public domain; scan Internet Archive id divithomaeaquina0005thom',
};

export interface FilledArticle {
  code: PartCode;
  q: number;
  /** null => the question has a single, unnumbered ("a. un.") article */
  a: number | null;
  witness: WitnessId;
  objections: { number: number; text: string }[];
  sedContra: { number: number; text: string }[];
  respondeo: string | null;
  replies: { objectionNumber: number | null; text: string }[];
}

export interface FilledQuestion {
  code: PartCode;
  q: number;
  witness: WitnessId;
  /** question-level prooemium if the witness carries one distinctly, else null */
  prooemium: string | null;
  articles: FilledArticle[];
}

export interface LacunaePatch {
  /** brand-new questions absent from the base source (I q. 72, II-II q. 143) */
  newQuestions: FilledQuestion[];
  /** single articles to splice into an otherwise-present question */
  newArticles: FilledArticle[];
}

/* ------------------------------------------------------------------ *
 *  HTML / entity helpers (corpusthomisticum pages are ISO-8859-1 HTML)
 * ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ordf: 'ª',
  ordm: 'º',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  Aacute: 'Á',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  deg: '°',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === '#') {
      const cp =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)
      ? NAMED_ENTITIES[body]
      : m;
  });
}

/** Strip all tags, decode entities, collapse whitespace. */
function htmlToText(html: string): string {
  const noTags = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  return cleanText(decodeEntities(noTags));
}

/* ------------------------------------------------------------------ *
 *  Lemma reference parsing (shared shape between both witnesses)
 * ------------------------------------------------------------------ */

type LemmaKind =
  | { kind: 'q-pr' }
  | { kind: 'a-pr'; a: number | null }
  | { kind: 'arg'; a: number | null; index: number }
  | { kind: 'sc'; a: number | null; index: number }
  | { kind: 'co'; a: number | null }
  | { kind: 'ad'; a: number | null; index: number | null };

/**
 * Parse the tail of a lemma reference, e.g. `"a. 3 arg. 2"`, `"s. c."`,
 * `"co."`, `"ad 1"`, `"ad arg."`, `"pr."` (article number optional).
 */
function parseLemmaTail(tail: string): LemmaKind | null {
  const t = tail.trim().replace(/\s+/g, ' ');
  const am = /^a\.\s*(\d+)\s*/.exec(t);
  const a = am ? Number.parseInt(am[1], 10) : null;
  const rest = am ? t.slice(am[0].length).trim() : t;

  if (/^pr\.?$/.test(rest)) return am ? { kind: 'a-pr', a } : { kind: 'q-pr' };
  let m: RegExpExecArray | null;
  if ((m = /^arg\.\s*(\d+)/.exec(rest))) return { kind: 'arg', a, index: Number.parseInt(m[1], 10) };
  if (/^s\.\s*c\.?/.test(rest) || /^sed contra/i.test(rest)) return { kind: 'sc', a, index: 1 };
  if (/^co\.?$/.test(rest)) return { kind: 'co', a };
  if (/^ad\s+arg\.?$/.test(rest)) return { kind: 'ad', a, index: null };
  if ((m = /^ad\s+(\d+)/.exec(rest))) return { kind: 'ad', a, index: Number.parseInt(m[1], 10) };
  return null;
}

interface RawLemma {
  q: number;
  kind: LemmaKind;
  text: string;
}

/* ------------------------------------------------------------------ *
 *  Assemble a set of raw lemmas for one question into article records
 * ------------------------------------------------------------------ */

function assembleQuestion(
  code: PartCode,
  q: number,
  witness: WitnessId,
  lemmas: RawLemma[],
): FilledQuestion {
  let prooemium: string | null = null;
  // key: article number, or -1 for the unnumbered single article
  const UNNUM = -1;
  const buckets = new Map<
    number,
    {
      arg: { number: number; text: string }[];
      sc: { number: number; text: string }[];
      co: string[];
      ad: { objectionNumber: number | null; text: string }[];
    }
  >();
  const bucket = (a: number | null) => {
    const key = a ?? UNNUM;
    let b = buckets.get(key);
    if (!b) {
      b = { arg: [], sc: [], co: [], ad: [] };
      buckets.set(key, b);
    }
    return b;
  };

  for (const l of lemmas) {
    switch (l.kind.kind) {
      case 'q-pr':
        prooemium = prooemium ? `${prooemium} ${l.text}` : l.text;
        break;
      case 'a-pr':
        // article-level prooemium: fold into the article's respondeo-less prose is wrong;
        // the Leonine prints it as the lead-in of arg. 1. Attach nothing here — the
        // witnesses used never emit a bare a-pr for the target articles.
        break;
      case 'arg':
        bucket(l.kind.a).arg.push({ number: l.kind.index, text: l.text });
        break;
      case 'sc':
        bucket(l.kind.a).sc.push({ number: l.kind.index, text: l.text });
        break;
      case 'co':
        bucket(l.kind.a).co.push(l.text);
        break;
      case 'ad':
        bucket(l.kind.a).ad.push({ objectionNumber: l.kind.index, text: l.text });
        break;
    }
  }

  const articles: FilledArticle[] = [...buckets.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([key, b]) => ({
      code,
      q,
      a: key === UNNUM ? null : key,
      witness,
      objections: b.arg.sort((m, n) => m.number - n.number),
      sedContra: b.sc.sort((m, n) => m.number - n.number),
      respondeo: b.co.length ? b.co.join(' ') : null,
      replies: b.ad,
    }));

  return { code, q, witness, prooemium, articles };
}

/* ------------------------------------------------------------------ *
 *  Witness 1 — Latin Wikisource (Prima Pars)
 * ------------------------------------------------------------------ */

const WS_PAGE_Q: Record<string, number> = {
  'Summa Theologiae/Prima pars/Quaestio LXXII': 72,
  'Summa Theologiae/Prima pars/Quaestio II': 2,
  'Summa Theologiae/Prima pars/Quaestio LVII': 57,
  'Summa Theologiae/Prima pars/Quaestio LXXXIV': 84,
};

// FORMAT A (older pages, e.g. Quaestio LXXII): every paragraph carries an inline
// lemma lead-in, e.g. "Iª q. 72 arg. 1 " or "Iª q. 2 a. 1 s. c. ".
const WS_LEMMA_RE =
  /^I(?:ª|a)\s+q\.\s*(\d+)\s+((?:a\.\s*\d+\s+)?(?:arg\.\s*\d+|s\.\s*c\.|co\.|ad\s+\d+|ad\s+arg\.|pr\.))\s+/;

// FORMAT B (newer pages, e.g. Quaestio II): "===Articulus N===" headings, then
// bare-numbered objections ("1 Ad primum sic proceditur. ...", "2 Praeterea, ..."),
// then unprefixed "Sed contra ...", "Respondeo ...", "Ad primum ergo dicendum ...".
const REPLY_ORDINALS: Record<string, number> = {
  primum: 1, secundum: 2, tertium: 3, quartum: 4, quintum: 5, sextum: 6,
  septimum: 7, octavum: 8, nonum: 9, decimum: 10, undecimum: 11, duodecimum: 12,
};

function wikiStrip(wikitext: string): string {
  let body = wikitext;
  body = body.replace(/^[\s\S]*?<div class=text>/i, '');
  body = body.replace(/<\/div>\s*\{\{finis\}\}[\s\S]*$/i, '');
  body = body.replace(/\{\{Liber[\s\S]*?\}\}/gi, '');
  body = body.replace(/\{\{[^{}]*\}\}/g, '');
  body = body.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2');
  body = body.replace(/'''?/g, '');
  return body;
}

/**
 * Parse one Wikisource quaestio page. The pages come in two shapes and some mix
 * both, so classification is per paragraph:
 *   (1) an inline lemma lead-in "Iª q. N [a. M ]TYPE [K]" (wins outright), or
 *   (2) bare-numbered objection "N Ad primum sic proceditur ...", "Sed contra ...",
 *       "Respondeo ...", "Ad primum ergo dicendum ..." under a "===Articulus N==="
 *       heading (the heading tracks the current article number).
 */
function parseWsPage(page: string, qNum: number, body: string): FilledQuestion {
  body = body.replace(/^\s*Quaestio\s+\d+\s*$/gim, '');
  // Split keeping the "Articulus N" markers so we can track the current article.
  const segs = body.split(/\n=+\s*Articulus\s+([0-9]+|unicus)\s*=+\n/i);
  const lemmas: RawLemma[] = [];
  let currentA: number | null = null;
  let hadArticulusHeading = false;

  const handleChunk = (chunk: string, isPreamble: boolean): void => {
    const paras = chunk
      .split(/\n\s*\n/)
      .map((p) => p.replace(/=+\s*[^=]*?\s*=+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    for (const p of paras) {
      if (/^Quaestio\s+\d+$/i.test(p)) continue;

      // (1) inline lemma lead-in
      const im = WS_LEMMA_RE.exec(p);
      if (im) {
        const kind = parseLemmaTail(im[2]);
        if (!kind) throw new Error(`wikisource ${page}: bad lemma tail ${JSON.stringify(im[2])}`);
        lemmas.push({ q: qNum, kind, text: cleanText(p.slice(im[0].length)) });
        continue;
      }

      // A non-lemma paragraph in the pre-first-article segment is the question
      // prooemium (only needed as context; article-fills ignore it).
      if (isPreamble) {
        lemmas.push({ q: qNum, kind: { kind: 'q-pr' }, text: cleanText(p) });
        continue;
      }

      // (2) heading-tracked bare paragraphs
      const a = hadArticulusHeading ? currentA : null;
      let m: RegExpExecArray | null;
      if ((m = /^(\d+)\s+(.*)$/.exec(p))) {
        lemmas.push({ q: qNum, kind: { kind: 'arg', a, index: Number.parseInt(m[1], 10) }, text: cleanText(m[2]) });
      } else if (/^Sed contra\b/i.test(p) || /^In contrarium\b/i.test(p)) {
        lemmas.push({ q: qNum, kind: { kind: 'sc', a, index: 1 }, text: cleanText(p) });
      } else if (/^Respondeo\b/i.test(p)) {
        lemmas.push({ q: qNum, kind: { kind: 'co', a }, text: cleanText(p) });
      } else if ((m = /^Ad\s+([a-z]+)\s+(?:ergo\s+|autem\s+)?dicendum\b/i.exec(p))) {
        lemmas.push({ q: qNum, kind: { kind: 'ad', a, index: REPLY_ORDINALS[m[1].toLowerCase()] ?? null }, text: cleanText(p) });
      } else if (/^Ad (primum|secundum|tertium|quartum|quintum)[^.]{0,40}\bet\b/i.test(p) || /^Ad ea quae/i.test(p)) {
        lemmas.push({ q: qNum, kind: { kind: 'ad', a, index: null }, text: cleanText(p) });
      } else {
        throw new Error(`wikisource ${page} a.${a}: unparsed paragraph: ${p.slice(0, 100)}`);
      }
    }
  };

  // segs[0] is the preamble ONLY when the page actually uses Articulus headings;
  // on inline-only pages (e.g. q. 72) every real paragraph is a lemma.
  const inlineOnly = segs.length === 1;
  handleChunk(segs[0], !inlineOnly);
  for (let i = 1; i < segs.length; i += 2) {
    hadArticulusHeading = true;
    const tok = segs[i].trim().toLowerCase();
    currentA = tok === 'unicus' ? null : Number.parseInt(tok, 10);
    handleChunk(segs[i + 1] ?? '', false);
  }
  return assembleQuestion('I', qNum, 'wikisource-la', lemmas);
}

function parseWikisource(): { questions: Map<number, FilledQuestion> } {
  const raw = JSON.parse(
    readFileSync(join(RAW_DIR, 'lacunae-wikisource-prima-pars.json'), 'utf8'),
  ) as Record<string, string>;

  const out = new Map<number, FilledQuestion>();
  for (const [page, qNum] of Object.entries(WS_PAGE_Q)) {
    const wikitext = raw[page];
    if (typeof wikitext !== 'string') throw new Error(`wikisource: missing page ${page}`);
    out.set(qNum, parseWsPage(page, qNum, wikiStrip(wikitext)));
  }
  return { questions: out };
}

/* ------------------------------------------------------------------ *
 *  Witness 2 — corpusthomisticum.org quaestio pages
 * ------------------------------------------------------------------ */

interface CtRawEntry {
  covers: string;
  status: number;
  html: string;
}

// TITLE attr, e.g. `II-II q. 143 arg. 1`, `III q. 2 a. 6 ad 3`, `I-II q. 42 a. 2 co.`
const CT_TITLE_RE =
  /^(I-II|II-II|III|I)\s+q\.\s*(\d+)\s+(.*)$/;

function parseCt(): { questions: Map<string, FilledQuestion> } {
  const raw = JSON.parse(
    readFileSync(join(RAW_DIR, 'lacunae-corpusthomisticum.json'), 'utf8'),
  ) as Record<string, CtRawEntry>;

  // group P-blocks by "code q" key
  const byQ = new Map<string, { code: PartCode; q: number; lemmas: RawLemma[] }>();

  for (const entry of Object.values(raw)) {
    if (entry.status !== 200) throw new Error(`corpusthomisticum: page status ${entry.status}`);
    const html = entry.html;
    const re = /<P\s+TITLE="([^"]+)"[^>]*>([\s\S]*?)<\/P>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const title = decodeEntities(m[1]).trim();
      const tm = CT_TITLE_RE.exec(title);
      if (!tm) continue;
      const code = tm[1] as PartCode;
      const q = Number.parseInt(tm[2], 10);
      const kind = parseLemmaTail(tm[3]);
      if (!kind) continue;
      // inner text: drop the leading <A NAME><SPAN class="ref">[id] ref </SPAN></A>
      let inner = m[2];
      inner = inner.replace(/<A\s+NAME="[^"]*">[\s\S]*?<\/A>/i, '');
      inner = inner.replace(/<SPAN\s+CLASS="ref">[\s\S]*?<\/SPAN>/i, '');
      const text = htmlToText(inner);
      if (!text) continue;
      const key = `${code} ${q}`;
      let g = byQ.get(key);
      if (!g) {
        g = { code, q, lemmas: [] };
        byQ.set(key, g);
      }
      g.lemmas.push({ q, kind, text });
    }
  }

  const out = new Map<string, FilledQuestion>();
  for (const [key, g] of byQ) {
    out.set(key, assembleQuestion(g.code, g.q, 'corpusthomisticum', g.lemmas));
  }
  return { questions: out };
}

/* ------------------------------------------------------------------ *
 *  Public: build the patch for exactly the thirteen known lacunae
 * ------------------------------------------------------------------ */

/** The thirteen citations we are filling — used to slice the witnesses and to assert. */
export const LACUNAE = {
  newQuestions: [
    { code: 'I' as PartCode, q: 72 },
    { code: 'II-II' as PartCode, q: 143 },
  ],
  newArticles: [
    { code: 'I' as PartCode, q: 2, a: 1 },
    { code: 'I' as PartCode, q: 57, a: 4 },
    { code: 'I' as PartCode, q: 84, a: 2 },
    { code: 'I-II' as PartCode, q: 42, a: 2 },
    { code: 'I-II' as PartCode, q: 104, a: 2 },
    { code: 'II-II' as PartCode, q: 57, a: 3 },
    { code: 'II-II' as PartCode, q: 137, a: 2 },
    { code: 'III' as PartCode, q: 2, a: 6 },
    { code: 'III' as PartCode, q: 7, a: 9 },
    { code: 'III' as PartCode, q: 15, a: 9 },
    { code: 'III' as PartCode, q: 56, a: 1 },
  ],
} as const;

export function buildLacunae(): LacunaePatch {
  const ws = parseWikisource();
  const ct = parseCt();

  const newQuestions: FilledQuestion[] = [];
  const newArticles: FilledArticle[] = [];

  // --- new whole questions ---
  // I q. 72 from Wikisource; II-II q. 143 from corpusthomisticum
  const q72 = ws.questions.get(72);
  if (!q72 || q72.articles.length !== 1 || q72.articles[0].a !== null) {
    throw new Error('lacunae: I q. 72 did not resolve to a single unnumbered article');
  }
  newQuestions.push(q72);

  const q143 = ct.questions.get('II-II 143');
  if (!q143 || q143.articles.length !== 1 || q143.articles[0].a !== null) {
    throw new Error('lacunae: II-II q. 143 did not resolve to a single unnumbered article');
  }
  newQuestions.push(q143);

  // --- individual articles ---
  for (const want of LACUNAE.newArticles) {
    const src =
      want.code === 'I'
        ? ws.questions.get(want.q)
        : ct.questions.get(`${want.code} ${want.q}`);
    if (!src) throw new Error(`lacunae: no witness question for ${want.code} q. ${want.q}`);
    const art = src.articles.find((a) => a.a === want.a);
    if (!art) {
      throw new Error(`lacunae: witness has no ${want.code} q. ${want.q} a. ${want.a}`);
    }
    if (art.objections.length === 0 && art.sedContra.length === 0 && art.respondeo == null) {
      throw new Error(`lacunae: ${want.code} q. ${want.q} a. ${want.a} came back empty`);
    }
    newArticles.push(art);
  }

  return { newQuestions, newArticles };
}
