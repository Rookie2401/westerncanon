// One-time extraction helper for the De Vulgari Eloquentia (EN) import.
// Parses translationoflat00dantuoft_djvu.xml's per-leaf HIDDENTEXT OCR layer
// into per-printed-page plain-text files (raw/ocr/pNNN.txt), the same role
// monarchia-la/raw/extractPages.mjs + oxford-pages.json play for that lane.
// Not run at build/run time by index.ts.
//
// Two things this book's OCR needs that a straight LINE-join does not solve:
//
// 1. RUNNING HEADER. Line 0 of every leaf's HIDDENTEXT is the printed running
//    head - "<page#> DE VULGARI ELOQUENTIA CH." on verso pages, "<roman>.
//    THE FIRST|SECOND BOOK <page#>" on recto pages (both book text and
//    Notes pages use the same recto header). Detected by substring, not
//    position, and dropped here (not part of Dante's/Howell's reading text).
//
// 2. MARGIN SHOULDER-CAPTIONS. This edition prints a short bold running
//    subject-caption in the OUTER margin beside the opening lines of most
//    paragraphs (e.g. "The subject defined", "Neither angels nor brutes
//    speak") - left margin on verso pages, right margin on recto pages
//    (classic outer-margin placement). ABBYY's OCR does not separate these
//    into their own region: their words land at the start (verso) or end
//    (recto) of the ordinary body LINE they sit beside, corrupting the
//    sentence ("The But because the business..."). These are editorial
//    navigation aids, not Dante's or Howell's running prose (same footnote-
//    like apparatus-exclusion policy as this batch's other lanes), and are
//    stripped here by a coordinate rule: for each page, the median left edge
//    of body lines (>=6 words, excluding line 0) and median right edge are
//    computed; any leading words left of (median-left - MARGIN) or trailing
//    words right of (median-right + MARGIN) are shoulder-caption debris and
//    are removed (counted, not silently dropped - see captionWordsRemoved
//    below, surfaced in anomalies.json by index.ts).
//
// Geometric trimming is a first pass, not the final word: every page is
// still proofread by hand against its page image (raw/images-by-page/
// pNNN.jpg) and corrected via raw/corrections/pNNN.json, which can restore
// any body word this trims too aggressively at a column edge.
//
//   node scripts/import-dante/de-vulgari-en/raw/extractPages.mjs <xml> <outDir> <minLeaf> <maxLeaf> <leafToPageOffset>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const [, , XML, OUT_DIR, MIN_LEAF, MAX_LEAF, OFFSET] = process.argv;
const minLeaf = Number(MIN_LEAF);
const maxLeaf = Number(MAX_LEAF);
const offset = Number(OFFSET); // printed page = leaf - offset

const MARGIN = 60; // px tolerance beyond the median body edge before a word counts as caption debris

// Position-based (not spelling-based) detection: this scan's OCR garbles the
// header's own words unpredictably ("ELOQUHNTIA", "VOLGARI", "SHCOND",
// "SECONt BOO.^" have all been observed), so matching by exact substring is
// unreliable. Instead: a VERSO running head is "<page#> <Title text>" - digit(s)
// then a space then a capital letter, with NO period after the number (unlike
// a Notes entry, e.g. "12. Text..."); a RECTO running head is "<roman
// numeral>. <Title text> <page#>" - starts with a roman numeral + period,
// ends with digits. A handful of substring fallbacks are kept too.
const HEADER_MARKERS = [/VULGARI ELOQUENTIA/i, /FIRST BOOK/i, /SECOND BOOK/i, /\bAPPENDIX\b/i];
const VERSO_HEADER_RE = /^\d{1,3}\s+[A-Z]/;
const RECTO_HEADER_RE = /^[IVXLCDM]{1,4}\.\s.*\d{1,3}$/;

function isHeaderLine(text) {
  return HEADER_MARKERS.some((re) => re.test(text)) || VERSO_HEADER_RE.test(text) || RECTO_HEADER_RE.test(text);
}

// A handful of running heads are so heavily OCR-garbled that even the roman
// numeral itself misreads as a non-roman character (e.g. p.79's "IV." comes
// through as "tV."), so no pattern can catch them positionally. Confirmed by
// eye against the page image (raw/images-by-page/p079.jpg: "IV. THE SECOND
// BOOK 79") and forced here.
const FORCE_HEADER_PAGES = new Set([79]);

const xml = readFileSync(XML, 'utf8');
const dom = new JSDOM(xml, { contentType: 'text/xml' });
const doc = dom.window.document;
const objects = [...doc.querySelectorAll('OBJECT')];

mkdirSync(join(OUT_DIR, 'ocr'), { recursive: true });

const manifest = [];
for (let leaf = minLeaf; leaf <= maxLeaf; leaf++) {
  const obj = objects[leaf - 1];
  const page = leaf - offset;
  if (!obj) {
    manifest.push({ leaf, page, missing: true });
    continue;
  }
  const lineEls = [...obj.querySelectorAll('LINE')];
  const lineData = lineEls.map((line) =>
    [...line.querySelectorAll('WORD')].map((w) => {
      const c = (w.getAttribute('coords') || '').split(',').map(Number);
      return { text: w.textContent.trim(), x1: c[0], x2: c[2] };
    }),
  );

  // Detect + drop the header line: normally line 0, but be defensive and
  // scan the first 2 lines in case a blank/empty line precedes it.
  let bodyStart = 0;
  let headerText = '';
  for (let i = 0; i < Math.min(2, lineData.length); i++) {
    const text = lineData[i].map((w) => w.text).join(' ');
    if (isHeaderLine(text) || (i === 0 && FORCE_HEADER_PAGES.has(page))) {
      headerText = text || '(forced)';
      bodyStart = i + 1;
      break;
    }
  }

  const bodyLineData = lineData.slice(bodyStart);
  const candidates = bodyLineData.filter((w) => w.length >= 6);
  const firstXs = candidates.map((w) => w[0].x1).sort((a, b) => a - b);
  const lastXs = candidates.map((w) => w[w.length - 1].x2).sort((a, b) => a - b);
  const median = (arr) => (arr.length ? arr[Math.floor(arr.length / 2)] : null);
  const bodyLeft = median(firstXs);
  const bodyRight = median(lastXs);

  let captionWordsRemoved = 0;
  const captionSample = [];
  const bodyLines = bodyLineData.map((words) => {
    if (bodyLeft === null || bodyRight === null) return words.map((w) => w.text).join(' ');
    let start = 0;
    let end = words.length;
    while (start < end && words[start].x2 < bodyLeft - MARGIN) {
      captionSample.push(words[start].text);
      captionWordsRemoved++;
      start++;
    }
    while (end > start && words[end - 1].x1 > bodyRight + MARGIN) {
      captionSample.push(words[end - 1].text);
      captionWordsRemoved++;
      end--;
    }
    return words
      .slice(start, end)
      .map((w) => w.text)
      .join(' ');
  });

  const bodyText = bodyLines.join('\n');
  writeFileSync(join(OUT_DIR, 'ocr', `p${String(page).padStart(3, '0')}.txt`), bodyText, 'utf8');
  manifest.push({
    leaf,
    page,
    headerText,
    bodyLeft,
    bodyRight,
    captionWordsRemoved,
    captionSample: captionSample.slice(0, 8),
  });
}

writeFileSync(join(OUT_DIR, 'extract-manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
console.log('wrote', manifest.length, 'pages to', join(OUT_DIR, 'ocr'));
console.log('total caption words removed:', manifest.reduce((s, m) => s + (m.captionWordsRemoved || 0), 0));
const noHeader = manifest.filter((m) => !m.missing && !m.headerText);
console.log('pages with NO header line matched (check manually):', noHeader.map((m) => m.page).join(','));
