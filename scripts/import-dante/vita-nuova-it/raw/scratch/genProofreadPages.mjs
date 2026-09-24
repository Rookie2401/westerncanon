/**
 * One-off generation helper (NOT part of the shipped importer): builds
 * raw/corrected-text/page307.txt .. page336.txt from the cached wikitext of
 * the already-Wikisource-proofread pages (levels 3/4, confirmed page-image
 * matches during this recovery's manual review - see raw/corrections-log.json),
 * using the same <section begin="sN"/>...<section end="sN"/> tag-walking the
 * shipped index.ts uses for chapters 1-13, so the output format matches the
 * hand-transcribed raw/corrected-text/page337.txt..page408.txt files exactly
 * (one file per djvu page, chapter transitions marked inline with
 * "###CHAPTER-BREAK:N###"). Applies the single word/wikitext-level correction
 * found during manual review (page 329: "echi" -> "e chi", a wikitext/OCR
 * artifact even though the page is Wikisource-proofread level 3). Prose vs
 * verse is distinguished via the source's own <poem>...</poem> tags (see
 * splitVersesAndProse below) so prose paragraphs come out as a single
 * line (print-width wrapping collapsed) while verse keeps its real line
 * breaks, matching the hand-transcribed pages' convention.
 *
 * Run once: node raw/scratch/genProofreadPages.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, '..');
const OUT_DIR = join(RAW_DIR, 'corrected-text');

function stripNoinclude(s) {
  return s.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '');
}
function stripRefs(s) {
  return s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
}
function unwrapWikitext(s) {
  return s
    .replace(/\[\[#[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\{\{AutoreCitato\|[^|}]*\|([^}]*)\}\}/g, '$1')
    .replace(/\{\{TestoCitato\|[^|}]*\|([^}]*?)\s*\}\}/g, '$1') // cited-work title template, e.g. quoting Cavalcanti's reply sonnet by its incipit
    .replace(/\{\{Sc\|([^|}]*)\|?[^}]*\}\}/g, '$1')
    .replace(/''''([^']*)''''/g, '$1')
    .replace(/'''([^']*)'''/g, '$1')
    .replace(/''([^']*)''/g, '$1')
    .replace(/\{\{§\|[^}]*\}\}/g, '')
    .replace(/\{\{R\|[^}]*\}\}/g, '') // proofreading-aid line/chapter-numeral markers printed in the margin, not part of Dante's text; usually <noinclude>-wrapped but not always (e.g. every-5th-verse-line markers within <poem> blocks are not)
    .replace(/<section[^>]*\/?>/g, '');
}
function cleanText(s) {
  return s.replace(/[ \t]+/g, ' ').trim().normalize('NFC');
}
/**
 * Splits raw wikitext for one chapter-segment into an ordered list of
 * {verse, text} blocks: <poem>...</poem> spans keep their internal line
 * breaks (real verse lines, de-indented); everything else is prose, whose
 * *raw* single newlines are print-width line-wrapping artifacts already
 * present in the source wikitext (not real breaks) and are collapsed to a
 * single space, matching the plain single-line-per-paragraph convention
 * used throughout the hand-transcribed raw/corrected-text/page337.txt..
 * page408.txt files.
 */
function splitVersesAndProse(raw) {
  const blocks = [];
  const poemRe = /<poem>\n?([\s\S]*?)\n?<\/poem>/g;
  let lastIndex = 0;
  let m;
  while ((m = poemRe.exec(raw))) {
    for (const para of raw.slice(lastIndex, m.index).split(/\n\s*\n/)) {
      if (para.trim().length > 0) blocks.push({ verse: false, text: para.replace(/\n/g, ' ') });
    }
    const lines = m[1]
      .split('\n')
      .map((l) => l.replace(/^\s+/, '').replace(/\s+$/, ''))
      .filter((l) => l.length > 0);
    if (lines.length > 0) blocks.push({ verse: true, text: lines.join('\n') });
    lastIndex = poemRe.lastIndex;
  }
  for (const para of raw.slice(lastIndex).split(/\n\s*\n/)) {
    if (para.trim().length > 0) blocks.push({ verse: false, text: para.replace(/\n/g, ' ') });
  }
  return blocks;
}

const pages = JSON.parse(readFileSync(join(RAW_DIR, 'pages-307-409.json'), 'utf8'));
const numbered = pages
  .map((p) => {
    const m = /\/(\d+)$/.exec(p.title);
    return { num: Number(m[1]), content: p.content };
  })
  .sort((a, b) => a.num - b.num)
  .filter((p) => p.num >= 307 && p.num <= 336);

// Manual corrections found by viewing the page images, applied to the raw
// wikitext of these Wikisource-"proofread" (level 3/4) pages before parsing.
// Each is a residual OCR error that survived Wikisource's own proofreading:
// the first (page 329 "echi") was caught in the initial page-by-page review,
// the rest by the vocabulary cross-check audit (residualCheck.ts) and then
// individually confirmed against the scan. Every find string must match
// exactly once or this script STOPs, so a silently-missing fix is impossible.
const WIKITEXT_CORRECTIONS = [
  { page: 313, find: 'intendea so non poche', replace: 'intendea se non poche', note: 'scan: "se non poche"' },
  { page: 313, find: 'questa cosa cho in mano', replace: 'questa cosa che in mano', note: 'scan: "che in mano"' },
  { page: 314, find: 'propuosi di faro uno sonetto', replace: 'propuosi di fare uno sonetto', note: 'scan: "fare"' },
  { page: 316, find: 'innanzi comenciò lo mio', replace: 'innanzi cominciò lo mio', note: 'scan: "cominciò"' },
  { page: 318, find: 'componendela, maravigliosamente', replace: 'componendola, maravigliosamente', note: 'scan: "componendola"' },
  { page: 319, find: 'e prego sol eh’audir', replace: 'e prego sol ch’audir', note: 'scan: "ch’audir"' },
  { page: 328, find: 'parea che nr infamasse', replace: 'parea che m’infamasse', note: 'scan: "m’infamasse"' },
  { page: 328, find: 'mi negè lo suo', replace: 'mi negò lo suo', note: 'scan: "negò"' },
  { page: 328, find: 'm’avea nommata', replace: 'm’avea nominata', note: 'scan: "nominata"' },
  { page: 329, find: 'm’avesse offeso; echi allora', replace: 'm’avesse offeso; e chi allora', note: 'scan: two words "e chi"' },
  { page: 329, find: 'd’umiilitade', replace: 'd’umilitade', note: 'scan: "umilitade" (OCR doubled the i)' },
  { page: 330, find: 'lacrimare, misimi', replace: 'lagrimare, misimi', note: 'scan: "lagrimare"' },
  { page: 330, find: 'bianchissime vestimento', replace: 'bianchissime vestimenta', note: 'scan: "vestimenta"' },
  { page: 330, find: 'ov’io giacca', replace: 'ov’io giacea', note: 'scan: "giacea"' },
];
for (const c of WIKITEXT_CORRECTIONS) {
  const p = numbered.find((x) => x.num === c.page);
  if (!p) {
    console.error(`STOP: correction page ${c.page} not in range`);
    process.exit(1);
  }
  const occurrences = p.content.split(c.find).length - 1;
  if (occurrences !== 1) {
    console.error(`STOP: page ${c.page} correction target ${JSON.stringify(c.find)} found ${occurrences} time(s), expected exactly 1`);
    process.exit(1);
  }
  p.content = p.content.replace(c.find, c.replace);
}
process.stdout.write(`applied ${WIKITEXT_CORRECTIONS.length} wikitext-level corrections\n`);

let openChapter = null; // number | null
let lastEmittedChapter = null; // tracks across pages, for correct marker placement

for (const { num, content } of numbered) {
  const body = stripRefs(stripNoinclude(content));
  const tagRe = /<section (begin|end)="([sc])(\d+)"\s*\/>/g;
  let cursor = 0;
  let m;
  // Segments for this page: array of {chapter: number, text: string}
  const segments = [];
  const pushChunk = (chapterNum, raw) => {
    if (chapterNum === null) return;
    if (raw.trim().length === 0) return;
    segments.push({ chapter: chapterNum, raw });
  };
  // NOTE: chunks are gated solely on "are we currently inside an active
  // <section begin="sN"/>...<section end="sN"/> span" (openChapter !== null).
  // A commentary span (cM) is simply ignored here rather than tracked with
  // its own flag, because it can legitimately span a page break while an
  // unrelated main-text span (sN) reopens and closes entirely within that
  // same page break (confirmed on the 329/330 boundary: c12's own
  // <section end="c12"/> doesn't appear until partway through page 330,
  // *after* that page's own bs12/es12 main-text pair) - so a single serial
  // "inCommentary" flag would wrongly swallow page 330's chapter-12
  // continuation as "commentary". openChapter is the sole authoritative
  // signal for main-text content; commentary chunks are automatically
  // excluded because pushChunk() only pushes when a chapter is open.
  while ((m = tagRe.exec(body))) {
    const chunk = body.slice(cursor, m.index);
    cursor = tagRe.lastIndex;
    pushChunk(openChapter, chunk);
    const kind = m[1];
    const letter = m[2];
    const numStr = m[3];
    if (letter === 'c') continue;
    if (kind === 'begin') openChapter = Number(numStr);
    else openChapter = null;
  }
  const tail = body.slice(cursor);
  pushChunk(openChapter, tail);

  // Build this page's file content: walk segments, inserting a
  // ###CHAPTER-BREAK:N### marker whenever the chapter number changes
  // (including the very first segment on the page, if it differs from
  // the chapter open at the start - but we only mark actual transitions,
  // not every page).
  let out = [];
  for (const seg of segments) {
    const blocks = splitVersesAndProse(seg.raw);
    const cleaned = blocks
      .map(({ verse, text }) =>
        verse
          ? text
              .split('\n')
              .map((l) => cleanText(unwrapWikitext(l)))
              .filter((l) => l.length > 0)
              .join('\n')
          : cleanText(unwrapWikitext(text)),
      )
      .filter((t) => t.length > 0)
      .join('\n\n');
    if (cleaned.length === 0) continue;
    if (lastEmittedChapter !== null && seg.chapter !== lastEmittedChapter) {
      out.push(`###CHAPTER-BREAK:${seg.chapter}###`);
    }
    out.push(cleaned);
    lastEmittedChapter = seg.chapter;
  }
  writeFileSync(join(OUT_DIR, `page${num}.txt`), out.join('\n\n') + '\n', 'utf8');
  process.stdout.write(`page ${num}: chapters ${[...new Set(segments.map((s) => s.chapter))].join(',')}\n`);
}
process.stdout.write('done\n');
