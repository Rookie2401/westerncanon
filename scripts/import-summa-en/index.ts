/**
 * Summa Theologiae, English translation by the Fathers of the English
 * Dominican Province (2nd/revised ed., 1920), hosted at newadvent.org.
 * Run-once ingestion pipeline (fetch step is separate; see fetch.ts).
 *
 *   npx tsx scripts/import-summa-en/fetch.ts     (one-time, cached in raw/)
 *   npx tsx scripts/import-summa-en/index.ts
 *   npx tsx scripts/import-summa-en/validate.ts
 *
 * Reads scripts/import-summa-en/raw/*.html (614 pages: one per Question,
 * every Article anchored on the same page) and writes:
 *   data/summa-en/part-I.json       (Prima Pars, 119 questions)
 *   data/summa-en/part-I-II.json    (Prima Secundae, 114 questions)
 *   data/summa-en/part-II-II.json   (Secunda Secundae, 189 questions)
 *   data/summa-en/part-III.json     (Tertia Pars, 90 questions)
 *   data/summa-en/part-suppl.json   (Supplementum, 99 + 3 appendix = 102)
 *   data/summa-en/anomalies.json
 *
 * This reuses the SAME Part/Question/Article/... shapes as the bundled Latin
 * edition (data/summa/types.ts) — only the source and a few fields differ:
 *
 *   - Question.prooemium is always null. New Advent prints no continuous
 *     prooemium prose before Article 1 (unlike the Latin source); the page's
 *     <ol> is a linked enumeration of short article blurbs, not prose, and is
 *     never used as prooemium text.
 *   - Article.title is ALWAYS populated (never null), taken directly from
 *     each page's own "Article N. <utrum text>" heading — unlike the Latin
 *     edition, where title is parsed from the prooemium enumeration and
 *     sometimes fails to line up.
 *   - Part.prooemium is always null, including for tertia-pars-en (the
 *     Latin Tertia Pars's part-level prooemium has no clean English-source
 *     equivalent easily extractable from this per-question page structure —
 *     a disclosed scope limit, not an oversight).
 *   - Article.witness is never set: this edition has no secondary-witness
 *     lacuna-filling process. A genuine gap (e.g. missing respondeo) is
 *     logged in anomalies.json instead of being fabricated or filled.
 *
 * Parsing approach (jsdom): each page's real content lives inside
 * `<div id="springfield2">` (verified directly against real fetched pages
 * across all 5 parts + both appendices — the surrounding nav/footer chrome,
 * including a footer `<p align=center>` copyright paragraph with no leading
 * `<strong>`, lives OUTSIDE that div and is never read). Within it:
 *   - the single `<h1>` is `"Question N. <Title>"` (or, for Appendix II's
 *     7001.htm, just `"Purgatory"` — no "Question N." prefix; see below).
 *   - each `<h2 id="articleN">Article N. <utrum text>?</h2>` starts a new
 *     article; all `<p>` elements up to the next `<h2>` (or end of the
 *     container) belong to it.
 *   - within an article, a `<p>` whose FIRST child is a `<strong>` starts a
 *     new labeled section (Objection N. / On the contrary, / I answer that,
 *     / Reply to Objection N.); a `<p>` with no leading `<strong>` continues
 *     the immediately preceding section (a verified real pattern — several
 *     `respondeo`/reply paragraphs on this site span more than one `<p>`,
 *     e.g. Suppl. q. 189 a. 10 on II-II's page 3189.htm; continuation
 *     paragraphs are joined to the current section's text with a single
 *     space, matching how the Latin edition's own XML source already
 *     flattens multi-paragraph lemma content into one string).
 *   - `<a href="../cathen/...">text</a>` cross-reference links (and every
 *     other inline tag) are stripped to their plain text automatically by
 *     reading `.textContent` on a cloned, label-stripped `<p>` — this is
 *     ordinary HTML-transport cleanup, not a content change, same as every
 *     other importer in this repo. HTML entities are decoded by jsdom itself
 *     (part of standard HTML parsing), so no separate entity-decoding step
 *     is needed here; only whitespace is collapsed afterwards.
 *
 * Faithfulness rules (same as every other import in this repo): verbatim
 * reading text only; only wiki/HTML transport scaffolding is stripped; when
 * genuinely unsure how to parse or classify something, log it in
 * anomalies.json rather than guessing silently; never fabricate a
 * prooemium, a title, a respondeo, or any text not actually on the page.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article, Objection, Part, PartCode, PartId, Question, Reply, SedContra } from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'summa-en');
const LATIN_DIR = join(REPO_ROOT, 'data', 'summa');

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

/** Collapse all whitespace (incl. NBSP / newlines) to single spaces and trim. jsdom already decodes entities. */
function cleanText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

// --- part configuration --------------------------------------------------

interface PartMeta {
  digit: string;
  count: number;
  partId: PartId;
  code: PartCode;
  latinTitle: string;
  shortTitle: string;
  compilationNote?: string;
}

/** Reused verbatim from src/corpus/corpus.ts's PARTS array (supplementum-en's `compilation` field). */
const SUPPLEMENTUM_COMPILATION_NOTE =
  'A posthumous compilation: assembled after Aquinas’ death (c. 1274) by Reginald of Piperno from Aquinas’ earlier Scriptum super libros Sententiarum (Book IV). Not written by Aquinas as part of the Summa.';

function latinTitleOf(file: string): string {
  const p = JSON.parse(readFileSync(join(LATIN_DIR, file), 'utf8')) as Part;
  return p.latinTitle;
}

const PART_METAS: PartMeta[] = [
  { digit: '1', count: 119, partId: 'prima-pars-en', code: 'I', latinTitle: latinTitleOf('part-I.json'), shortTitle: 'Part I' },
  { digit: '2', count: 114, partId: 'prima-secundae-en', code: 'I-II', latinTitle: latinTitleOf('part-I-II.json'), shortTitle: 'Part I-II' },
  { digit: '3', count: 189, partId: 'secunda-secundae-en', code: 'II-II', latinTitle: latinTitleOf('part-II-II.json'), shortTitle: 'Part II-II' },
  { digit: '4', count: 90, partId: 'tertia-pars-en', code: 'III', latinTitle: latinTitleOf('part-III.json'), shortTitle: 'Part III' },
  {
    digit: '5',
    count: 99,
    partId: 'supplementum-en',
    code: 'Suppl.',
    latinTitle: latinTitleOf('part-suppl.json'),
    shortTitle: 'Supplement',
    compilationNote: SUPPLEMENTUM_COMPILATION_NOTE,
  },
];

const PART_FILE_NAME: Record<string, string> = {
  '1': 'part-I.json',
  '2': 'part-I-II.json',
  '3': 'part-II-II.json',
  '4': 'part-III.json',
  '5': 'part-suppl.json',
};

// --- page parsing ----------------------------------------------------------

const ARTICLE_ID_RE = /^article(\d+)$/;
const ARTICLE_HEADING_RE = /^Article\s+(\d+)\.\s*(.*)$/;
const QUESTION_H1_RE = /^Question\s+(\d+)\.\s*(.*)$/;

interface RawArticle {
  number: number;
  title: string;
  objections: Objection[];
  sedContra: SedContra[];
  respondeo: string | null;
  replies: Reply[];
}

interface PageParse {
  h1Raw: string;
  articles: RawArticle[];
}

interface Section {
  kind: 'objection' | 'sedContra' | 'respondeo' | 'reply';
  num: number | null;
  parts: string[];
}

/** Remove the first child of a cloned `<p>` (its leading `<strong>` label) and return the remaining text. */
function textAfterLeadingStrong(p: JSDOMElement): string {
  const clone = p.cloneNode(true);
  const first = clone.children[0];
  if (first && first.tagName === 'STRONG') first.remove();
  return cleanText(clone.textContent ?? '');
}

/**
 * Matches every real "reply" heading variant found across the whole corpus
 * (verified by running the parser over all 614 pages / 3125 articles once
 * already — see anomalies below): "Reply to Objection 1.", "Reply to the
 * Objections." (combined, no number), "Reply to Objections 2 and 3.",
 * "Reply to Objections 8 and 9.", "Reply to Objection 1 and 2" (singular
 * "Objection", no trailing period), "Replies to Objections 1 and 2.". Group
 * 1 is everything after "Objection(s)" — digit(s) are pulled out of it with
 * a second regex so any of these punctuation/count variants collapse to the
 * same handling.
 */
const REPLY_LABEL_RE = /^Repl(?:y|ies)\s+to\s+(?:the\s+)?Objections?\b[.,]?\s*(.*)$/i;
/** Last-resort salvage for a reply-like label that doesn't fit REPLY_LABEL_RE, e.g. "The same Reply can be given to Objection 2." */
const REPLY_FALLBACK_RE = /(repl(?:y|ies)|answer)/i;

function parseArticleSections(paragraphs: JSDOMElement[], where: string): { objections: Objection[]; sedContra: SedContra[]; respondeo: string | null; replies: Reply[] } {
  const sections: Section[] = [];
  let current: Section | null = null;
  let sedContraCount = 0;
  let respondeoCount = 0;

  for (const p of paragraphs) {
    const first = p.children[0];
    const label = first && first.tagName === 'STRONG' ? cleanText(first.textContent ?? '') : null;
    // A couple of pages (1067.htm, 1068.htm) phrase the respondeo opening as
    // plain, unmarked text — "I answer, then, with Dionysius ... that," /
    // "I answer with Augustine ... that," — instead of the usual
    // `<strong>I answer that,</strong>`. Recognized regardless of `label` so
    // it starts a fresh respondeo section rather than being silently folded
    // into whatever section preceded it (verified: on 1068.htm art.2 this
    // paragraph directly follows "On the contrary,", so without this check
    // it would wrongly become part of the sed contra text).
    const unmarkedRespondeo = !label && /^I answer,?\s+(?:then,?\s+)?with\b[\s\S]*?\bthat,/i.test(cleanText(p.textContent ?? ''));

    let kind: Section['kind'] | null = null;
    let num: number | null = null;
    let multiNums: number[] | null = null;
    let m: RegExpExecArray | null;

    if (label) {
      if ((m = /^Objection\s+(\d+)\.?\s*(.*)$/.exec(label))) {
        kind = 'objection';
        num = Number(m[1]);
        if (m[2] && m[2].length > 0) {
          // e.g. 5071.htm art.3: "<strong>Objection 5. On the contrary,</strong>" — a
          // source markup slip merges a stray "On the contrary," fragment into the
          // Objection 5 label itself (no separate sed contra paragraph exists for
          // that article at all). The paragraph's real BODY text (after the whole
          // <strong> is removed) is genuinely Objection 5's argument — confirmed by
          // its matching "Reply to Objection 5." later on the same page — so it is
          // kept as Objection 5; only the stray label fragment is discarded.
          anomalies.push({ where, note: `Objection ${num} label contained extra trailing text merged into the <strong> tag (source markup irregularity): ${JSON.stringify(m[2])}. Discarded as label noise (not reading text); the paragraph's body text is still used as Objection ${num}.` });
        }
      } else if (/^On the contrary,?$/.test(label)) {
        kind = 'sedContra';
        sedContraCount += 1;
        num = sedContraCount;
        if (sedContraCount > 1) {
          anomalies.push({ where, note: `article has ${sedContraCount} "On the contrary," paragraphs — numbered sequentially (sedContra[${sedContraCount - 1}]), not merged.` });
        }
      } else if (/^I answer that,?$/.test(label)) {
        kind = 'respondeo';
      } else if ((m = REPLY_LABEL_RE.exec(label))) {
        const nums = [...m[1].matchAll(/\d+/g)].map((x) => Number(x[0]));
        if (nums.length === 0) {
          kind = 'reply';
          num = null;
          anomalies.push({ where, note: 'combined "Reply to the Objections" (no number) rather than individually-numbered replies — encoded as Reply { objectionNumber: null }.' });
        } else if (nums.length === 1) {
          kind = 'reply';
          num = nums[0];
        } else {
          multiNums = nums;
          anomalies.push({ where, note: `combined reply paragraph explicitly named multiple objections (${nums.join(', ')}) in its heading (${JSON.stringify(label)}) — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.` });
        }
      } else if (REPLY_FALLBACK_RE.test(label) && /Objection/i.test(label)) {
        // e.g. 1031.htm art.4: "The same Reply can be given to Objection 2." — a real
        // reply, just not phrased as "Reply to Objection N."; salvage rather than lose it.
        const nums = [...label.matchAll(/Objections?\s+(\d+)/gi)].map((x) => Number(x[1]));
        if (nums.length === 1) {
          kind = 'reply';
          num = nums[0];
        } else if (nums.length > 1) {
          multiNums = nums;
        }
        anomalies.push({ where, note: `unusually phrased reply heading ${JSON.stringify(label)} (not "Reply to Objection N.") — salvaged as a reply to objection number(s) ${JSON.stringify(nums)} rather than discarded.` });
      } else {
        anomalies.push({
          where,
          note: `unrecognized leading <strong> label ${JSON.stringify(label)} — this paragraph's text is preserved here (not in the structured schema) so nothing is lost: ${JSON.stringify(textAfterLeadingStrong(p))}`,
        });
      }
    }

    if (multiNums) {
      const text = textAfterLeadingStrong(p);
      const sharedParts: string[] = [text];
      for (const n of multiNums) sections.push({ kind: 'reply', num: n, parts: sharedParts });
      // `current` shares the same `parts` ARRAY (by reference) as every pushed
      // section above, so a later continuation paragraph appended via
      // `current.parts.push(...)` is visible from all of them at once.
      current = { kind: 'reply', num: multiNums[0], parts: sharedParts };
    } else if (kind === 'respondeo') {
      respondeoCount += 1;
      if (respondeoCount > 1) {
        anomalies.push({ where, note: `article has ${respondeoCount} "I answer that," paragraphs — text concatenated into a single respondeo string.` });
      }
      const text = textAfterLeadingStrong(p);
      const section: Section = { kind, num: null, parts: [text] };
      sections.push(section);
      current = section;
    } else if (kind) {
      const text = textAfterLeadingStrong(p);
      const section: Section = { kind, num, parts: [text] };
      sections.push(section);
      current = section;
    } else if (unmarkedRespondeo) {
      respondeoCount += 1;
      if (respondeoCount > 1) {
        anomalies.push({ where, note: `article has ${respondeoCount} "I answer that,"-equivalent paragraphs — text concatenated into a single respondeo string.` });
      }
      anomalies.push({ where, note: 'respondeo opening is plain unmarked text ("I answer ... with ... that,") rather than the usual `<strong>I answer that,</strong>` — recognized by wording, not markup.' });
      const text = cleanText(p.textContent ?? '');
      const section: Section = { kind: 'respondeo', num: null, parts: [text] };
      sections.push(section);
      current = section;
    } else if (label) {
      // unrecognized label already logged above; do not fold into the previous section.
      current = null;
    } else {
      const text = cleanText(p.textContent ?? '');
      if (text.length === 0) continue;
      if (!current) {
        anomalies.push({ where, note: `paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: ${JSON.stringify(text)}` });
        continue;
      }
      current.parts.push(text);
    }
  }

  const objections: Objection[] = sections.filter((s) => s.kind === 'objection').map((s) => ({ number: s.num!, text: s.parts.join(' ') }));
  const sedContra: SedContra[] = sections.filter((s) => s.kind === 'sedContra').map((s) => ({ number: s.num!, text: s.parts.join(' ') }));
  const respondeoSections = sections.filter((s) => s.kind === 'respondeo');
  const respondeo = respondeoSections.length > 0 ? respondeoSections.map((s) => s.parts.join(' ')).join(' ') : null;
  const replies: Reply[] = sections.filter((s) => s.kind === 'reply').map((s) => ({ objectionNumber: s.num, text: s.parts.join(' ') }));

  return { objections, sedContra, respondeo, replies };
}

function parsePage(html: string, where: string): PageParse {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const root = document.getElementById('springfield2');
  if (!root) {
    process.stderr.write(`STOP: ${where}: could not find <div id="springfield2"> content container.\n`);
    process.exit(1);
  }
  const h1s = root.querySelectorAll('h1');
  if (h1s.length !== 1) {
    process.stderr.write(`STOP: ${where}: expected exactly 1 <h1>, found ${h1s.length}.\n`);
    process.exit(1);
  }
  const h1Raw = cleanText(h1s[0].textContent ?? '');

  const nodes = root.querySelectorAll('h2, p');
  interface Bucket {
    number: number;
    headingRaw: string;
    paragraphs: JSDOMElement[];
  }
  const buckets: Bucket[] = [];
  let currentBucket: Bucket | null = null;
  for (const node of nodes) {
    if (node.tagName === 'H2') {
      const m = ARTICLE_ID_RE.exec(node.id ?? '');
      if (!m) {
        anomalies.push({ where, note: `<h2> found with unexpected id ${JSON.stringify(node.id)} (expected "articleN"); ignored, along with any paragraphs following it up to the next recognized <h2>.` });
        currentBucket = null;
        continue;
      }
      const headingRaw = cleanText(node.textContent ?? '');
      const bucket: Bucket = { number: Number(m[1]), headingRaw, paragraphs: [] };
      buckets.push(bucket);
      currentBucket = bucket;
    } else if (node.tagName === 'P') {
      if (currentBucket) currentBucket.paragraphs.push(node);
      // <p> elements before the first recognized <h2> are not expected (the
      // page's article-blurb enumeration is an <ol>, not <p> tags) and are
      // silently dropped if ever present — verified absent on every sampled page.
    }
  }
  if (buckets.length === 0) {
    process.stderr.write(`STOP: ${where}: no <h2 id="articleN"> found.\n`);
    process.exit(1);
  }

  const articles: RawArticle[] = buckets.map((b, i) => {
    const expectedNum = i + 1;
    if (b.number !== expectedNum) {
      anomalies.push({ where, note: `article heading numbering out of sequence at position ${i}: expected ${expectedNum}, <h2 id> gave ${b.number}. The <h2>'s own number was used.` });
    }
    let title: string;
    const hm = ARTICLE_HEADING_RE.exec(b.headingRaw);
    if (hm && hm[2].trim().length > 0) {
      title = hm[2].trim();
    } else {
      anomalies.push({ where: `${where} art.${b.number}`, note: `article heading did not cleanly match "Article N. <title>"; used the full heading text verbatim as title: ${JSON.stringify(b.headingRaw)}` });
      title = b.headingRaw;
    }
    const artWhere = `${where} art.${b.number}`;
    const { objections, sedContra, respondeo, replies } = parseArticleSections(b.paragraphs, artWhere);
    if (respondeo === null) {
      anomalies.push({ where: artWhere, note: 'no "I answer that," paragraph found on this page; respondeo is null (not fabricated).' });
    }
    if (objections.length === 0) {
      anomalies.push({ where: artWhere, note: 'no Objection paragraphs found on this page.' });
    }
    // Cross-check the printed Objection/Reply numbers against each other. New
    // Advent's own transcription is not perfectly internally consistent on a
    // handful of pages — e.g. Part I q.13 a.10 prints "Reply to Objection 1.",
    // then jumps straight to "Reply to Objection 4." and "Reply to Objection
    // 5." with only 3 Objections on the page (no Objection/Reply 2 or 3 at
    // all). This is a genuine irregularity in the source itself, not a
    // parsing artifact (verified directly against the raw HTML); the numbers
    // are kept exactly as printed and simply flagged here rather than
    // silently renumbered or guessed at.
    const objNums = objections.map((o) => o.number);
    const sortedObjNums = [...objNums].sort((x, y) => x - y);
    const isCleanSequence = sortedObjNums.every((n, i) => n === i + 1);
    if (!isCleanSequence) {
      anomalies.push({ where: artWhere, note: `printed Objection numbers are ${JSON.stringify(objNums)}, not a clean 1..${objNums.length} sequence (gap and/or duplicate) — kept exactly as printed.` });
    }
    for (const r of replies) {
      if (r.objectionNumber !== null && !objNums.includes(r.objectionNumber)) {
        anomalies.push({ where: artWhere, note: `"Reply to Objection ${r.objectionNumber}" has no matching Objection ${r.objectionNumber} on this page (printed Objection numbers: ${JSON.stringify(objNums)}) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.` });
      }
    }
    return { number: b.number, title, objections, sedContra, respondeo, replies };
  });

  return { h1Raw, articles };
}

// --- assembly ----------------------------------------------------------

function toArticleObjs(raw: RawArticle[], questionCitation: string): Article[] {
  return raw.map((a) => ({
    number: a.number,
    citation: `${questionCitation} a. ${a.number}`,
    title: a.title,
    objections: a.objections,
    sedContra: a.sedContra,
    respondeo: a.respondeo,
    replies: a.replies,
  }));
}

function buildQuestion(meta: PartMeta, qNum: number): Question {
  const qStr = String(qNum).padStart(3, '0');
  const slug = `${meta.digit}${qStr}`;
  const where = `summa-en / ${slug}.htm`;
  const file = join(RAW_DIR, `${slug}.html`);
  if (!existsSync(file)) {
    process.stderr.write(`STOP: ${where}: missing raw HTML cache file ${file} — run fetch.ts first.\n`);
    process.exit(1);
  }
  const html = readFileSync(file, 'utf8');
  const { h1Raw, articles } = parsePage(html, where);

  const hm = QUESTION_H1_RE.exec(h1Raw);
  if (!hm) {
    process.stderr.write(`STOP: ${where}: <h1> did not match "Question N. <Title>": ${JSON.stringify(h1Raw)}\n`);
    process.exit(1);
    throw new Error('unreachable');
  }
  const qNumFromH1 = Number(hm[1]);
  if (qNumFromH1 !== qNum) {
    anomalies.push({ where, note: `<h1> question number (${qNumFromH1}) does not match the URL-derived question number (${qNum}); the URL-derived number was used as authoritative (it is how the page was fetched).` });
  }
  const title = hm[2].trim().length > 0 ? hm[2].trim() : null;
  if (title === null) {
    anomalies.push({ where, note: '<h1> had no title text after "Question N."; Question.title left null rather than fabricated.' });
  }

  const questionCitation = `${meta.code} q. ${qNum}`;
  return {
    number: qNum,
    citation: questionCitation,
    title,
    prooemium: null,
    articles: toArticleObjs(articles, questionCitation),
  };
}

interface AppendixMeta {
  file: string;
  number: number;
  appendix: 'I' | 'II';
  appendixNumber: number;
  allowMissingQuestionPrefix?: boolean;
}

function buildAppendixQuestion(meta: AppendixMeta): Question {
  const where = `summa-en / ${meta.file}`;
  const file = join(RAW_DIR, meta.file);
  if (!existsSync(file)) {
    process.stderr.write(`STOP: ${where}: missing raw HTML cache file ${file} — run fetch.ts first.\n`);
    process.exit(1);
  }
  const html = readFileSync(file, 'utf8');
  const { h1Raw, articles } = parsePage(html, where);

  let title: string | null;
  const hm = QUESTION_H1_RE.exec(h1Raw);
  if (hm) {
    title = hm[2].trim().length > 0 ? hm[2].trim() : null;
  } else if (meta.allowMissingQuestionPrefix) {
    title = h1Raw.length > 0 ? h1Raw : null;
    anomalies.push({
      where,
      note: `<h1> has no "Question N." prefix — it reads just ${JSON.stringify(h1Raw)}. Judgement call: this is New Advent's own heading/section label for this appendix question ("${h1Raw}"), not a generic page/site label, so it was used verbatim as this question's title (title != null) rather than set to null.`,
    });
  } else {
    process.stderr.write(`STOP: ${where}: <h1> did not match "Question N. <Title>" and no fallback was configured: ${JSON.stringify(h1Raw)}\n`);
    process.exit(1);
    throw new Error('unreachable');
  }

  const questionCitation = `Suppl. App. ${meta.appendix} q. ${meta.appendixNumber}`;
  return {
    number: meta.number,
    citation: questionCitation,
    title,
    prooemium: null,
    articles: toArticleObjs(articles, questionCitation),
    appendix: meta.appendix,
    appendixNumber: meta.appendixNumber,
  };
}

// --- main ----------------------------------------------------------------

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  anomalies.push({
    where: 'summa-en / (work level)',
    note:
      'Every Question.prooemium is null throughout this edition. New Advent prints no continuous prooemium ' +
      'prose before Article 1 (unlike the Latin source, which has one); each page\'s <ol> is a linked ' +
      'enumeration of short article blurbs (not prose) and was never used as prooemium text.',
  });
  anomalies.push({
    where: 'summa-en / tertia-pars-en (part level)',
    note:
      'Part.prooemium is null for tertia-pars-en. The Latin Tertia Pars carries a part-level prooemium, but ' +
      'this per-question page structure (one New Advent page per Question, no separate part-introduction page) ' +
      'has no clean English-source equivalent to extract it from. This is a disclosed scope limit, not an ' +
      'oversight; no prooemium text has been fabricated or substituted.',
  });
  anomalies.push({
    where: 'summa-en / (work level)',
    note:
      'Inline cross-reference links (<a href="../cathen/...">, ../bible/..., etc.) are stripped to their plain ' +
      'anchor text throughout, same as every other importer in this repo strips wiki/HTML transport scaffolding ' +
      '— this is ordinary HTML-transport cleanup, not a content change. HTML entities are decoded by jsdom\'s ' +
      'own HTML parsing (no separate entity-decode step); only whitespace is collapsed afterwards.',
  });

  const parts: Record<string, Part> = {};
  for (const meta of PART_METAS) {
    const questions: Question[] = [];
    for (let q = 1; q <= meta.count; q++) {
      questions.push(buildQuestion(meta, q));
    }
    const part: Part = {
      id: meta.partId,
      code: meta.code,
      latinTitle: meta.latinTitle,
      shortTitle: meta.shortTitle,
      prooemium: null,
      questions,
    };
    if (meta.compilationNote) part.compilationNote = meta.compilationNote;
    parts[meta.digit] = part;
    process.stdout.write(`parsed part ${meta.digit} (${meta.shortTitle}): ${questions.length} questions\n`);
  }

  // --- Supplementum appendices (continue the Supplementum's own numbering as 100/101/102) ---
  const suppl = parts['5']!;
  suppl.questions.push(
    buildAppendixQuestion({ file: 'appendix-1-1.html', number: 100, appendix: 'I', appendixNumber: 1 }),
  );
  suppl.questions.push(
    buildAppendixQuestion({ file: 'appendix-1-2.html', number: 101, appendix: 'I', appendixNumber: 2 }),
  );
  suppl.questions.push(
    buildAppendixQuestion({ file: 'appendix-2-1.html', number: 102, appendix: 'II', appendixNumber: 1, allowMissingQuestionPrefix: true }),
  );
  process.stdout.write(`appended 3 appendix questions to the Supplementum (numbers 100, 101, 102)\n`);

  // cross-check appendix numbering scheme against the Latin edition's part-suppl.json
  const latinSuppl = JSON.parse(readFileSync(join(LATIN_DIR, 'part-suppl.json'), 'utf8')) as Part;
  for (const q of suppl.questions.filter((q) => q.appendix)) {
    const latinMatch = latinSuppl.questions.find((lq) => lq.number === q.number);
    if (!latinMatch || latinMatch.appendix !== q.appendix || latinMatch.appendixNumber !== q.appendixNumber || latinMatch.citation !== q.citation) {
      anomalies.push({
        where: `summa-en / suppl q.${q.number}`,
        note: `appendix numbering/citation scheme did not match the Latin edition's part-suppl.json exactly. English: ${JSON.stringify({ number: q.number, appendix: q.appendix, appendixNumber: q.appendixNumber, citation: q.citation })}; Latin: ${JSON.stringify(latinMatch ? { number: latinMatch.number, appendix: latinMatch.appendix, appendixNumber: latinMatch.appendixNumber, citation: latinMatch.citation } : null)}`,
      });
    }
  }

  // --- write outputs -----------------------------------------------------
  for (const meta of PART_METAS) {
    writeJson(PART_FILE_NAME[meta.digit]!, parts[meta.digit]!);
  }
  writeJson('anomalies.json', anomalies);

  // --- console summary -----------------------------------------------------
  process.stdout.write('\nSummary:\n');
  let grandQ = 0;
  let grandA = 0;
  for (const meta of PART_METAS) {
    const part = parts[meta.digit]!;
    const qCount = part.questions.length;
    const aCount = part.questions.reduce((n, q) => n + q.articles.length, 0);
    grandQ += qCount;
    grandA += aCount;
    process.stdout.write(`  ${meta.shortTitle.padEnd(14)} ${String(qCount).padStart(3)} questions  ${String(aCount).padStart(5)} articles\n`);
  }
  process.stdout.write(`  ${'TOTAL'.padEnd(14)} ${String(grandQ).padStart(3)} questions  ${String(grandA).padStart(5)} articles\n`);
  process.stdout.write(`\n  ${anomalies.length} anomalies recorded -> data/summa-en/anomalies.json\n`);
  process.stdout.write('\nDone. Run `npx tsx scripts/import-summa-en/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
