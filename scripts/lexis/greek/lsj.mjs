// Parser for the Perseus LSJ TEI files (PerseusDL/lexica, CC BY-SA 4.0, 27 alphabetic chunks
// under scripts/lexis/raw/lsj/). LSJ's own markup is Beta Code for every Greek span (orth,
// foreign lang="greek", quote lang="greek", gen, ref lang="greek") — unlike Lewis & Short, whose
// TEI is plain English/Latin throughout — so unlike vetus-v0's build-lexicon-la.mjs (the pattern
// this file otherwise follows closely), every Greek-bearing tag must be beta-code-converted
// before rendering. LSJ also gives the short gloss directly via <tr> ("translation") tags,
// unlike L&S which has no dedicated gloss tag and has to guess from italics.
import fs from 'node:fs';
import path from 'node:path';
import { betaToUnicode } from './beta-code.mjs';
import { assertSafe, sanitizeHtml } from '../shared/sanitize-html.mjs';

const decodeXmlEntities = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const stripTags = (s) => decodeXmlEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const POS_TAG_MAP = { 'Adv.': 'adv', 'Adj.': 'adj', 'Subst.': 'noun' };

/** Rough word class from an entry's own HEADWORD-LINE markup (everything before its first
 * `<sense>`, capped at 600 chars) — used for picking between numbered homographs and, in
 * build-greek.mjs's fix-batch-1 POS resolution, as a dictionary POS signal. Deliberately scoped
 * to the head, not the whole entry: a huge entry (ὁ's is >170KB) can easily contain a `<pos>` or
 * `<gen>` tag deep inside a discussion of an unrelated homonym or dialect form, which is what an
 * earlier, unscoped version of this function was picking up (confirmed directly: ὁ's `<pos>
 * Subst.</pos>` at character ~23,000 belongs to a parenthetical aside, not ὁ's own word class). */
export function classify(body) {
  const senseIdx = body.search(/<sense[\s>]/);
  const head = (senseIdx >= 0 ? body.slice(0, senseIdx) : body).slice(0, 600);
  const posMatch = head.match(/<pos[^>]*>([^<]*)<\/pos>/);
  if (posMatch && POS_TAG_MAP[posMatch[1]]) return POS_TAG_MAP[posMatch[1]];
  if (/<tns[\s>]/.test(head)) return 'verb';
  if (/<gen[\s>]/.test(head)) return 'noun';
  return null;
}

/** LSJ TEI entry body -> sanitised HTML subset (b/i/em/span/div/p/br/sup), Greek beta-code spans
 * converted to Unicode. Bibliographic apparatus (citations, authors, titles) is dropped, as it is
 * for Lewis & Short in vetus-v0 — keeping senses, translations and italicised grammatical notes. */
export function renderTei(xml) {
  let s = xml;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // bibliographic apparatus: dropped WITH its content (citation refs, author/title/biblScope)
  s = s.replace(/<bibl[^>]*>[\s\S]*?<\/bibl>/g, '');
  s = s.replace(/<\/?(author|title|biblScope|placeName|date|pb)[^>]*\/?>/g, '');
  // Greek beta-code spans -> Unicode, wrapped in the allowed `gr` class. The lang="greek" check
  // is done on the CAPTURED attribute string, not baked into the tag regex's own attribute
  // order, because it isn't fixed — e.g. a <ref> can be `targOrder="U" lang="greek" TEIform=…`,
  // which `<ref lang="greek"[^>]*>` (requiring lang immediately after the tag name) silently
  // missed, leaving a raw Beta-Code variant-reading fragment like "-bei/omen" unconverted in the
  // rendered article (caught in QA on καταβαίνω's "(v.l. -bei/omen)").
  const greekSpan = (tag, cls = 'span') => {
    s = s.replace(new RegExp(`<${tag}(?:\\s+([^>]*))?>([\\s\\S]*?)<\\/${tag}>`, 'g'), (_, attrs, t) =>
      attrs && /lang="greek"/.test(attrs) ? `<${cls} class="gr">${betaToUnicode(decodeXmlEntities(t))}</${cls}>` : `<i>${t}</i>`,
    );
  };
  s = s.replace(/<orth[^>]*>([\s\S]*?)<\/orth>/g, (_, t) => `<b class="gr">${betaToUnicode(decodeXmlEntities(t))}</b>`);
  greekSpan('foreign');
  greekSpan('quote');
  greekSpan('ref');
  s = s.replace(/<gen[^>]*>([\s\S]*?)<\/gen>/g, (_, t) => `<i class="gr">${betaToUnicode(decodeXmlEntities(t))}</i>`);
  // senses and grammatical notes
  s = s.replace(/<sense[^>]*level="1"[^>]*>/g, '<div class="sense">').replace(/<sense[^>]*>/g, '<div>').replace(/<\/sense>/g, '</div>');
  // <etym> ALWAYS carries lang="greek" in practice (an LSJ etymology note citing a related Greek
  // root) but, like foreign/quote/ref above, was matched by a regex requiring no attributes at
  // all (`<etym>` exactly) — never matched the real `<etym lang="greek" opt="n" TEIform="etym">`,
  // so its Beta-Code content fell through unconverted (e.g. βυθάω's "(buqo/s)" instead of
  // "(βυθός)", one of 57 entries with this leak found scanning 800 random headwords in QA).
  s = s.replace(/<etym(?:\s+([^>]*))?>([\s\S]*?)<\/etym>/g, (_, attrs, t) =>
    attrs && /lang="greek"/.test(attrs) ? `<div class="etym">${betaToUnicode(decodeXmlEntities(t))}</div>` : `<div class="etym">${t}</div>`,
  );
  s = s.replace(/<hi[^>]*>([\s\S]*?)<\/hi>/g, '<i>$1</i>');
  // <itype> (inflection type) is sometimes plain English ("indecl.") and sometimes a Greek
  // comparative/inflected form with lang="greek" (πλακώδης: "-wde/steros") — same conditional
  // treatment as foreign/quote/ref/etym, pulled out of the generic English-abbreviation group
  // below which never converted it.
  greekSpan('itype', 'i');
  s = s.replace(/<(tns|pos|gram|mood|number|per|case|abbr)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, '<i>$2</i>');
  s = s.replace(/<cit[^>]*>([\s\S]*?)<\/cit>/g, '<span class="note">$1</span>');
  s = s.replace(/<lb\s*\/>/g, '<br>');
  s = s.replace(/<div[^>]*>/g, (m) => (m.includes('class="sense"') || m.includes('class="etym"') ? m : '<div>'));
  s = s.replace(/<p[^>]*>/g, '<p>');
  return sanitizeHtml(s.replace(/\s+/g, ' ').replace(/> </g, '><').trim());
}

// A handful of entries (measured: 21/116497, mostly common prepositions like ὑπό/ὑπέρ) open
// with a comparative-linguistics aside — "cf. Skt. úpa 'towards, near to', Goth. uf 'under'" —
// whose <tr> tags are foreign cognates, not an English gloss; skipped when immediately preceded
// by one of the abbreviations LSJ actually uses for this (Sanskrit/Gothic/Old High German/Old
// English), rather than surfacing e.g. "úpa" as ὑπό's headline gloss.
const COGNATE_NOTE = /\bSkt\.|\bSkr\.|\bGoth\.|\bOHG\.|\bOE\./;

// LSJ occasionally gives a bare Latin cross-reference as its first <tr> instead of an English
// gloss (e.g. εἰμί's entry opens with "sum", the Latin verb, before any real definition). A
// closed blocklist of the common ones (copula, dico, facio, in their finite/infinitive forms)
// rather than a general "looks Latin" heuristic, which would risk rejecting genuine short
// English glosses ("art", "is", "am" all coincide with real English words).
const LATIN_ECHO = new Set([
  'sum', 'es', 'est', 'sumus', 'estis', 'sunt', 'eram', 'eras', 'erat', 'eramus', 'eratis', 'erant',
  'fui', 'fuisti', 'fuit', 'fuimus', 'fuistis', 'fuerunt', 'esse', 'fore', 'sim', 'sis', 'sit',
  'dico', 'dicis', 'dicit', 'dicere', 'dixi', 'dictum', 'ait', 'aiunt', 'inquit', 'inquam',
  'fio', 'fis', 'fit', 'fieri', 'facio', 'facere', 'feci', 'factum',
]);

/** A candidate <tr> that is almost entirely capitalised abbreviation-with-dot tokens (author
 * sigla, work-title abbreviations: "Spir. Prooem., Eratosth.Prooem.") is a citation fragment
 * caught inside the <tr>, not a gloss — detected generically (no per-word blocklist needed)
 * by how much of the string those tokens cover, since real glosses essentially never look like
 * this even when they mention a proper noun in passing. */
function isCitationLike(t) {
  const matches = [...t.matchAll(/[A-Z][a-zA-Z]*\./g)];
  if (!matches.length) return false;
  const covered = matches.reduce((s, m) => s + m[0].length, 0);
  return covered / t.length > 0.7;
}

/** All `<tr>` (translation) texts in document order, cleaned to plain text, with citation
 * fragments and bare Latin cross-references filtered out (never surfaced as a "gloss", but not
 * worth distinguishing from a legitimately absent <tr> either — see resolveGloss in
 * build-greek.mjs for what happens when every candidate here is filtered away). */
function extractSenses(body) {
  const out = [];
  for (const m of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    if (COGNATE_NOTE.test(body.slice(Math.max(0, m.index - 150), m.index))) continue;
    // LSJ's <tr> text is lifted straight from running prose and often carries a trailing comma
    // or semicolon from the sentence it sat in ("insatiate,"); trimmed for a clean short gloss.
    const t = stripTags(m[1]).replace(/[,;]+\s*$/, '').trim();
    if (!t || t.length < 3) continue;
    if (LATIN_ECHO.has(t.toLowerCase())) continue;
    if (isCitationLike(t)) continue;
    // A <tr> immediately followed by a <bibl> (only whitespace between) AND itself containing
    // an internal (non-initial) capital letter is bibliographic apparatus — a journal/author
    // title — that ended up inside a <tr> tag by a TEI-encoding slip, not a definition
    // (confirmed: θnḗiskō's "Papers of the Amer. School", immediately `</tr>\s*<bibl`, two
    // internal capitals). The internal-capital requirement keeps this from rejecting the very
    // common, perfectly normal "<tr>gloss</tr> <bibl>citation</bibl>" pattern, which is most
    // senses in the dictionary and must not be discarded wholesale.
    if (/[A-Z]/.test(t.slice(1)) && /^\s*<bibl/.test(body.slice(m.index + m[0].length, m.index + m[0].length + 30))) continue;
    out.push(t);
  }
  return out;
}

/** Best-effort grammatical gender for a noun/pronoun/article headword, from LSJ's own <gen>
 * marker (ὁ/ἡ/τό or a combination like "ὁ, ἡ" for common gender) — used only as a soft tie-break
 * prior between otherwise-equal Readings, never to filter or invent a reading. */
export function extractGender(body) {
  const senseIdx = body.search(/<sense[\s>]/);
  const head = senseIdx >= 0 ? body.slice(0, senseIdx) : body.slice(0, 400);
  const m = head.match(/<gen[^>]*>([\s\S]*?)<\/gen>/);
  if (!m) return null;
  const g = betaToUnicode(decodeXmlEntities(m[1])).trim();
  if (g.startsWith('ὁ')) return 'm';
  if (g.startsWith('ἡ')) return 'f';
  if (g.startsWith('τό') || g.startsWith('τό,')) return 'n';
  return null;
}

/** The headword line (everything before the first `<sense`): genitive/gender for nouns,
 * principal parts for verbs, "as LSJ prints it" — plain text, Greek beta-code converted. */
function extractInflection(body) {
  const senseIdx = body.search(/<sense[\s>]/);
  const head = senseIdx >= 0 ? body.slice(0, senseIdx) : '';
  if (!head) return '';
  let s = head.replace(/<bibl[^>]*>[\s\S]*?<\/bibl>/g, '');
  s = s.replace(/<orth[^>]*>([\s\S]*?)<\/orth>/g, (_, t) => betaToUnicode(decodeXmlEntities(t)));
  s = s.replace(/<foreign[^>]*>([\s\S]*?)<\/foreign>/g, (_, t) => betaToUnicode(decodeXmlEntities(t)));
  s = s.replace(/<gen[^>]*>([\s\S]*?)<\/gen>/g, (_, t) => betaToUnicode(decodeXmlEntities(t)));
  s = stripTags(s).replace(/[:,\s]+$/, '').trim();
  return s.length < 300 ? s : s.slice(0, 300);
}

const ENTRY_RE = /<entryFree\s+([^>]*?)>([\s\S]*?)<\/entryFree>/g;
const KEY_RE = /key="([^"]*)"/;
const TYPE_RE = /type="([^"]*)"/;

/** Parse every LSJ file into byBareHeadword: Map<Unicode headword (no homograph digit), Array<{type,body,digit}>>, doc order preserved. */
export function loadLsj(lsjDir) {
  const byBareHeadword = new Map();
  let entryCount = 0;
  for (const file of fs.readdirSync(lsjDir).filter((f) => f.endsWith('.xml'))) {
    const xml = fs.readFileSync(path.join(lsjDir, file), 'utf8');
    for (const m of xml.matchAll(ENTRY_RE)) {
      const attrs = m[1];
      const body = m[2];
      const keyMatch = KEY_RE.exec(attrs);
      if (!keyMatch) continue;
      const rawKey = decodeXmlEntities(keyMatch[1]);
      const digitMatch = rawKey.match(/(\d+)$/);
      const bareBeta = digitMatch ? rawKey.slice(0, -digitMatch[1].length) : rawKey;
      const headword = betaToUnicode(bareBeta).normalize('NFC');
      if (!headword) continue;
      const type = (TYPE_RE.exec(attrs) ?? [])[1] ?? '';
      entryCount++;
      let arr = byBareHeadword.get(headword);
      if (!arr) byBareHeadword.set(headword, (arr = []));
      arr.push({ type, body, digit: digitMatch ? digitMatch[1] : null });
    }
  }
  return { byBareHeadword, entryCount };
}

/** Pick the best entry for (headword, wantPos); prefers a POS-classified match, then type="main",
 * then document order (LSJ's own first-listed sense) — same policy as vetus-v0's Lewis & Short
 * `lookup()`. Returns undefined if the headword isn't in LSJ at all. */
export function pickEntry(byBareHeadword, headword, wantPos) {
  const variants = byBareHeadword.get(headword);
  if (!variants || !variants.length) return undefined;
  if (variants.length > 1 && wantPos) {
    const byClass = variants.find((v) => classify(v.body) === wantPos);
    if (byClass) return byClass;
  }
  const main = variants.find((v) => v.type === 'main');
  return main ?? variants[0];
}

export function entryToLexEntry(entry) {
  const senses = extractSenses(entry.body);
  const html = renderTei(entry.body);
  assertSafe(html, 'LSJ entry');
  return {
    gloss: senses[0] ?? '',
    senses: senses.slice(0, 20),
    html,
    inflection: extractInflection(entry.body) || undefined,
  };
}
