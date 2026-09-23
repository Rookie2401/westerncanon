/**
 * Parser for the 9 of this work's 11 Wikisource pages that turned out to be
 * ORDINARY WIKITEXT (like the Aristotle batch's wikitext.ts, not the
 * page-scan technique) - confirmed by direct inspection of each cached
 * response before this parser was written (see index.ts's PLAYS table).
 *
 * Source shape: the 1912 Athenian Society translation is prose, no line
 * numbers. Each play page carries, in order:
 *   ==Introduction==            - translator's critical essay (NOT imported;
 *                                  it is not speech-shaped and the app's
 *                                  generic-work schema has no slot for prose
 *                                  criticism - see about.json)
 *   ==Dramatis Personæ==        - a bulleted cast list ("* NAME.")
 *   =="The Play" / "'Title' by Aristophanes"==   - the play text itself
 *   ==Notes== / ==Footnotes==   - <references/> rendering (no extra content;
 *                                  the footnote text itself was already
 *                                  inline as <ref>...</ref> and is captured
 *                                  from there, not from this section)
 *
 * Within the play-text section, speeches are set off by a per-play speaker-
 * cue convention (verified per play, not assumed to be uniform):
 *   Shape A: `'''NAME'''<br/>` on its own line, speech follows.
 *            (Acharnians, Clouds, Birds, Frogs, Ecclesiazusae)
 *   Shape B: `NAME. speech...` - plain caps, no bold, period + space.
 *            (Knights, Wasps)
 *   Shape C: `'''NAME''': speech...` - bold name, colon, same paragraph.
 *            (Thesmophoriazusae, Plutus)
 * A cue may carry an inline stage direction immediately after the name,
 * `(''like this'')`; kept, converted to "[like this]", as the opening words
 * of that passage's speech (a disclosed importer convention - the source
 * prints it before the dialogue proper, this importer places it there too).
 * Any other `(''...'')` parenthetical appearing mid-speech is converted the
 * same way, in place.
 *
 * A stand-alone italicised `SCENE:` line (no speaker) becomes its own
 * bracketed stage-direction Passage with no speaker-name line.
 *
 * `<ref>...</ref>` footnotes are stripped from the flowing text and their
 * content kept, per this batch's brief, as a trailing `[Note N: ...]` line
 * on whichever Passage the marker fell in - N counts footnotes in the PLAY
 * BODY only (document order), starting at 1; Introduction-essay footnotes
 * are dropped along with the essay itself and do not consume a number.
 */

import { cleanText, decodeEntities, resolveTemplates, unwrapWikitext, type Anomaly } from './text.ts';

export type Shape = 'A' | 'B' | 'C';

export interface RawPassage {
  speaker: string | null;
  text: string;
  footnoteNumbers: number[];
}

export interface WikitextPlayResult {
  dramatisPersonae: string[];
  passages: RawPassage[];
  footnotes: Map<number, string>;
  speakerLabelsSeen: string[];
  anomalies: Anomaly[];
  introDropped: boolean;
}

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (aristophanes wikitext parser, ${where}): ${msg}\n`);
  process.exit(1);
}

function findHeadingLine(lines: string[], re: RegExp, from = 0): number {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i]!.trim())) return i;
  return -1;
}

/**
 * Pull out a `== Dramatis Personæ ==` section's cast-list entries. Two
 * conventions were found across this batch's 9 wikitext plays (verified per
 * play, not assumed uniform): most bullet each entry with `* NAME.`; Wasps
 * prints one bare (unbulleted) entry per blank-line-separated paragraph
 * instead. Both are handled here; whichever shape is NOT found for a given
 * play is simply absent from that play's output (never a failure by itself).
 */
function extractBulletSection(lines: string[], headingRe: RegExp, where: string): string[] {
  const start = findHeadingLine(lines, headingRe);
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^==[^=].*==\s*$/.test(lines[i]!.trim())) { end = i; break; }
  }
  const bulleted: string[] = [];
  for (let i = start + 1; i < end; i++) {
    const m = /^\*\s*(.+?)\s*$/.exec(lines[i]!);
    if (m) bulleted.push(m[1]!);
  }
  if (bulleted.length > 0) return bulleted;

  const bare: string[] = [];
  for (let i = start + 1; i < end; i++) {
    const t = lines[i]!.trim();
    if (t.length > 0) bare.push(t);
  }
  if (bare.length === 0) fail(where, 'Dramatis Personæ heading found but no cast-list entries (neither "* NAME" bullets nor bare lines) beneath it');
  return bare;
}

const SCENE_RE = /^SCENE:?\s*/i;

const SHAPE_A_CUE = /^'''([^']+)'''\s*(?:\(([^)]*)\))?\s*(?:<br\s*\/?>)?\s*/;
const SHAPE_B_CUE = /^([A-Z][A-Z0-9 .,'’ÆŒ&-]{0,70}?)\.\s+(?=\S)/;
const SHAPE_C_CUE = /^'''([^']+)'''\s*(?:\(([^)]*)\))?\s*:\s*/;

/** Strip italic/bold markers and resolve any inline templates ({{polytonic|...}} etc). */
function cleanStageDirection(s: string, where: string): string {
  return cleanText(decodeEntities(unwrapWikitext(resolveTemplates(s, where))));
}

export function parseWikitextPlay(content: string, shape: Shape, where: string): WikitextPlayResult {
  const anomalies: Anomaly[] = [];
  const lines = content.split('\n');

  const dpRaw = extractBulletSection(lines, /^==\s*Dramatis Person[æa]\s*==\s*$/i, where);
  const dramatisPersonae = dpRaw.map((l) => cleanStageDirection(l, where));

  // Locate the play-text section: from the play-title heading (or, for a page
  // with none at all - Plutus - straight after the header/transclusion
  // furniture) through to the trailing Notes/Footnotes heading.
  let bodyStart: number;
  const titleHeadingIdx = findHeadingLine(lines, /^==\s*(''.*''\s*by Aristophanes|The Play)\s*==\s*$/i);
  if (titleHeadingIdx !== -1) {
    bodyStart = titleHeadingIdx + 1;
  } else {
    // Plutus: no play-title heading. Body starts right after the last
    // transclusion/furniture line before the first speaker cue. The leading
    // {{header ... }} template is multi-line and must be skipped as a whole
    // balanced-brace block (its continuation lines, e.g. " | title = ...",
    // do not themselves start with "{{" or "<pages").
    let i = 0;
    let braceDepth = 0;
    for (; i < lines.length; i++) {
      const t = lines[i]!.trim();
      if (braceDepth > 0) {
        braceDepth += (t.match(/\{\{/g) ?? []).length - (t.match(/\}\}/g) ?? []).length;
        continue;
      }
      if (t === '') continue;
      if (t.startsWith('{{')) {
        braceDepth += (t.match(/\{\{/g) ?? []).length - (t.match(/\}\}/g) ?? []).length;
        continue;
      }
      if (/^<pages/.test(t) || /^\{\{ppb\}\}$/i.test(t)) continue;
      break;
    }
    bodyStart = i;
    anomalies.push({ where, note: 'This page prints no "==The Play=="/title heading at all (confirmed by direct inspection); the play-text section was taken to start at the first non-furniture line after the page transclusion markers.' });
  }
  const notesHeadingIdx = findHeadingLine(lines, /^==\s*(Notes|Footnotes)\s*==\s*$/i, bodyStart);
  const bodyEnd = notesHeadingIdx === -1 ? lines.length : notesHeadingIdx;
  if (notesHeadingIdx === -1) anomalies.push({ where, note: 'No trailing "==Notes==" / "==Footnotes==" heading found; the play-text section was taken through to the end of the page.' });

  const bodyLines = lines.slice(bodyStart, bodyEnd);

  // Split into blank-line-delimited blocks (wikitext paragraphs).
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const line of bodyLines) {
    if (line.trim() === '') {
      if (cur.length > 0) { blocks.push(cur.join('\n')); cur = []; }
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) blocks.push(cur.join('\n'));

  let footnoteN = 0;
  const footnotes = new Map<number, string>();
  const namedRefNumbers = new Map<string, number>();
  const speakerLabelsSeen: string[] = [];
  const passages: RawPassage[] = [];
  let curPassage: RawPassage | null = null;

  // Handles all three <ref> shapes this corpus uses: a plain `<ref>content
  // </ref>` (always a new footnote), a `<ref name="X">content</ref>` (new
  // footnote, AND remembered under name X for reuse), and a self-closing
  // `<ref name="X"/>` reusing an already-defined footnote (Knights reuses
  // "ref126" once - a footnote cited twice in the printed text keeps the
  // SAME note number both times, matching how Wikisource itself numbers it).
  const REF_RE = /<ref(?:\s+name="([^"]*)")?\s*(?:\/>|>([\s\S]*?)<\/ref>)/gi;

  // A footnote marker was a superscript in print; where the transcription
  // sets it between two words with no space ("Pergasae<ref>…</ref>I was"),
  // removing the marker must not glue the words together ("PergasaeI").
  const WORD_CHAR = /[\p{L}\p{N}]/u;
  let refSpacesInserted = 0;
  function extractFootnotes(block: string): { stripped: string; numbers: number[] } {
    const numbers: number[] = [];
    const stripped = block.replace(REF_RE, (m: string, name: string | undefined, inner: string | undefined, offset: number, whole: string) => {
      const before = offset > 0 ? whole[offset - 1]! : '';
      const after = whole[offset + m.length] ?? '';
      const glue = WORD_CHAR.test(before) && WORD_CHAR.test(after) ? ' ' : '';
      if (glue) refSpacesInserted += 1;
      if (inner === undefined) {
        // self-closing reuse of a named ref
        const n = name ? namedRefNumbers.get(name) : undefined;
        if (n === undefined) fail(where, `self-closing <ref name="${name}"/> reuses a name that was never defined earlier in the document`);
        numbers.push(n);
        return glue;
      }
      footnoteN += 1;
      footnotes.set(footnoteN, cleanStageDirection(inner, where));
      if (name) namedRefNumbers.set(name, footnoteN);
      numbers.push(footnoteN);
      return glue;
    });
    return { stripped, numbers };
  }

  function finishSpeech(text: string): string {
    // Convert any remaining parenthetical stage directions, in place.
    const withBrackets = text.replace(/\(([^()]*)\)/g, (_m, inner: string) => `[${cleanStageDirection(inner, where)}]`);
    return cleanText(unwrapWikitext(resolveTemplates(withBrackets, where)));
  }

  for (const rawBlock of blocks) {
    const { stripped, numbers } = extractFootnotes(rawBlock);
    const joined = stripped.split('\n').join(' ').replace(/\s+/g, ' ').trim();
    if (joined.length === 0) {
      // A block that was pure footnote marker(s) with nothing else: attach
      // its footnote(s) to the passage in progress rather than dropping them.
      if (numbers.length > 0 && curPassage) curPassage.footnoteNumbers.push(...numbers);
      continue;
    }

    // Stand-alone SCENE line.
    const sceneStripped = joined.replace(/^'{2,5}/, '').replace(/'{2,5}$/, '');
    if (SCENE_RE.test(sceneStripped) && !SHAPE_A_CUE.test(joined) && !SHAPE_C_CUE.test(joined)) {
      if (curPassage) passages.push(curPassage);
      const text = `[${finishSpeech(sceneStripped)}]`;
      curPassage = null;
      passages.push({ speaker: null, text, footnoteNumbers: numbers });
      continue;
    }

    const cueRe = shape === 'A' ? SHAPE_A_CUE : shape === 'B' ? SHAPE_B_CUE : SHAPE_C_CUE;
    const m = cueRe.exec(joined);
    if (m) {
      if (curPassage) passages.push(curPassage);
      const name = cleanStageDirection(m[1]!, where);
      speakerLabelsSeen.push(name);
      const inlineDirection = shape === 'B' ? null : (m[2] ?? null);
      const rest = joined.slice(m[0]!.length);
      const bodyText = inlineDirection ? `[${cleanStageDirection(inlineDirection, where)}] ${rest}` : rest;
      curPassage = { speaker: name, text: finishSpeech(bodyText), footnoteNumbers: [...numbers] };
      continue;
    }

    // No cue matched: continuation of the current speech, or an orphan block.
    const chunk = finishSpeech(joined);
    if (curPassage) {
      curPassage.text = `${curPassage.text} ${chunk}`.trim();
      curPassage.footnoteNumbers.push(...numbers);
    } else {
      anomalies.push({ where, note: `Orphan paragraph with no attributed speaker and not a "SCENE:" line, kept as its own unattributed passage: ${JSON.stringify(chunk.slice(0, 100))}` });
      passages.push({ speaker: null, text: chunk, footnoteNumbers: numbers });
    }
  }
  if (curPassage) passages.push(curPassage);
  if (refSpacesInserted > 0) {
    anomalies.push({ where, note: `${refSpacesInserted} footnote marker(s) stood between two words with no space in the transcription (the marker was a superscript in print); a single space was inserted where each marker was removed so the words are not run together. No letter was added or changed.` });
  }

  return { dramatisPersonae, passages, footnotes, speakerLabelsSeen, anomalies, introDropped: findHeadingLine(lines, /^==\s*Introduction\s*==\s*$/i) !== -1 };
}
