/**
 * Shared single-pass tokenizer for the five Plato dialogue TEI sources
 * (Symposium, Phaedrus, Protagoras, Gorgias, Timaeus — Greek and English
 * witnesses alike). Regex-based, not jsdom, mirroring the technique in
 * scripts/import-euclid/index.ts.
 *
 * Source shape (confirmed by direct inspection of all ten raw files fetched
 * for this importer, not inferred):
 *   <body>
 *     <div n="urn:cts:..." type="edition|translation" xml:lang="...">
 *       <div type="textpart" subtype="section" resp="perseus" n="172">
 *         ... one or more <p> paragraphs ...
 *       </div>
 *       <div type="textpart" subtype="section" resp="perseus" n="173"> ... </div>
 *       ...
 *     </div>
 *   </body>
 * No Book-level division and no nesting below the Stephanus-page <div>
 * (verified: zero non-section, non-wrapper divs in any of the ten files).
 * `n` is the Stephanus PAGE number and is strictly monotonically increasing
 * by 1 with no gaps or duplicates in all ten files (independently verified
 * for each), matching the standard printed citation range for each dialogue.
 *
 * Each page <p> paragraph is spoken by one party via <said>, marked up in
 * one of (confirmed) THREE different nesting conventions, sometimes MIXED
 * within a single file:
 *   (a) <p><said who="#X"><label>X.</label> text...</said></p>        (Greek; most English files)
 *   (b) <said who="#X"><label>X.</label> <p>text...</p></said>        (Gorgias/Timaeus English; opening of Protagoras English)
 *   (c) <p><said who="#X"><label>X.</label> t1</said> <said who="#Y">...</said></p>  (grouped rapid exchanges)
 * This tokenizer does not special-case <said> at all — it is generic
 * transport markup, stripped like <q>/<quote>/<cit>/<l>/<term>/<emph>/
 * <foreign>/<gloss>/<placeName>/<name>/<date>/<corr>/<sic> (a project rule
 * for this import: "keep text content if any, drop the tag" — this applies
 * to genuine translation text, not to editorial apparatus). The elements
 * requiring real structural handling are the section <div>, <p>, <label>
 * (its text must survive even in convention (b), where it sits OUTSIDE any
 * <p>, as a sibling before it), <del> (editorially deleted — excluded from
 * the reading text, logged), <add> (editorial insertion — kept verbatim,
 * logged), and <note>/<bibl> (the Loeb translator's own footnotes and inline
 * citations — e.g. "Hom. Il.24.348" identifying a quoted line of Homer, or
 * "Tyrt. 12 (Bergk)" naming a quoted poet — EXCLUDED from the reading text
 * entirely like <del>, every occurrence logged verbatim; these are the
 * editor's apparatus, not a word the speaker actually says, and an earlier
 * version of this parser that kept their content produced garbled output,
 * e.g. "do not approve of Homer, Hom. Il.24.348 who said..." in
 * Protagoras-en). This handles convention (b)/(c) correctly with no
 * enumeration of cases: any free text encountered while NOT inside a <p> is
 * buffered as "pending" text and prepended to the NEXT <p> that opens
 * (this is exactly the printed speaker label in convention (b); if a <said>
 * genuinely carries no <label> — true of a few short unattributed embedded
 * remarks, e.g. Protagoras's <said direct="false"> doorkeeper aside — the
 * pending buffer is simply empty and nothing is prepended, faithfully
 * matching the print, which likewise shows no name there).
 *
 * Finer Stephanus sub-page lettering (<milestone n="172a" unit="section"
 * resp="Stephanus"/>) and the page-echo (<milestone unit="page"
 * resp="Stephanus" n="172"/>) are bare self-closing tags with no text
 * content of their own — stripped by the same generic mechanism as any
 * other tag, no dedicated handling needed. Attribute order on <milestone>
 * and the section <div> is NOT assumed fixed (verified to vary in principle
 * across this Perseus corpus, even though, by chance, all ten files fetched
 * for this particular import happen to use one consistent order) — the
 * page-number and subtype checks below use standalone attribute regexes,
 * not a fixed attribute sequence, and <milestone> tags are matched generically
 * regardless of internal attribute order or embedded newlines (both occur in
 * the raw sources, e.g. multi-line <milestone> tags in the Timaeus English
 * witness).
 */

import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Anomaly, Division, Passage } from './types.ts';

export interface ParseResult {
  divisions: Division[];
  anomalies: Anomaly[];
  delCount: number;
  addCount: number;
  gapCount: number;
  corrCount: number;
  sicCount: number;
  noteCount: number;
  biblCount: number;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

/**
 * Pre-scan for elements this tokenizer includes verbatim in the reading text
 * (never excluded, unlike <del>) but that are worth an individual anomaly
 * log entry: <gap/> (a genuine lacuna in a quoted verse fragment — no text
 * to preserve, nothing fabricated in its place), <corr> (a silent editorial
 * correction already applied by Burnet, printed as ordinary text) and <sic>
 * (Burnet's transcription flagged as printed-as-is, also ordinary text).
 * Counts are tiny (a handful across all five Greek dialogues, zero in every
 * English witness) so a simple indexOf scan is clearer than adding more
 * tokenizer state for something that never changes the output text.
 */
function scanInformationalTags(xml: string, workId: string, anomalies: Anomaly[]): { gap: number; corr: number; sic: number } {
  let gap = 0;
  let corr = 0;
  let sic = 0;
  {
    const re = /<gap\b[^>]*\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      gap += 1;
      const reasonM = m[0].match(/reason="([^"]*)"/);
      const context = excerpt(xml.slice(Math.max(0, m.index - 60), m.index));
      anomalies.push({
        where: `${workId} / <gap/>`,
        note: `<gap${reasonM ? ` reason="${reasonM[1]}"` : ''}/> marks a genuine lacuna in a quoted verse fragment near "...${context}" — no text recoverable, nothing substituted.`,
      });
    }
  }
  for (const [tag, counterName] of [['corr', 'corr'], ['sic', 'sic']] as const) {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      if (counterName === 'corr') corr += 1;
      else sic += 1;
      anomalies.push({
        where: `${workId} / <${tag}>`,
        note:
          tag === 'corr'
            ? `<corr> — Burnet silently corrects the manuscript reading here; the corrected text "${excerpt(m[1])}" is what is kept (this importer never overrides an editor's own critical text).`
            : `<sic> — Burnet's transcription explicitly flags "${excerpt(m[1])}" as printed exactly as the manuscript/tradition gives it (a marked but unemended reading); kept verbatim.`,
      });
    }
  }
  return { gap, corr, sic };
}

export function parseDialogue(xml: string, workId: string): ParseResult {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail(`${workId}: no <body>...</body> found in source XML`);
  let body = xml.slice(bodyStart, bodyEnd);

  const anomalies: Anomaly[] = [];

  // <head>...</head> is the work's own title (e.g. "The Symposium",
  // "Ἀπολογία Σωκράτους"), printed once at the very top of the source. In
  // five of the six dialogues that carry one, it sits outside the first
  // <div type="textpart" subtype="section">, so it's already outside
  // anything this parser extracts - a no-op here. In Symposium-en
  // specifically it sits INSIDE the first section div, ahead of the
  // opening <p>, so without this strip it would be swept up as ordinary
  // "pending" text and glued onto the dialogue's first paragraph ("The
  // Symposium Apollodorus tells his Companions..."), duplicating the title
  // the app's own UI already shows. Stripped here, uniformly, rather than
  // leaving it to accidental div placement.
  const headMatch = /<head>([\s\S]*?)<\/head>/.exec(body);
  if (headMatch) {
    anomalies.push({
      where: workId,
      note: `<head> (the work's own title, "${headMatch[1].trim()}") stripped - the app's own UI already shows the work title; kept out of the reading text to avoid duplicating it inline.`,
    });
    body = body.replace(/<head>[\s\S]*?<\/head>/, '');
  }

  const { gap: gapCount, corr: corrCount, sic: sicCount } = scanInformationalTags(body, workId, anomalies);

  const TOKEN_RE = /<div\b[^>]*>|<\/div>|<p>|<\/p>|<label>|<\/label>|<del>|<\/del>|<add>|<\/add>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<[^>]+>/g;

  const divisions: Division[] = [];
  const stack: Array<'other' | 'section'> = [];

  let currentDiv: Division | null = null;
  let pageParagraphs: string[] = [];
  let pageDelExcerpts: string[] = [];
  let pageAddExcerpts: string[] = [];

  let inP = false;
  let buf = '';
  /** free text seen while NOT inside a <p> (e.g. a <label> sitting before a <p> sibling, convention (b) above); prepended to the next <p> that opens */
  let pendingBuf = '';

  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let delCount = 0;
  let addCount = 0;

  let noteDepth = 0;
  let noteBuf = '';
  let biblDepth = 0;
  let biblBuf = '';
  let noteCount = 0;
  let biblCount = 0;

  function onText(s: string): void {
    if (s.length === 0) return;
    if (delDepth > 0) {
      delBuf += s;
      return; // excluded entirely from the reading text
    }
    if (noteDepth > 0) noteBuf += s;
    if (biblDepth > 0) biblBuf += s;
    if (noteDepth > 0 || biblDepth > 0) return; // apparatus, not the speaker's own words
    if (addDepth > 0) addBuf += s;
    if (inP) buf += s;
    else pendingBuf += s;
  }

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    if (m.index > lastIndex) onText(body.slice(lastIndex, m.index));
    lastIndex = TOKEN_RE.lastIndex;
    const tok = m[0];

    // Every stripped tag boundary gets a single space inserted into whichever
    // buffer is currently active, mirroring this repo's existing convention
    // for stripped <lb>/<pb> line/page-break artefacts (see
    // scripts/import-isagoge-grc/index.ts, scripts/import-euclid/index.ts):
    // "so two words are never silently fused together". Real, already-present
    // whitespace around the tag makes this a no-op (collapseWs later collapses
    // any run of whitespace to one space and trims edges); it only matters
    // where the source genuinely abuts a stripped tag directly against
    // adjoining text with none — confirmed to happen here, e.g. an inlined
    // <note>/<bibl> citation glued straight onto the preceding word with no
    // source space ("Homer,<note>...Hom. Il.24.348</note>").
    onText(' ');

    if (tok.startsWith('<div')) {
      const isSection = tok.includes('subtype="section"');
      if (isSection) {
        const nm = tok.match(/\bn="(\d+)"/);
        if (!nm) fail(`${workId}: section <div> missing a numeric n="..." attribute: ${tok}`);
        stack.push('section');
        pageParagraphs = [];
        pageDelExcerpts = [];
        pageAddExcerpts = [];
        pendingBuf = '';
        currentDiv = {
          id: `sec-${nm[1]}`,
          number: nm[1],
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
      } else {
        stack.push('other');
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') {
        if (!currentDiv) fail(`${workId}: internal error — section </div> with no open Division`);
        if (pendingBuf.trim().length > 0) {
          const cleaned = cleanText(pendingBuf);
          if (cleaned.length > 0) {
            pageParagraphs.push(cleaned);
            anomalies.push({
              where: currentDiv.id,
              note: `Text found outside any <p> element on this Stephanus page (e.g. a trailing <label> with no following <p>, or stray sibling text): "${excerpt(cleaned)}" — kept as its own trailing paragraph rather than dropped.`,
            });
          }
        }
        if (pageParagraphs.length === 0) {
          fail(`${workId}: division ${currentDiv.id} ended with zero paragraphs`);
        }
        const passage: Passage = { n: '', text: pageParagraphs.join('\n\n'), ref: null };
        const notes: string[] = [];
        if (pageDelExcerpts.length > 0) notes.push(`${pageDelExcerpts.length} <del> exclusion(s)`);
        if (pageAddExcerpts.length > 0) notes.push(`${pageAddExcerpts.length} <add> insertion(s) kept`);
        if (notes.length > 0) passage.anomaly = notes.join('; ');
        currentDiv.passages.push(passage);
        divisions.push(currentDiv);
        currentDiv = null;
      }
    } else if (tok === '<p>') {
      inP = true;
      buf = pendingBuf.length > 0 ? `${pendingBuf} ` : '';
      pendingBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(buf);
      if (cleaned.length > 0) {
        pageParagraphs.push(cleaned);
      } else if (buf.trim().length > 0 || delBuf.trim().length > 0) {
        anomalies.push({
          where: currentDiv ? currentDiv.id : workId,
          note: 'A <p> paragraph cleaned to empty reading text (its only content was inside a <del> exclusion or non-letter markup); dropped rather than emitted empty.',
        });
      }
      buf = '';
    } else if (tok === '<del>') {
      delDepth += 1;
      if (delDepth === 1) delBuf = '';
    } else if (tok === '</del>') {
      delDepth = Math.max(0, delDepth - 1);
      if (delDepth === 0) {
        delCount += 1;
        const t = cleanText(delBuf);
        pageDelExcerpts.push(t);
        anomalies.push({
          where: currentDiv ? currentDiv.id : workId,
          note: `<del> excluded from the reading text: "${excerpt(t)}"`,
        });
        delBuf = '';
      }
    } else if (tok === '<add>') {
      addDepth += 1;
      if (addDepth === 1) addBuf = '';
    } else if (tok === '</add>') {
      addDepth = Math.max(0, addDepth - 1);
      if (addDepth === 0) {
        addCount += 1;
        const t = cleanText(addBuf);
        pageAddExcerpts.push(t);
        anomalies.push({
          where: currentDiv ? currentDiv.id : workId,
          note: `<add> editorial insertion, kept verbatim in the reading text: "${excerpt(t)}"`,
        });
        addBuf = '';
      }
    } else if (tok.startsWith('<note')) {
      noteDepth += 1;
      if (noteDepth === 1) noteBuf = '';
    } else if (tok === '</note>') {
      noteDepth = Math.max(0, noteDepth - 1);
      if (noteDepth === 0) {
        noteCount += 1;
        const t = cleanText(noteBuf);
        anomalies.push({
          where: currentDiv ? currentDiv.id : workId,
          note: `<note> excluded from the reading text (translator's footnote, not the speaker's own words): "${excerpt(t)}"`,
        });
        noteBuf = '';
      }
    } else if (tok.startsWith('<bibl')) {
      biblDepth += 1;
      if (biblDepth === 1) biblBuf = '';
    } else if (tok === '</bibl>') {
      biblDepth = Math.max(0, biblDepth - 1);
      if (biblDepth === 0) {
        biblCount += 1;
        const t = cleanText(biblBuf);
        anomalies.push({
          where: currentDiv ? currentDiv.id : workId,
          note: `<bibl> excluded from the reading text (editor's citation apparatus, not the speaker's own words): "${excerpt(t)}"`,
        });
        biblBuf = '';
      }
    }
    // <label>/</label>: no dedicated action — their text flows through onText()
    // exactly like any other inline tag's content (into buf if inP, else
    // pendingBuf), per the module doc-comment above.
    // Every other token (the generic `<[^>]+>` catch-all: <said>, <q>, <quote>,
    // <cit>, <l>, <term>, <emph>, <foreign>, <gloss>, <placeName>, <name>,
    // <date>, <corr>, <sic>, <milestone/>, <gap/>, the outer edition/
    // translation-wrapper close already handled above): tag stripped, no
    // action — its inner text (if any) was already captured by onText() as
    // ordinary free text between tokens. <note> and <bibl> are NOT part of
    // this catch-all (see their dedicated handlers above) — an earlier
    // version of this parser treated them the same as <q>/<quote>/etc.
    // ("strip tag, keep content"), which glued citation apparatus into the
    // middle of sentences (verified: "do not approve of Homer, Hom.
    // Il.24.348 who said that youth has highest grace..." in Protagoras-en,
    // where "Hom. Il.24.348" is a Loeb footnote citation, not part of what
    // Socrates says). Both are now excluded from the reading text entirely,
    // like <del>, with every occurrence still logged verbatim.
  }

  if (stack.length !== 0) fail(`${workId}: unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);

  return { divisions, anomalies, delCount, addCount, gapCount, corrCount, sicCount, noteCount, biblCount };
}
