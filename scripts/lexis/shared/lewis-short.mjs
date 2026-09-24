// Lewis & Short, A Latin Dictionary (Perseus TEI, CC BY-SA 4.0), parsed once from
// scripts/lexis/raw/lat.ls.perseus-eng2.xml (gitignored cache; copied from
// C:\Users\CJWal\dev\vetus-v0\data\lewis-short\lat.ls.perseus-eng2.xml). Adapted from
// C:\Users\CJWal\dev\vetus-v0\scripts\build-lexicon-la.mjs's TEI parsing/renderTei/shortGloss,
// restructured as a lookup module usable per-lemma instead of per-Vulgate-lemma-list, and
// returning EVERY class-matching homograph variant (not just the first) so the caller can zip
// distinct Whitaker dictionary-line homographs against distinct L&S numbered headwords.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafe, sanitizeHtml } from './sanitize-html.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** TEI -> the small safe HTML subset scripts/lexis/shared/sanitize-html.mjs allows. */
export function renderTei(xml) {
  let s = xml;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<orth[^>]*>([\s\S]*?)<\/orth>/g, '<b class="la">$1</b>');
  s = s.replace(/<foreign lang="greek">([\s\S]*?)<\/foreign>/g, '<span class="gr">$1</span>');
  s = s.replace(/<foreign[^>]*>([\s\S]*?)<\/foreign>/g, '<i>$1</i>');
  s = s.replace(/<sense level="1"[^>]*>/g, '<div class="sense">').replace(/<sense[^>]*>/g, '<div>').replace(/<\/sense>/g, '</div>');
  s = s.replace(/<hi rend="ital">([\s\S]*?)<\/hi>/g, '<i>$1</i>');
  s = s.replace(/<cit>([\s\S]*?)<\/cit>/g, '<span class="note">$1</span>');
  s = s.replace(/<quote[^>]*>([\s\S]*?)<\/quote>/g, '<i>$1</i>');
  s = s.replace(/<etym>([\s\S]*?)<\/etym>/g, '<div class="etym">$1</div>');
  s = s.replace(/<(itype|gen|pos|case|usg|number|mood|tns|pers)>([\s\S]*?)<\/\1>/g, '<i>$2</i>');
  s = s.replace(/<bibl[^>]*>[\s\S]*?<\/bibl>/g, '');
  s = s.replace(/<author>[\s\S]*?<\/author>/g, '');
  s = s.replace(/<lb\s*\/>/g, '<br>');
  s = s.replace(/<div[^>]*>/g, (m) => (m.includes('class="sense"') || m.includes('class="etym"') ? m : '<div>'));
  s = s.replace(/<p[^>]*>/g, '<p>');
  const out = sanitizeHtml(s.replace(/\s+/g, ' ').replace(/> </g, '><').trim());
  assertSafe(out, 'Lewis & Short');
  return out;
}

const GRAMMAR_NOTE = /^\(?(gen|dat|abl|acc|nom|voc|plur|sing|absol|trop|poet|lit|meton|prop|[123](st|d|rd)?\s*pers)\.?\b/i;
// coordinator fix batch 1: L&S is now only a GLOSS fallback (kaikki is primary), so a leading-anchor
// regex isn't strict enough — "N. cr", "indic. pres", "part. fut. pass" all slipped through because
// they don't start with one of the old blocklist words. Reject a candidate phrase whenever EVERY
// letter-token it contains is a grammar abbreviation (or under 3 letters): a real gloss like "to
// like" or "a master" always has at least one substantive English word among its tokens.
const GRAMMAR_ABBREV = new Set(['indic', 'perf', 'imperf', 'part', 'pron', 'comp', 'sup', 'gen', 'dat', 'acc', 'nom', 'voc', 'abl', 'n', 'cr', 'fut', 'pass', 'adj', 'subst', 'plur', 'sing', 'absol', 'trop', 'poet', 'lit', 'meton', 'prop', 'adv', 'conj', 'prep', 'interj', 'v', 'a', 'p', 'pl', 's']);
function isGrammarNoteOnly(phrase) {
  const tokens = phrase.toLowerCase().match(/[a-z]+/g);
  if (!tokens || !tokens.length) return true;
  return tokens.every((t) => t.length < 3 || GRAMMAR_ABBREV.has(t));
}
/** The italicised phrase(s) in an entry's first sense are usually the plain-English gloss; a
 * grammar-note-only phrase is filtered out by an inspection-derived abbreviation blocklist. */
export function shortGloss(firstSenseHtml) {
  const phrases = [...firstSenseHtml.matchAll(/<hi rend="ital">([\s\S]*?)<\/hi>/g)]
    .map((m) => unesc(m[1].replace(/<[^>]+>/g, '')).trim())
    .filter((p) => p && !GRAMMAR_NOTE.test(p) && p.length < 80 && !isGrammarNoteOnly(p));
  if (!phrases.length) return '';
  const out = phrases[0].split(';')[0].replace(/^[,.\s]+/, '').replace(/[,.]$/, '').trim();
  return out.length > 3 && !GRAMMAR_NOTE.test(out) && !isGrammarNoteOnly(out) ? out : '';
}

/** All short senses (one per top-level <sense level="1">) in dictionary order, plain text. */
export function shortSenses(body, max = 8) {
  const out = [];
  for (const m of body.matchAll(/<sense level="1"[^>]*>([\s\S]*?)(?=<sense level="1"|$)/g)) {
    const g = shortGloss(`<sense level="1">${m[1]}`);
    if (g) out.push(g);
    if (out.length >= max) break;
  }
  return out;
}

/** The <gen>/genitive-and-gender or principal-parts line L&S prints right after <orth>, as plain
 * text — the "inflection" note the plan asks for. */
export function inflectionNote(body) {
  const head = body.slice(0, 400);
  const parts = [...head.matchAll(/<(gen|itype|pos)>([\s\S]*?)<\/\1>/g)].map((m) => unesc(m[2].replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
  return parts.join(', ') || undefined;
}

function classify(body) {
  const head = body.slice(0, 200);
  const pos = (head.match(/<pos>\s*([a-z.]+)/) ?? [])[1] ?? '';
  if (/^v\b/.test(pos)) return 'verb';
  if (/^adj/.test(pos)) return 'adj';
  if (/^adv/.test(pos)) return 'adv';
  if (/^prep/.test(pos)) return 'prep';
  if (/^conj/.test(pos)) return 'conj';
  if (/^pron/.test(pos)) return 'pron';
  if (/^num/.test(pos)) return 'num';
  if (/<gen>/.test(head)) return 'noun';
  return '';
}

const CONSONANTAL_I = /(^|[aeiouAEIOU])([iI])(?=[aeiouAEIOU])/g;

export function loadLewisShort() {
  const xmlPath = path.join(root, 'scripts', 'lexis', 'raw', 'lat.ls.perseus-eng2.xml');
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const byKey = new Map();
  const byKeyLower = new Map();
  for (const m of xml.matchAll(/<entryFree\s+([^>]*)>([\s\S]*?)<\/entryFree>/g)) {
    const attrs = m[1];
    const keyRaw = (attrs.match(/key="([^"]*)"/) ?? [])[1];
    if (!keyRaw) continue;
    const key = unesc(keyRaw).normalize('NFC');
    const type = (attrs.match(/type="([^"]*)"/) ?? [])[1] ?? '';
    const body = m[2];
    const existing = byKey.get(key);
    if (!existing || (type === 'main' && existing.type !== 'main')) byKey.set(key, { type, body, key });
    const lk = key.toLowerCase();
    const existingLower = byKeyLower.get(lk);
    if (!existingLower || (type === 'main' && existingLower.type !== 'main')) byKeyLower.set(lk, { type, body, key });
  }

  function variantsOf(bare) {
    const out = [];
    const plain = byKey.get(bare) ?? byKeyLower.get(bare.toLowerCase());
    if (plain) out.push(plain);
    for (let n = 1; n <= 9; n++) {
      const hit = byKey.get(bare + n) ?? byKeyLower.get(bare.toLowerCase() + n);
      if (hit) out.push(hit);
    }
    return out;
  }

  /** Every L&S entry matching `lemma` (Whitaker spelling) whose classify() equals `wantClass`, in
   * L&S's own homograph order; falls back to every spelling variant with no class filter if none
   * match the class, then to [] if the headword doesn't exist at all. */
  function lookupAll(lemma, wantClass) {
    const bare = lemma.split('#')[0];
    const jForm = bare.replace(CONSONANTAL_I, (_, pre, i) => pre + (i === 'I' ? 'J' : 'j'));
    const spellings = [bare, jForm];
    if (/\(/.test(bare)) spellings.push(bare.replace(/\(([^)]*)\)/g, '$1'), bare.replace(/\([^)]*\)/g, ''));
    if (/or$/.test(bare)) spellings.push(bare.slice(0, -1), jForm.slice(0, -1));
    if (/i$/.test(bare) && wantClass === 'verb') spellings.push(bare + 'o', jForm + 'o');
    for (const k of spellings) {
      const variants = variantsOf(k);
      if (!variants.length) continue;
      const byClass = wantClass ? variants.filter((v) => classify(v.body) === wantClass) : [];
      return byClass.length ? byClass : variants;
    }
    return [];
  }

  return { lookupAll, classify };
}
