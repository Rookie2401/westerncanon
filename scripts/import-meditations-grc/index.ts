/**
 * Marcus Aurelius, *Meditations* (Τὰ εἰς ἑαυτόν / Ad Se Ipsum) - Greek text
 * (ed. Jan Hendrik Leopold, M. Antoninus Imperator Ad Se Ipsum, Leipzig:
 * Teubner, 1908; CTS urn:cts:greekLit:tlg0562.tlg001.perseus-grc2). Run-once
 * ingestion pipeline.
 *
 *   npm run import:meditations-grc
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-meditations-grc/raw/tlg0562.tlg001.perseus-grc2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes:
 *   data/meditations-grc/work.json       - the GenericWork (12 Books, each
 *                                           a flat list of Chapter
 *                                           divisions, one Passage each)
 *   data/meditations-grc/about.json      - provenance / licence / prose
 *   data/meditations-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:meditations-grc`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * <div type="textpart" subtype="book" n="N"> (12 books) ->
 *   <div type="textpart" subtype="chapter" n="M"> (486 total) ->
 *     <div type="textpart" subtype="section" n="K"> (577 total - usually
 *       exactly one per chapter, but 41 chapters genuinely carry 2-10
 *       sections; 21 individual sections themselves carry 2-3 <p>s) ->
 *       <p>...</p> (601 total)
 * Per this app's established Nicomachean Ethics precedent (see
 * scripts/import-aristotle-nicomachean-ethics-grc/index.ts's own doc
 * comment): the "section" level is Perseus/Leopold's own editorial
 * sub-division, not a citable unit in this schema. EVERY <p> found
 * anywhere under a chapter div - regardless of how many sections lie
 * between it and the chapter - is collected, in document order, into that
 * chapter's ONE Passage, joined with "\n\n" when there is more than one.
 *
 * Chapter numbering gap (Book 12 only): this edition's own chapter
 * sequence in Book 12 skips n="18" entirely (...17, 19, 20...) - confirmed
 * genuine by direct inspection, not a parsing artifact. Division.number/id
 * for Book 12's chapters use the SOURCE's own printed numbers as-is (no
 * forced renumbering to close the gap); the gap is logged to
 * anomalies.json. See data/meditations-grc/types.ts for why this is not
 * reconciled against the English sibling (which has a DIFFERENT gap, at
 * chapter 15).
 *
 * Faithfulness rules (mirrors the Nicomachean Ethics Greek importer):
 *   - verbatim Greek reading text only; no accent/spelling/wording fixes.
 *   - `<add>...</add>` (41 spans) is a genuine editorial insertion Leopold
 *     prints - INCLUDED in the reading text, logged individually, and
 *     flagged on the containing chapter's Passage.
 *   - `<del>...</del>` (18 spans) is text Leopold's apparatus brackets as
 *     a probable interpolation/gloss, not his judged authentic text -
 *     EXCLUDED from the reading text, logged individually verbatim.
 *   - `<quote rend="blockquote">...</quote>` wraps verse Marcus quotes
 *     (Euripides, an unattributed epigram, etc.) - unwrapped: the tag is
 *     transport scaffolding, its text is genuine (quoted) content and
 *     flows into the surrounding prose paragraph like any other run of
 *     text, matching this library's general convention for embedded verse
 *     quotations.
 *   - `<lb/>` (10 total, all inside `<quote>` verse blocks) is a verse
 *     line-break milestone with no line-break-worthy semantics in this
 *     schema (verse line breaks are not specially preserved anywhere in
 *     this app - collapsed to plain running text). Each occurrence was
 *     inspected individually: 9 of the 10 fall at a genuine word/token
 *     boundary in the source (rendered as a single space, then collapsed
 *     normally); exactly 1 (Book 7 ch. 51's quotation) falls WITHIN a
 *     single word that the source's own line milestone splits in two
 *     ("ἀνάγκη τ<lb/>λῆναι" = "ἀνάγκη τλῆναι", the identifiable Greek
 *     infinitive of τλάω) - rendered zero-width there instead of gluing an
 *     artificial space into the middle of a real word. The rule applied:
 *     zero-width only when the character immediately before AND after the
 *     milestone are both Greek letters (i.e. the source's own encoding
 *     continues one word across the break with no separating character);
 *     a single space otherwise. Every occurrence is logged individually.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s (across however
 *     many <section> divs) joined with "\n\n".
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/meditations-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0562.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'meditations-grc');

const WORK_ID = 'meditations-grc';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0562/tlg001/tlg0562.tlg001.perseus-grc2.xml';
const EXPECTED_BOOKS = 12;

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

const GREEK_LETTER_RE = /[Ͱ-Ͽἀ-῿]/;

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

async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="chapter"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<add\b[^>]*>|<\/add>|<del\b[^>]*>|<\/del>|<lb\b[^>]*\/>|<div\b[^>]*>|<[^>]+>/g;

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
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalChapters = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalLb = 0;
  let totalLbZeroWidth = 0;
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
        if (delDepth > 0) {
          delBuf += free;
        } else {
          pBuf += free;
          if (addDepth > 0) addBuf += free;
        }
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      // book open
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > EXPECTED_BOOKS) {
        fail(`unexpected book number "${m[1]}"`);
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
    } else if (m[2] !== undefined) {
      // chapter open
      stack.push('chapter');
      openChapter(m[2]);
    } else if (m[3] !== undefined) {
      // section open (no structural action beyond nesting tracking - its
      // <p>s flow straight into the enclosing chapter's paragraph list)
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
          note: 'A paragraph cleaned to empty text (fully <del>-excluded); dropped from the reading text rather than emitted empty.',
        });
      } else {
        chapterParagraphs.push(cleaned);
      }
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<del> excluded from the reading text (Leopold's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
      });
      delBuf = '';
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      totalAddSpans += 1;
      const t = excerpt(addBuf);
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
      });
      chapterAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
      addBuf = '';
    } else if (/^<lb\b/.test(tok)) {
      totalLb += 1;
      const nextChar = body.charAt(tokenRe.lastIndex);
      const prevChar = (delDepth > 0 ? delBuf : pBuf).slice(-1);
      const bothLetters = GREEK_LETTER_RE.test(prevChar) && GREEK_LETTER_RE.test(nextChar);
      const insertion = bothLetters ? '' : ' ';
      if (bothLetters) totalLbZeroWidth += 1;
      if (inP) {
        if (delDepth > 0) {
          delBuf += insertion;
        } else {
          pBuf += insertion;
          if (addDepth > 0) addBuf += insertion;
        }
      }
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: bothLetters
          ? `<lb/> verse line-break milestone rendered zero-width: it falls between two Greek letters ("${prevChar}"+"${nextChar}…") - the source's own encoding continues a single word across the line boundary here, so no space was inserted.`
          : `<lb/> verse line-break milestone rendered as a single space (ordinary line boundary between separate words/tokens: "…${prevChar}" | "${nextChar}…").`,
      });
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (quote open/close and its ilk): no structural action needed - their
    // content already flows into pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);

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

  // --- detect (never fill) chapter-numbering gaps within each book -------
  for (const b of divisions) {
    const nums = b.children.map((c) => Number(c.number));
    const gaps: string[] = [];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i]! !== nums[i - 1]! + 1) {
        for (let missing = nums[i - 1]! + 1; missing < nums[i]!; missing++) gaps.push(String(missing));
      }
    }
    if (gaps.length > 0) {
      anomalies.push({
        where: `${WORK_ID} / ${b.id}`,
        note: `This edition's own chapter numbering skips ${gaps.length === 1 ? 'number' : 'numbers'} ${gaps.join(', ')} entirely (sequence goes straight from ${Number(gaps[0]!) - 1} to ${Number(gaps[gaps.length - 1]!) + 1}) - confirmed genuine by direct inspection of the source XML, not a parsing error. Not renumbered to close the gap; see data/meditations-grc/types.ts for the (different) gap in the English sibling.`,
      });
    }
  }

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Leopold's apparatus brackets these as probable interpolations/glosses, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalLb} <lb/> verse line-break milestones (all inside <quote> blocks) were resolved individually: ${totalLbZeroWidth} rendered zero-width (the source's own line break falls mid-word, letters on both sides), ${totalLb - totalLbZeroWidth} rendered as a single space (an ordinary word/token boundary). Every occurrence is logged individually above.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text (fully <del>-excluded) were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'This work carries no Bekker-style (or any other) page/line reference system in this source; every Division.ref and Passage.ref is null throughout rather than fabricated.',
  });
  anomalies.push({
    where: `${WORK_ID} / character encoding`,
    note: 'The source is already NFC-normalised polytonic Greek; no normalisation pass was applied.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = {
    workId: WORK_ID,
    language: 'grc',
    divisions,
  };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Τὰ εἰς ἑαυτόν',
    author: 'Marcus Aurelius',
    language: 'grc',
    edition: 'Leopold 1908',
    editor: 'Jan Hendrik Leopold',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0562.tlg001.perseus-grc2), which digitises the text of Marcus Aurelius\'s Τὰ εἰς ἑαυτόν as printed in Jan Hendrik Leopold, ed., M. Antoninus Imperator Ad Se Ipsum (Leipzig: Teubner, 1908); imported by scripts/import-meditations-grc. The raw XML dump is committed under scripts/import-meditations-grc/raw/.',
    license:
      'Leopold\'s 1908 Greek text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Marcus Aurelius\'s Meditations - Greek',
        paragraphs: [
          'This is the Greek text of Marcus Aurelius\'s Τὰ εἰς ἑαυτόν ("[Writings] to himself"), conventionally known in English as the Meditations and in Latin as the Ad Se Ipsum - the private philosophical notebook of the Roman emperor (r. 161-180 AD), written in Koine Greek during his final years, mostly on campaign, and never intended for publication.',
          'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular - an editorial insertion, a bracketed probable interpolation, a genuine gap in the chapter numbering - the irregularity is preserved and noted below; it never affects the reading text itself beyond the documented exclusions.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Jan Hendrik Leopold, ed., M. Antoninus Imperator Ad Se Ipsum (Leipzig: Teubner, 1908), a Teubner critical edition of the Greek. This edition is in the public domain.',
          'The work is divided into 12 Books and, within each Book, numbered chapters (short, often aphoristic entries - the traditional unit of citation for this work, e.g. "4.3"). This edition\'s own numbering in Book 12 skips chapter number 18 entirely; see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0562.tlg001.perseus-grc2.xml (CTS urn:cts:greekLit:tlg0562.tlg001.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It is downloaded once by the importer and cached under scripts/import-meditations-grc/raw/; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book, chapter, and (Perseus/Leopold\'s own) section <div>s and collects EVERY <p> paragraph found anywhere under a chapter - regardless of how many sections lie between it and the chapter - in document order, into that chapter\'s single Passage (joined with a blank line when a chapter has more than one). XML transport scaffolding only is removed: the <quote rend="blockquote"> verse-quotation wrapper tag (its text - Marcus\'s quotations of Euripides and other verse - flows into the surrounding prose like any other text) and the inline <lb/> verse line-break milestones (10 total, each individually inspected and resolved to either a space or zero-width depending on whether it falls at a word boundary or mid-word in the source\'s own encoding - see this importer\'s own doc comment). Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          'Leopold\'s own critical apparatus is handled the same way this app already treats it in other Perseus TEI imports: text his apparatus brackets as a probable interpolation (<del>) is excluded from the reading text; a genuine editorial insertion he prints (<add>) is kept. Every occurrence of both is logged individually in anomalies.json.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter only (e.g. "4.3"). This work carries no Bekker-style or other page/line reference system in this source, so Division.ref and Passage.ref are null throughout - nothing is fabricated to fill that gap.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 12 Books of this edition are present and in order. No paragraph is dropped, merged or reordered except where documented below; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'Chapter numbering gap in Book 12. This edition\'s own chapter sequence in Book 12 skips number 18 entirely - it runs ...16, 17, 19, 20... - confirmed genuine by direct inspection of the source XML, not a parsing error. Chapter ids use the source\'s own printed numbers as-is rather than being renumbered to close the gap. Interestingly, the companion English edition (data/meditations-en, independently transcribed from a different 1916 Wikisource source) has a gap too, but at a DIFFERENT number (15, not 18) - the two are not reconciled against each other; each edition\'s own gap is logged in its own anomalies.json.',
          'Leopold\'s critical apparatus. 41 <add> spans (a genuine editorial insertion he prints) are kept verbatim in the reading text; 18 <del> spans (text his apparatus brackets as a probable interpolation or gloss) are excluded. Every occurrence of both is logged individually in anomalies.json.',
          'Verse line-break milestones. 10 <lb/> elements (all inside quoted verse) were each individually inspected and resolved to a space or zero-width join depending on the surrounding characters in the source; see anomalies.json for each one.',
          'Character encoding. The transcription uses precomposed polytonic Greek code points. The bytes are preserved exactly as transmitted; no normalisation was applied.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const c of b.children) {
      totalPassages += c.passages.length;
      totalChars += c.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${b.id.padEnd(9)} ${String(b.children.length).padStart(2)} chapters\n`);
  }
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalAddSpans} <add>  ${totalDelSpans} <del>  ${totalLb} <lb/>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:meditations-grc` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
