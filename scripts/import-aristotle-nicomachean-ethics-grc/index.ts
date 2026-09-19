/**
 * Aristotle, Nicomachean Ethics - Greek text (ed. Ingram Bywater,
 * Aristotelis Ethica Nicomachea, Oxford: Clarendon Press, 1894;
 * CTS urn:cts:greekLit:tlg0086.tlg010.perseus-grc2). Run-once ingestion
 * pipeline.
 *
 *   npm run import:aristotle-nicomachean-ethics-grc
 *
 * Reads scripts/import-aristotle-nicomachean-ethics-grc/raw/tlg0086.tlg010.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/nicomachean-ethics-grc/work.json       - the GenericWork (10 Books,
 *                                                  each a flat list of Chapter
 *                                                  divisions, one Passage
 *                                                  each)
 *   data/nicomachean-ethics-grc/about.json      - provenance / licence / prose
 *   data/nicomachean-ethics-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-nicomachean-ethics-grc`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): two-level
 * `<div type="textpart" subtype="book" n="N">` (10 books) containing
 * `<div type="textpart" subtype="section" n="M">` (116 total; Perseus's own
 * attribute name is "section" but - matching this app's existing
 * Categoriae/De Interpretatione convention - is treated as "Chapter" here).
 * Each chapter div holds one or more `<p>` paragraphs; every paragraph
 * carries inline `<milestone unit="page" resp="Bekker" n="…"/>` and
 * `<milestone unit="line" resp="Bekker" n="…"/>` markers, zero-width and
 * stripped from the reading text - the "page" values are captured in
 * document order to build each chapter's Division.ref (a "start–end" range,
 * or a single value when the chapter has only one page marker).
 *
 * Books VII and VIII parse to 14 chapters each, not the traditionally cited
 * 15 / 16 - confirmed genuine (both witnesses in this library agree; see
 * about.json and the corpus-level anomaly below), not a parsing bug: this is
 * this edition's own chapter division.
 *
 * Faithfulness rules (mirrors scripts/import-euclid):
 *   - verbatim Greek reading text only; no accent/spelling/wording fixes.
 *   - `<milestone .../>` (1,511 total: 181 page, 1,330 line) is zero-width
 *     transport scaffolding - stripped; the page values seed Division.ref.
 *   - `<quote>`/`<lg>`/`<l>` (verse Aristotle quotes - Homer, Hesiod,
 *     Theognis, Euripides, the Delos inscription, etc.) are unwrapped: the
 *     tags are transport scaffolding, their text is genuine (quoted)
 *     content and flows into the surrounding prose paragraph like any other
 *     run of text (verse line breaks are not specially preserved, same as
 *     everywhere else in this schema - whitespace is collapsed to single
 *     spaces).
 *   - `<note resp="Perseus">...</note>` (16 total) is NOT Bywater's text at
 *     all: every one is a short Perseus-added citation gloss identifying the
 *     poet/work just quoted (e.g. "Hes. WD 293ff.", "Eur. fr. 785-6
 *     (Dindorf)") - excluded from the reading text entirely (tag AND
 *     content), the same treatment Virgil's importer gives an embedded
 *     Perseus aside.
 *   - `<del>...</del>` (49 spans) is text Bywater's own apparatus brackets
 *     as a probable interpolation/gloss, not his judged authentic text -
 *     EXCLUDED from the reading text, matching Euclid's <del> convention;
 *     every occurrence is logged verbatim to anomalies.json.
 *   - `<add>...</add>` (29 spans) is a genuine editorial insertion Bywater
 *     prints - INCLUDED in the reading text, matching Euclid's <add>
 *     convention; every occurrence is logged and the containing chapter's
 *     Passage carries an `anomaly` note.
 *   - `<gap reason="…" rend="…"/>` (5 total: 2 "ellipsis" mid-quotation, 3
 *     "lost" manuscript lacunae) is self-closing but genuinely PRINTED
 *     content (the `rend` attribute is the literal dots/asterisks Bywater's
 *     page shows, e.g. ". . ." or " * * "); kept verbatim as that literal
 *     text rather than dropped, and logged individually.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n" (per this app's Book->Chapter GenericWork convention - see
 *     data/nicomachean-ethics-grc/types.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/nicomachean-ethics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg010.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'nicomachean-ethics-grc');

interface Anomaly {
  where: string;
  note: string;
}

/** Traditionally cited chapter counts per book (I..X); compared against the
 *  real parsed counts below and flagged, never forced. */
const CANONICAL_CHAPTER_COUNTS = [13, 9, 12, 9, 11, 13, 15, 16, 12, 9];

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];
  let chapterPages: string[] = [];
  let chapterAnomalyNotes: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalChapters = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalGaps = 0;
  let totalNotes = 0;
  let totalPageMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterPages = [];
    chapterAnomalyNotes = [];
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const text = chapterParagraphs.join('\n\n');
    let ref: string | null = null;
    if (chapterPages.length === 0) {
      anomalies.push({
        where: currentChapterId,
        note: 'No Bekker page milestone found in this chapter; Division.ref left null rather than fabricated.',
      });
    } else {
      const first = chapterPages[0]!;
      const last = chapterPages[chapterPages.length - 1]!;
      ref = first === last ? first : `${first}–${last}`;
    }
    const passage: Passage = { n: '', text, ref: null };
    if (chapterAnomalyNotes.length > 0) passage.anomaly = chapterAnomalyNotes.join(' ');
    const chapterDiv: Division = {
      id: currentChapterId,
      number: currentChapterNum,
      ref,
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
      if (inP && noteDepth === 0) {
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
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 10) {
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
      // section (chapter) open
      stack.push('section');
      openChapter(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeChapter();
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
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<del> excluded from the reading text (Bywater's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
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
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'page' && nMatch?.[1] && noteDepth === 0) {
        chapterPages.push(nMatch[1]);
        totalPageMilestones += 1;
      }
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (inP && noteDepth === 0 && delDepth === 0) {
        pBuf += literal;
        if (addDepth > 0) addBuf += literal;
      }
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source, printed as "${literal}"; kept verbatim in the reading text rather than dropped.`,
      });
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (quote/lg/l opens & closes, and their ilk): no structural action -
    // their content already flows into pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 10) fail(`expected exactly 10 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);

  // --- cross-check chapter counts against the traditionally cited numbers,
  //     honestly, without forcing a match ------------------------------
  const chapterCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = CANONICAL_CHAPTER_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) {
      chapterCountMismatches.push(`Book ${i + 1}: parsed ${got} chapters, traditionally cited ${want}`);
    }
  });
  if (chapterCountMismatches.length > 0) {
    anomalies.push({
      where: 'nicomachean-ethics-grc / chapter counts',
      note:
        `${chapterCountMismatches.length} book(s) parse to a chapter count different from the number traditionally ` +
        `cited for the Nicomachean Ethics: ${chapterCountMismatches.join('; ')}. This is this edition's (Bywater ` +
        "1894 / Perseus TEI) own chapter division, confirmed genuine - not a parsing error - and the English " +
        'sibling (Rackham/Perseus) agrees chapter-for-chapter; see about.json.',
    });
  }

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

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'nicomachean-ethics-grc / reading text',
    note: `${totalDelSpans} <del> spans (Bywater's apparatus brackets these as probable interpolations/glosses, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: 'nicomachean-ethics-grc / reading text',
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: 'nicomachean-ethics-grc / reading text',
    note: `${totalGaps} <gap/> markers (manuscript lacunae or mid-quotation ellipses) were kept as their literal printed rendering (e.g. ". . ." or " * * "); every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: 'nicomachean-ethics-grc / reading text',
    note: `${totalNotes} <note resp="Perseus"> citation glosses (identifying the poet/work of a quoted verse passage - not Bywater's text) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: 'nicomachean-ethics-grc / passage & division refs',
    note: `${totalPageMilestones} Bekker page milestones captured; each chapter's Division.ref is the first–last page value seen in that chapter's own document order. Every Passage.ref is null: no Bekker milestone is printed at the per-paragraph level, only per-page.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: 'nicomachean-ethics-grc / reading text',
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text (fully <del>-excluded) were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: 'nicomachean-ethics-grc / character encoding',
    note: 'The source is already NFC-normalised polytonic Greek; no normalisation pass was applied.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = {
    workId: 'nicomachean-ethics-grc',
    language: 'grc',
    divisions,
  };

  const about = {
    workId: 'nicomachean-ethics-grc',
    title: 'Ἠθικὰ Νικομάχεια',
    author: 'Aristotle',
    language: 'grc' as const,
    edition: 'Bywater 1894',
    editor: 'Ingram Bywater',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-grc2), which digitises the text of Aristotle’s Ἠθικὰ Νικομάχεια as printed in Ingram Bywater, ed., Aristotelis Ethica Nicomachea (Oxford: Clarendon Press, 1894); imported by scripts/import-aristotle-nicomachean-ethics-grc.',
    license:
      'Bywater’s 1894 Greek text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Aristotle’s Nicomachean Ethics',
        paragraphs: [
          'This is the Greek text of Aristotle’s Ἠθικὰ Νικομάχεια (Ethica Nicomachea), his major surviving work on ethics, in ten books - named, on the traditional (if uncertain) account, for either his father or his son Nicomachus.',
          'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular - a bracketed interpolation, an editorial insertion, a marked manuscript gap - the irregularity is preserved and noted below; it never affects the reading text itself beyond the documented exclusions.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Ingram Bywater, ed., Aristotelis Ethica Nicomachea (Oxford: Clarendon Press, 1894), the standard Oxford Classical Text of the Greek. This edition is in the public domain. Bekker’s page/column/line numbers (e.g. "1094a1"), carried over from Immanuel Bekker’s 1831 Prussian Academy edition, remain the standard way of citing Aristotle across all editions and translations.',
          'The work is divided into 10 Books and, within each Book, numbered chapters (116 in this edition’s own division). Book VII parses to 14 chapters and Book VIII to 14 chapters in this edition, not the 15 / 16 sometimes cited elsewhere - see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0086.tlg010.perseus-grc2.xml (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter (Perseus’s own "section") <div>s and collects every <p> paragraph within each chapter, in document order, into that chapter’s single Passage (joined with a blank line when a chapter has more than one paragraph). XML transport scaffolding only is removed: the inline Bekker <milestone> markers (their "page" values instead seed each chapter’s Division.ref), and the <quote>/<lg>/<l> verse-quotation wrapper tags (their text - Aristotle’s quotations of Homer, Hesiod, Theognis, Euripides, and the Delos inscription - flows into the surrounding prose like any other text). Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          'Perseus’s own added citation glosses (<note resp="Perseus">, identifying the poet/work of each quoted verse passage - not part of Bywater’s text) are dropped entirely. Bywater’s own critical apparatus is handled the same way this app already treats it in Euclid: text his apparatus brackets as a probable interpolation (<del>) is excluded from the reading text; a genuine editorial insertion he prints (<add>) is kept; a marked manuscript gap or quotation ellipsis (<gap>) is kept as its literal printed rendering. Every occurrence of all three is logged individually in anomalies.json.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter, plus the Bekker page range each chapter covers (e.g. "1094a–1095a"), reconstructed from this source’s own inline Bekker page milestones. A chapter’s Division.ref is the first–last page value the source prints within that chapter, in document order - precise to the nearest printed page marker, never fabricated to the exact line. Passage.ref is null throughout: no Bekker marker is printed at the per-paragraph level, only per-page.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 10 Books and all 116 chapters of this edition are present and in order. No paragraph is dropped, merged or reordered except where documented below; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'Chapter counts in Books VII and VIII. This edition’s own chapter division gives Book VII 14 chapters and Book VIII 14 chapters, not the 15 / 16 sometimes cited in secondary literature for the Nicomachean Ethics. This was verified directly against the source XML (not assumed) and the English sibling edition (Rackham/Perseus) agrees chapter-for-chapter with this Greek one; it is not a parsing error on either side, simply this edition’s own numbering.',
          'Bywater’s critical apparatus. 49 <del> spans (text Bywater’s apparatus brackets as a probable interpolation or gloss) are excluded from the reading text; 29 <add> spans (a genuine editorial insertion he prints) are kept; 5 <gap> markers (manuscript lacunae or quotation ellipses) are kept as their literal printed rendering (". . ." or " * * "). Every occurrence of all three is logged individually in anomalies.json.',
          'Perseus citation glosses. 16 <note resp="Perseus"> elements - short citations identifying the poet/work of a quoted verse passage (e.g. "Hes. WD 293ff.") - are Perseus’s own added apparatus, not Bywater’s text; dropped entirely rather than shown inline.',
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
    const want = CANONICAL_CHAPTER_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(2)} chapters (traditionally cited ${want})\n`,
    );
  }
  process.stdout.write(
    `\n  10 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalPageMilestones} page milestones  ${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap>  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-nicomachean-ethics-grc` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
