// One-time paragraph-boundary detection for the De Vulgari Eloquentia (EN)
// import: this edition marks a new printed paragraph only by first-line
// indentation (never a blank line), so paragraph breaks are not visible in
// the plain-text raw/ocr/pNNN.txt files at all and must be recovered from
// the same page-image word coordinates extractPages.mjs already uses for
// margin-caption trimming.
//
// For each page: replicate extractPages.mjs's own header-strip and
// caption-trim (so line indices line up exactly with raw/ocr/pNNN.txt), then
// for each remaining body line, compare the FIRST REMAINING word's left
// x-coordinate to that page's median body-left edge (the same bodyLeft
// already computed for caption trimming). A line indented well beyond that
// median (INDENT_THRESHOLD px) is a paragraph's first line - confirmed
// against a calibration sample (p.31/leaf50, "We, however, decline...":
// bodyLeft ~110-113px, that line's first word at x1=176px, +~65px) and
// spot-checked against further page images during this pass.
//
//   node scripts/import-dante/de-vulgari-en/raw/detectParagraphs.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const XML = join(HERE, 'translationoflat00dantuoft_djvu.xml');
const OUT_DIR = join(HERE, 'paragraph-starts');
const MIN_LEAF = 20;
const MAX_LEAF = 142;
const OFFSET = 19; // printed page = leaf - offset
const MARGIN = 60; // same as extractPages.mjs's caption-trim tolerance
const INDENT_THRESHOLD = 40; // px beyond median bodyLeft to count as a paragraph indent

const HEADER_MARKERS = [/VULGARI ELOQUENTIA/i, /FIRST BOOK/i, /SECOND BOOK/i, /\bAPPENDIX\b/i];
const VERSO_HEADER_RE = /^\d{1,3}\s+[A-Z]/;
const RECTO_HEADER_RE = /^[IVXLCDM]{1,4}\.\s.*\d{1,3}$/;
const FORCE_HEADER_PAGES = new Set([79]);

function isHeaderLine(text) {
  return HEADER_MARKERS.some((re) => re.test(text)) || VERSO_HEADER_RE.test(text) || RECTO_HEADER_RE.test(text);
}

const xml = readFileSync(XML, 'utf8');
const dom = new JSDOM(xml, { contentType: 'text/xml' });
const doc = dom.window.document;
const objects = [...doc.querySelectorAll('OBJECT')];

mkdirSync(OUT_DIR, { recursive: true });

let totalParagraphStarts = 0;
const manifest = [];
for (let leaf = MIN_LEAF; leaf <= MAX_LEAF; leaf++) {
  const obj = objects[leaf - 1];
  const page = leaf - OFFSET;
  if (!obj || page < 1 || page > 115) continue; // only the reading-text pages matter for this pass

  const lineEls = [...obj.querySelectorAll('LINE')];
  const lineData = lineEls.map((line) =>
    [...line.querySelectorAll('WORD')].map((w) => {
      const c = (w.getAttribute('coords') || '').split(',').map(Number);
      return { text: w.textContent.trim(), x1: c[0], x2: c[2] };
    }),
  );

  let bodyStart = 0;
  for (let i = 0; i < Math.min(2, lineData.length); i++) {
    const text = lineData[i].map((w) => w.text).join(' ');
    if (isHeaderLine(text) || (i === 0 && FORCE_HEADER_PAGES.has(page))) {
      bodyStart = i + 1;
      break;
    }
  }
  const bodyLineData = lineData.slice(bodyStart);
  const candidates = bodyLineData.filter((w) => w.length >= 6);
  const firstXs = candidates.map((w) => w[0].x1).sort((a, b) => a - b);
  const median = (arr) => (arr.length ? arr[Math.floor(arr.length / 2)] : null);
  const bodyLeft = median(firstXs);

  const paragraphStarts = [];
  bodyLineData.forEach((words, idx) => {
    if (bodyLeft === null || words.length === 0) return;
    let start = 0;
    const end = words.length;
    while (start < end && words[start].x2 < bodyLeft - MARGIN) start++; // skip leaked caption words (verso-side), mirrors extractPages.mjs
    if (start >= end) return;
    const firstRemaining = words[start];
    if (firstRemaining.x1 - bodyLeft > INDENT_THRESHOLD) paragraphStarts.push({ line: idx, x1: firstRemaining.x1, bodyLeft });
  });

  totalParagraphStarts += paragraphStarts.length;
  writeFileSync(join(OUT_DIR, `p${String(page).padStart(3, '0')}.json`), JSON.stringify(paragraphStarts, null, 1), 'utf8');
  manifest.push({ page, bodyLeft, count: paragraphStarts.length, lines: paragraphStarts.map((p) => p.line) });
}

writeFileSync(join(HERE, 'paragraph-detect-manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
console.log('pages processed:', manifest.length, 'total paragraph-start lines detected:', totalParagraphStarts);
