// Second pass over detectParagraphs.mjs's own output: turns each page's
// candidate paragraph-start LINE INDICES (raw/paragraph-detect-manifest.json)
// into the short verbatim MARKER strings index.ts and validate.ts actually
// use (raw/paragraph-starts/pNNN.json), applying that page's own
// raw/corrections/pNNN.json first so every marker matches the corrected text
// those two scripts search.
//
// Two classes of geometric false positive are filtered out here, not by
// detectParagraphs.mjs itself, because both need the corrected TEXT, not
// just word coordinates, to recognise:
//
//  1. Quoted-verse / bracketed-argument block lines. This edition sets both
//     the chapter argument and quoted foreign verse as a hanging-indent
//     block - EVERY line of the block sits right of the body's left edge,
//     not just its first line, so detectParagraphs.mjs's purely geometric
//     pass (correctly) flags every line of such a block, not only genuine
//     paragraph starts. A verse block's own first line starts with an
//     opening quote mark in this edition without exception (checked by eye
//     across every quoted example read during this import) and is excluded
//     on that basis.
//  2. A block's CONTINUATION lines (verse or argument) that are not
//     genuine sentence starts: unlike prose, where only a paragraph's own
//     first line is indented and it is *always* capitalised (English
//     sentence-initial), a hanging-indent block's second and later lines
//     continue mid-sentence or even mid-word (hyphenated wraps within the
//     block) and are not capitalised. Filtered here by requiring the first
//     letter of the candidate line to be upper-case; a genuine paragraph
//     never begins with a lower-case letter, hyphenated-word fragments
//     ("...il-" / "lustrious...") that a purely geometric pass cannot tell
//     from a real indent invariably do.
//
//   node scripts/import-dante/de-vulgari-en/raw/generateParagraphMarkers.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'paragraph-starts');
mkdirSync(OUT_DIR, { recursive: true });

function applyCorrections(page, text) {
  const file = join(HERE, 'corrections', `p${String(page).padStart(3, '0')}.json`);
  if (!existsSync(file)) return text;
  const corrections = JSON.parse(readFileSync(file, 'utf8'));
  let t = text;
  for (const c of corrections) {
    const idx = t.indexOf(c.find);
    if (idx === -1) continue; // index.ts itself STOPs on a genuine mismatch; this pass only needs the text, not the guarantee
    t = t.slice(0, idx) + c.replace + t.slice(idx + c.find.length);
  }
  return t;
}

const QUOTE_CHARS = new Set(["'", '‘', '’', '"', '“', '”']);

const manifest = JSON.parse(readFileSync(join(HERE, 'paragraph-detect-manifest.json'), 'utf8'));
let kept = 0;
let droppedQuote = 0;
let droppedLowercase = 0;
let droppedEmpty = 0;
let droppedShort = 0;
let droppedBracketRef = 0;
const outManifest = [];
for (const p of manifest) {
  const outFile = join(OUT_DIR, `p${String(p.page).padStart(3, '0')}.json`);
  if (p.count === 0) {
    writeFileSync(outFile, '[]');
    outManifest.push({ page: p.page, kept: 0 });
    continue;
  }
  const raw = readFileSync(join(HERE, 'ocr', `p${String(p.page).padStart(3, '0')}.txt`), 'utf8');
  const corrected = applyCorrections(p.page, raw);
  const lines = corrected.split('\n');
  const entries = [];
  for (const li of p.lines) {
    const line = (lines[li] || '').trim();
    if (!line) {
      droppedEmpty++;
      continue;
    }
    const first = line[0];
    if (QUOTE_CHARS.has(first)) {
      droppedQuote++;
      continue;
    }
    if (first === first.toLowerCase() && first !== first.toUpperCase()) {
      droppedLowercase++;
      continue;
    }
    // "[70] Wherefore ..." / "[70] their dispersion." - an inline decade line-reference (bracket+digits) that
    // happens to open a physical print line is never a genuine paragraph start (only the bracketed chapter
    // ARGUMENT starts with "[", and always with a letter next, e.g. "[The author..."); a bracket followed by a
    // digit is filtered here (one such marker cut a sentence in half at exactly its own "[70]").
    if (first === '[' && /^\[\d/.test(line)) {
      droppedBracketRef++;
      continue;
    }
    const words = line.split(/\s+/).filter(Boolean);
    const marker = words.slice(0, 6).join(' ');
    // A marker under ~20 characters / fewer than 3 words is not just unreliable, it is actively dangerous: plain
    // indexOf() has no word-boundary sense, so a short marker (a lone decorative drop-cap letter OCR'd onto its
    // own geometric line elsewhere in the book, e.g. a stray "C" or "H") can match INSIDE an unrelated word
    // anywhere in the whole corpus and silently cut it in half (caught here after one such split landed inside
    // "SPEECH" itself, from single-letter markers picked up on two other pages).
    if (marker.length < 20 || words.length < 3) {
      droppedShort++;
      continue;
    }
    entries.push({ line: li, marker });
  }
  writeFileSync(outFile, JSON.stringify(entries, null, 1));
  kept += entries.length;
  outManifest.push({ page: p.page, kept: entries.length });
}

writeFileSync(join(HERE, 'paragraph-markers-manifest.json'), JSON.stringify(outManifest, null, 1));
console.log(
  `kept ${kept} paragraph-start markers; dropped ${droppedQuote} quote-block-start, ${droppedLowercase} lower-case (block-continuation), ${droppedShort} too-short (<20 chars/<3 words), ${droppedBracketRef} bracket-digit line-reference, ${droppedEmpty} empty`,
);
