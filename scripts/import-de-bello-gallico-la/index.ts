/**
 * Julius Caesar (Books I-VII) & Aulus Hirtius (Book VIII), De Bello Gallico -
 * Latin text (Thomas Rice Holmes, ed., C. Iuli Commentarii Rerum in Gallia
 * Gestarum VII, A. Hirti Commentarius VIII, Oxford: Clarendon Press, 1914;
 * CTS urn:cts:latinLit:phi0448.phi001.perseus-lat2). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-de-bello-gallico-la/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-de-bello-gallico-la/raw/phi0448.phi001.perseus-lat2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/de-bello-gallico-la/work.json       - the GenericWork (8 Books,
 *                                               each a flat list of Chapter
 *                                               divisions, one Passage each)
 *   data/de-bello-gallico-la/about.json      - provenance / licence / prose
 *   data/de-bello-gallico-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-bello-gallico-la/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * Three-level `<div type="textpart" subtype="book" n="N">` (8 books) >
 * `<div type="textpart" subtype="chapter" n="M">` (404 total) >
 * `<div type="textpart" subtype="section" n="K">` (2150 total, almost always
 * one <p> each) - an extra nesting level the English sibling
 * (data/de-bello-gallico-en) does NOT have. Per this app's established
 * Nicomachean-Ethics-English precedent for an uninformative extra nesting
 * level, every <p> found anywhere under a chapter div, at any section depth,
 * is read straight through into that chapter's single Passage, in document
 * order, joined with "\n\n".
 *
 * Chapter numbering is 1-based and contiguous within every book EXCEPT Book
 * 8, whose first chapter is genuinely numbered "0" in the source: this is
 * Aulus Hirtius's own prefatory letter to Balbus ("Coactus assiduis tuis
 * vocibus, Balbe, ..."), explaining that he is continuing Caesar's
 * unfinished Commentaries after Caesar's death - direct textual confirmation
 * of the Hirtius/Book 8 authorship split disclosed in about.json. Chapters
 * then resume 1..55 as normal, for 56 chapters total in Book 8. The English
 * sibling agrees exactly (same "0" first chapter, same 56-chapter total).
 *
 * Each Book div opens with a verbatim `<head>` rubric ("COMMENTARIUS
 * PRIMUS", ... "COMMENTARIUS OCTAVUS"), captured as that Book's
 * Division.sourceHeading.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc
 * and scripts/import-pro-archia-la):
 *   - verbatim Latin reading text only; no accent/spelling/wording fixes.
 *   - `<add>...</add>` (18 spans) is Holmes's own editorial supplement
 *     filling a manuscript gap (e.g. "<add>oppidum</add>") - IT IS part of
 *     what his edition prints as the running text (the edition's own
 *     reconstructed reading), so it is unwrapped and kept verbatim, matching
 *     this app's established Pro Archia <add> convention; every occurrence
 *     is logged individually to anomalies.json and flagged on its Passage.
 *   - `<sic>...</sic>` (2 spans, unpaired with any <corr>) marks text Holmes
 *     prints exactly as the manuscripts transmit it despite an apparent
 *     irregularity - unwrapped and kept verbatim (that is precisely what
 *     "sic" means here: printed as given); both occurrences are logged
 *     individually.
 *   - `<gap reason="lost"/>` (1 occurrence, self-closing, no `rend`
 *     attribute - i.e. no literal dots are printed at that point in this
 *     edition) falls at the very end of the very last chapter of Book 8 -
 *     the well-documented fact that Hirtius's own continuation breaks off
 *     unfinished. Kept as nothing (no text fabricated, since no `rend` value
 *     is given) but logged prominently; see about.json.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s (read through any
 *     intervening <div subtype="section">) joined with "\n\n".
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-bello-gallico-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0448.phi001.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-bello-gallico-la');

const WORK_ID = 'de-bello-gallico-la';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0448/phi001/phi0448.phi001.perseus-lat2.xml';

/** This source's own chapter counts per book (I..VIII), cross-checked against the real parsed counts, never forced. */
const EXPECTED_CHAPTER_COUNTS = [54, 35, 29, 38, 58, 44, 90, 56];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`raw XML not found, downloading from ${SOURCE_URL} ...\n`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(RAW_XML, buf);
  process.stdout.write(`saved ${buf.length} bytes to ${RAW_XML}\n`);
}

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<add\b[^>]*>|<\/add>|<sic\b[^>]*>|<\/sic>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];
  let chapterAnomalyNotes: string[] = [];

  let inP = false;
  let pBuf = '';
  let headDepth = 0;
  let headBuf = '';
  let addDepth = 0;
  let addBuf = '';
  let sicDepth = 0;
  let sicBuf = '';

  let totalChapters = 0;
  let totalAddSpans = 0;
  let totalSicSpans = 0;
  let totalGaps = 0;
  let totalEmptyParagraphsDropped = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterAnomalyNotes = [];
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const text = chapterParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (chapterAnomalyNotes.length > 0) passage.anomaly = chapterAnomalyNotes.join(' ');
    const chapterDiv: Division = {
      id: currentChapterId,
      number: currentChapterNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(chapterDiv);
    totalChapters += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP) {
        pBuf += free;
        if (addDepth > 0) addBuf += free;
        if (sicDepth > 0) sicBuf += free;
      }
      if (headDepth > 0) headBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      stack.push('book');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (!n) fail(`book div with no n= attribute: ${tok}`);
      currentBookNum = Number(n);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 8) {
        fail(`unexpected book number "${n}"`);
      }
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: String(currentBookNum),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
    } else if (/subtype="chapter"/.test(tok)) {
      stack.push('chapter');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (n === undefined) fail(`chapter div with no n= attribute: ${tok}`);
      openChapter(n);
    } else if (/subtype="section"/.test(tok)) {
      stack.push('section');
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'chapter') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentChapterId || `book-${currentBookNum}`,
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
      } else {
        chapterParagraphs.push(cleaned);
      }
    } else if (/^<head\b/.test(tok)) {
      headDepth += 1;
      headBuf = '';
    } else if (tok === '</head>') {
      headDepth -= 1;
      if (currentBookDiv) currentBookDiv.sourceHeading = cleanText(headBuf);
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      totalAddSpans += 1;
      const word = excerpt(addBuf);
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<add> editorial supplement (Holmes's own reconstruction filling a manuscript gap), kept verbatim in the reading text: "${word}"`,
      });
      chapterAnomalyNotes.push(`editorial supplement <add> printed in the edition, kept verbatim: "${word}"`);
      addBuf = '';
    } else if (/^<sic\b/.test(tok)) {
      sicDepth += 1;
      sicBuf = '';
    } else if (tok === '</sic>') {
      sicDepth -= 1;
      totalSicSpans += 1;
      const word = excerpt(sicBuf);
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<sic> - text printed exactly as the manuscript tradition transmits it despite an apparent irregularity, kept verbatim: "${word}"`,
      });
      chapterAnomalyNotes.push(`<sic>-marked reading, kept verbatim as printed: "${word}"`);
      sicBuf = '';
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (inP) {
        pBuf += literal;
        if (addDepth > 0) addBuf += literal;
      }
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note:
          `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source - a manuscript lacuna, printed with no literal ` +
          `rendering in this edition (no "rend" attribute, so no dots are fabricated here). This falls at the very ` +
          `end of the very last chapter of Book 8: the well-documented fact that Hirtius's own continuation breaks ` +
          'off unfinished, mid-sentence ("Contendit..."). See about.json.',
      });
      chapterAnomalyNotes.push(
        'The manuscript breaks off here (<gap reason="lost"/>, no literal rendering given); this chapter - and the whole work - ends unfinished. See about.json.',
      );
    }
    // The final catch-all <[^>]+> handles every other tag generically (the
    // rare stray markup this source carries outside note/apparatus, none of
    // which needs structural action here): no action - text already flows
    // into pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 8) fail(`expected exactly 8 Book divisions, got ${divisions.length}`);
  if (headDepth !== 0) fail(`unbalanced <head> nesting (final depth ${headDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);
  if (sicDepth !== 0) fail(`unbalanced <sic> nesting (final depth ${sicDepth})`);

  // --- cross-check chapter counts against this source's own totals, honestly ---
  const chapterCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_CHAPTER_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) {
      chapterCountMismatches.push(`Book ${i + 1}: parsed ${got} chapters, expected ${want}`);
    }
  });
  if (chapterCountMismatches.length > 0) {
    fail(`chapter count mismatch(es): ${chapterCountMismatches.join('; ')}`);
  }

  // --- Book 8's chapter numbering starts at "0" (Hirtius's preface); every
  //     other book is 1-based contiguous - verify honestly, never force ----
  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const startsAt = bookN === 8 ? 0 : 1;
    b.children.forEach((c, ci) => {
      const want = String(startsAt + ci);
      if (c.number !== want) {
        fail(`Book ${bookN} chapter at position ${ci} has number ${JSON.stringify(c.number)}, expected "${want}"`);
      }
    });
  });

  // --- no chapter should ever be empty -----------------------------------
  const emptyChapters: string[] = [];
  for (const b of divisions) {
    for (const c of b.children) {
      if (c.passages.length === 0 || c.passages[0]!.text.length === 0) emptyChapters.push(c.id);
    }
  }
  if (emptyChapters.length > 0) {
    fail(`chapter division(s) unexpectedly carry empty passage text: ${emptyChapters.sort().join(', ')}`);
  }

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / authorship`,
    note:
      'Book 8 was not written by Caesar (his own narrative ends after Book 7) but by his officer Aulus Hirtius, ' +
      'after Caesar\'s assassination. This is confirmed directly in the source text itself: Book 8\'s first ' +
      'chapter, uniquely numbered "0" in this edition, is Hirtius\'s own prefatory letter to Balbus explaining ' +
      'that he is continuing Caesar\'s unfinished Commentaries. See about.json for the full disclosure.',
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'This Latin witness nests an extra <div subtype="section"> level (almost always one <p> each) between ' +
      'chapter and paragraph that the English sibling does not have. Every <p> under a chapter div is read ' +
      'straight through regardless of its section-nesting depth, in document order, into that chapter\'s single ' +
      'Passage - matching this app\'s established Nicomachean-Ethics-English precedent.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial supplements (Holmes's own reconstruction filling a manuscript gap) were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalSicSpans} <sic> spans (text printed exactly as transmitted despite an apparent irregularity) were kept verbatim; both occurrences are logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `${totalGaps} <gap reason="lost"/> marker found, at the very end of the very last chapter of Book 8: the work (in this edition) ends unfinished, mid-sentence. See about.json.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme. Citation here is by Book and Chapter number alone, matching this edition\'s own numbering exactly.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Bello Gallico',
    author: 'Julius Caesar (Books 1-7); Aulus Hirtius (Book 8)',
    language: 'la',
    editor: 'Thomas Rice Holmes',
    edition:
      'C. Iuli Commentarii Rerum in Gallia Gestarum VII, A. Hirti Commentarius VIII, ed. Thomas Rice Holmes (Oxford: Clarendon Press, 1914)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0448.phi001.perseus-lat2), digitising Thomas Rice Holmes\'s Oxford Classical Text ' +
      'edition of De Bello Gallico (1914); imported by scripts/import-de-bello-gallico-la. The raw file is ' +
      'fetched once (cached at scripts/import-de-bello-gallico-la/raw/) and bundled with the app; nothing is ' +
      'loaded from the network at runtime.',
    license:
      'Holmes\'s 1914 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Caesar\'s (and Hirtius\'s) De Bello Gallico',
        paragraphs: [
          'De Bello Gallico ("The Gallic War", also known as the Commentarii de Bello Gallico) is Julius Caesar\'s ' +
            'own first-person account of his campaigns in Gaul, 58-52 BC, in seven books - one of the great works ' +
            'of Latin prose and, for centuries, a standard Latin-teaching text.',
          'The text here is Holmes\'s Latin, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'IMPORTANT - authorship of Book 8',
        paragraphs: [
          'Book 8 of De Bello Gallico was NOT written by Julius Caesar. Caesar\'s own narrative ends after Book 7 ' +
            '(his last campaigning season, 52 BC). Book 8 was written after Caesar\'s assassination by his ' +
            'officer Aulus Hirtius, continuing the history through 50 BC. This is universally acknowledged by ' +
            'every edition of the work, including this one: the source volume\'s own title names both men - ' +
            '"C. Iuli Commentarii Rerum in Gallia Gestarum ..., A. Hirti Commentarius ..." (Holmes\'s edition ' +
            'title, naming Caesar\'s and Hirtius\'s commentaries separately, in that order) - and Book 8 itself ' +
            'opens with the verbatim source rubric "COMMENTARIUS OCTAVUS" followed immediately by Hirtius\'s own ' +
            'prefatory letter to Balbus - captured here as chapter "0" of Book 8, preceding his numbered ' +
            'narrative - explaining candidly that he has undertaken to continue Caesar\'s unfinished ' +
            'Commentaries, not to imitate a style he admits he cannot match.',
          'Book 8 is included here, faithfully, as it has traditionally been transmitted alongside Books 1-7 as ' +
            'part of the complete Commentarii - this is the traditional and complete presentation of the work - ' +
            'but it is Hirtius\'s continuation, not Caesar\'s own words, and readers should not mistake it for ' +
            'such.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Thomas Rice Holmes, ed., C. Iuli Commentarii Rerum in Gallia Gestarum VII, A. Hirti Commentarius VIII ' +
            '(Oxford: Clarendon Press, 1914), an Oxford Classical Text. (Note: this source\'s own TEI header ' +
            'transcribes the volume\'s title as "...A. Hirti Commentarius VII", i.e. without the final "I" - an ' +
            'apparent typo in the Perseus metadata, since Hirtius\'s book is universally the eighth commentary, ' +
            'and this edition\'s own running text confirms it: Book 8 opens with the verbatim rubric ' +
            '"COMMENTARIUS OCTAVUS".)',
          'The work is divided into 8 Books and, within each Book, numbered chapters (404 total in this edition). ' +
            'Book 8\'s first chapter is uniquely numbered "0" (Hirtius\'s prefatory letter), with his narrative ' +
            'chapters then numbered 1-55 - 56 chapters in all for Book 8. Every other book is numbered 1-N as usual.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0448.phi001.perseus-lat2.xml (CTS ' +
            'urn:cts:latinLit:phi0448.phi001.perseus-lat2) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book, chapter and (extra, uninformative) section <div>s and collects every <p> ' +
            'paragraph found anywhere under each chapter, at any section-nesting depth, in document order, into ' +
            'that chapter\'s single Passage (joined with a blank line when a chapter has more than one paragraph). ' +
            'Only transport scaffolding is removed: entities are decoded and runs of whitespace collapsed. ' +
            'Holmes\'s own editorial supplements (<add>, 18 single words filling manuscript gaps) and <sic>-marked ' +
            'readings (2 spans) are unwrapped and kept verbatim in the reading text, since both ARE part of what ' +
            'this edition prints as its running text - not apparatus to be excluded. The single <gap reason=' +
            '"lost"/> marker (at the very end of Book 8) is kept as nothing extra, since no literal rendering is ' +
            'given in this edition.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly - the same ' +
            'scheme used across nearly all editions and translations of Caesar. This source carries no finer, ' +
            'page-marker-style citation scheme, so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 8 Books and all 404 chapters of this edition are present and in order, agreeing ' +
            'exactly, chapter for chapter, with the independently-parsed English sibling edition. No paragraph is ' +
            'dropped, merged or reordered except the rare paragraph that cleans to empty text.',
          'The work ends unfinished. The very last chapter of Book 8 breaks off mid-sentence ("Contendit... " ' +
            '<gap reason="lost"/>) - this is not a parsing error but a well-documented fact about the ' +
            'transmission of Hirtius\'s continuation: it survives incomplete. This edition marks the point with a ' +
            'bare <gap/> (no literal dots printed); see anomalies.json.',
          'Authorship of Book 8. See "IMPORTANT - authorship of Book 8" above: Book 8 is Hirtius\'s continuation, ' +
            'not Caesar\'s own words, confirmed directly by its own prefatory letter to Balbus (captured here as ' +
            'chapter "0").',
          'Editorial supplements and <sic> readings. 18 <add> spans (Holmes\'s own reconstruction of text lost to ' +
            'manuscript damage) and 2 <sic> spans (text printed exactly as transmitted despite an apparent ' +
            'irregularity) are kept verbatim in the reading text; every occurrence is logged individually in ' +
            'anomalies.json.',
          'Extra section nesting. This Latin witness nests an uninformative extra <div subtype="section"> level ' +
            'between chapter and paragraph that the English sibling does not have; it carries no citation ' +
            'information this app\'s schema needs and is read straight through - see "How it was imported" above.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalChars = 0;
  for (const b of divisions) totalChars += b.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);

  process.stdout.write('\nBooks:\n');
  divisions.forEach((b, i) => {
    process.stdout.write(`  Book ${b.number!.padStart(1)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(2)} chapters  head="${b.sourceHeading}"  (expected ${EXPECTED_CHAPTER_COUNTS[i]})\n`);
  });
  process.stdout.write(
    `\n  8 books  ${totalChapters} chapters  ${totalChars} chars  ${totalAddSpans} <add>  ${totalSicSpans} <sic>  ${totalGaps} <gap>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-bello-gallico-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

async function run(): Promise<void> {
  await ensureRawXml();
  main();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}

export { run };
