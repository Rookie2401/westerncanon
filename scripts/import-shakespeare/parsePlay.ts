/**
 * Parses one play's raw body lines (PG100 / Globe-edition-derived text) into
 * a Division tree: an optional `dramatis-personae` Division, then one
 * top-level Division per ACT (id `act-N`) or per bare PROLOGUE/EPILOGUE/
 * INDUCTION label the edition prints at the top level (id = that label's
 * slug, e.g. `prologue`), in document order. An ACT (or INDUCTION, when the
 * edition gives it its own scenes, e.g. The Taming of the Shrew) carries
 * child Divisions `<id>-scene-M`, one per printed "SCENE M. <location>."
 * heading; a container's OWN `passages` (before its first child scene, or
 * when it has no scenes at all) hold whatever the edition places there with
 * no scene heading of its own - most commonly a per-act Chorus (Henry V) or
 * a Gower induction (Pericles), which this edition's body prints with NO
 * heading line at all (confirmed by direct inspection: only the play's own
 * front-matter Contents page labels these "Chorus."/etc; the running body
 * text goes straight from "ACT II" to the stage direction and speech). That
 * is disclosed per-play in anomalies.json, not silently normalised away.
 *
 * Speeches: one Passage per speech, speaker name exactly as printed (all
 * caps, trailing period) on its own first line, then the speech. A speech's
 * lines are verse (kept one-per-printed-line, joined with "\n") unless the
 * block looks like mechanically line-wrapped prose, detected by: does any
 * interior line begin with a lowercase letter? Real verse, in this
 * typesetting convention, capitalises the first word of every printed line
 * regardless of grammar; a lowercase interior line-start only happens when
 * PG100's plain-text renderer wrapped a prose paragraph mid-sentence at its
 * column width. Prose passages are reflowed to a single paragraph (lines
 * joined with a single space, collapsing that wrap artifact) - this mirrors
 * the schema's own English-prose convention (see genericTypes.ts) and does
 * NOT drop any words (verified by the text-accounting validator). A
 * standalone stage-direction block (starts with "Enter"/"Exit"/"Exeunt"/
 * "Re-enter"/a bracketed "[_..._]" direction, etc.) becomes its own Passage
 * with no speaker line; a direction printed inline within a speech (e.g.
 * "[_Aside._]" prefixed on a dialogue line) stays inline, on the same
 * printed line, exactly as the source sets it.
 */

import { cleanLine, firstWord, isSpeakerCue, romanToInt } from './text.ts';
import type { Anomaly } from './text.ts';

export interface RawPassage {
  speaker: string | null;
  /** raw, cleaned source lines making up this passage (pre verse/prose join) */
  lines: string[];
}

export interface RawDivision {
  id: string;
  number: string | null;
  sourceHeading: string | null;
  children: RawDivision[];
  passages: RawPassage[];
}

export interface ContentsEntry {
  actLabel: string; // "ACT I" or a bare label like "PROLOGUE"
  scenes: string[]; // scene heading text as listed in Contents, e.g. "Scene I. Elsinore...."
}

export interface ParsedPlay {
  dramatisPersonae: string[] | null;
  sceneNote: string | null;
  contents: ContentsEntry[];
  divisions: RawDivision[];
  anomalies: Anomaly[];
}

const ACT_RE = /^ACT\s+([IVXLCDM]+)\.?$/;
const TOP_LABEL_RE = /^(?:THE\s+)?(PROLOGUE|EPILOGUE|INDUCTION)\.?$/;
// Case-insensitive on "SCENE": confirmed by direct inspection that Pericles
// (this edition only) prints its Act IV, Scenes I-II headings in title case
// ("Scene I. Tarsus...") rather than the all-caps "SCENE I. ..." used
// everywhere else in the corpus - a genuine PG100 transcription irregularity,
// not normalised here (the captured `heading` keeps the line's own casing).
const SCENE_RE = /^SCENE\s+([IVXLCDM]+)\.\s*(.*)$/i;
const CONTENTS_ACT_RE = /^ACT\s+([IVXLCDM]+)$/;
const CONTENTS_SCENE_RE = /^Scene\s+([IVXLCDM]+)\.\s*(.*)$/;
// The Contents page prints Prologue/Epilogue/Induction/Chorus sub-entries in
// title case ("Prologue.", "Chorus."), not the body's own all-caps form, and
// (confirmed by direct inspection, Troilus and Cressida) sometimes puts a
// blank line before one - so the Contents-block-end "peek" below needs its
// own case-insensitive match for these, distinct from the body-level
// TOP_LABEL_RE (which is deliberately case-sensitive: the body always prints
// these fully capitalised - see that constant's own comment).
const CONTENTS_LABEL_RE = /^(?:The\s+)?(Prologue|Epilogue|Induction|Chorus)\.?$/i;
const STAGE_OPENERS = /^(Enter|Exit|Exeunt|Re-enter|Flourish|Sennet|Alarum|Alarums|Shout|Shouts|Drum|Drums|Trumpet|Trumpets|Trumpets sound|Within|A cry|Cornets|Horns|Music|Song|Thunder|Lightning|A noise|A tucket|A short|Sound|Scene|Here|They|The|Manet|Manent)\b/;

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (shakespeare, ${where}): ${msg}\n`);
  process.exit(1);
}

function isBlank(l: string | undefined): boolean {
  return l === undefined || l.trim() === '';
}

/** true if `line` looks like a stage direction opener rather than dialogue
 *  continuation: bracketed, or begins with a recognised direction verb. */
function looksLikeStageDirection(line: string): boolean {
  const t = line.trim();
  if (t.startsWith('[')) return true;
  return STAGE_OPENERS.test(t);
}

function classifyProse(dialogueLines: string[]): boolean {
  // true => prose (reflow). Any interior line (not the first) starting with
  // a lowercase letter is decisive: real verse always capitalises the first
  // word of a printed line.
  for (let k = 1; k < dialogueLines.length; k++) {
    const w = firstWord(dialogueLines[k]!);
    if (w.length > 0 && w[0] === w[0]!.toLowerCase() && w[0] !== w[0]!.toUpperCase()) return true;
  }
  return false;
}

export function joinPassageText(speaker: string | null, lines: string[]): string {
  const prose = classifyProse(lines);
  const body = prose ? lines.map((l) => l.trim()).join(' ').replace(/\s+/g, ' ').trim() : lines.map((l) => l.trim()).join('\n');
  return speaker === null ? body : `${speaker}\n${body}`;
}

/** Parses a slice of body lines (between two structural boundaries) into a
 *  flat list of RawPassages: blank-line-delimited blocks, each a speech
 *  (starts with a speaker cue), a stand-alone stage direction, or a
 *  continuation of the previous passage (a stanza/paragraph break inside one
 *  speech). */
function parsePassages(lines: string[], where: string, anomalies: Anomaly[]): RawPassage[] {
  const passages: RawPassage[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isBlank(lines[i])) {
      i++;
      continue;
    }
    // collect one blank-line-delimited block
    const block: string[] = [];
    while (i < lines.length && !isBlank(lines[i])) {
      block.push(cleanLine(lines[i]!));
      i++;
    }
    const first = block[0]!;
    if (isSpeakerCue(first)) {
      passages.push({ speaker: first, lines: block.slice(1) });
    } else if (looksLikeStageDirection(first) || passages.length === 0) {
      passages.push({ speaker: null, lines: block });
    } else {
      // continuation of the previous passage (stanza/paragraph break)
      const prev = passages[passages.length - 1];
      if (!prev) {
        anomalies.push({ where, note: `orphan continuation block with no preceding passage, kept as its own unattributed passage: ${JSON.stringify(block[0]!.slice(0, 60))}` });
        passages.push({ speaker: null, lines: block });
      } else {
        prev.lines.push(...block);
      }
    }
  }
  return passages;
}

function parseContentsBlock(lines: string[], startAt: number): { entries: ContentsEntry[]; endAt: number } {
  let i = startAt;
  const entries: ContentsEntry[] = [];
  let current: ContentsEntry | null = null;
  while (i < lines.length) {
    const t = lines[i]!.trim();
    if (t === '') {
      // Contents block ends at a run of blank lines (one OR MORE - some
      // plays, e.g. All's Well, print two consecutive blank lines between
      // each Act's own scene list, confirmed by direct inspection) followed
      // by a non-Contents-shaped line (Dramatis Personae / a "SCENE:" note /
      // a body ACT/SCENE heading with no leading Contents-style listing).
      // Skip the WHOLE run of blanks before peeking, so a double blank
      // between two Act entries is not mistaken for the block's end.
      let k = i + 1;
      while (k < lines.length && lines[k]!.trim() === '') k++;
      const peek = (lines[k] ?? '').trim();
      if (peek === '' || (!CONTENTS_ACT_RE.test(peek) && !CONTENTS_SCENE_RE.test(peek) && !CONTENTS_LABEL_RE.test(peek))) {
        i = k;
        break;
      }
      i = k;
      continue;
    }
    if (CONTENTS_ACT_RE.test(t) || CONTENTS_LABEL_RE.test(t)) {
      current = { actLabel: t, scenes: [] };
      entries.push(current);
    } else if (current) {
      current.scenes.push(t);
    }
    i++;
  }
  return { entries, endAt: i };
}

export function parsePlayBody(bodyLines: string[], sourceTitle: string, where: string): ParsedPlay {
  const anomalies: Anomaly[] = [];
  let i = 0;
  if (bodyLines[i]!.trim() !== sourceTitle) fail(where, `expected title line ${JSON.stringify(sourceTitle)} at start of body, got ${JSON.stringify(bodyLines[i])}`);
  i++;
  while (isBlank(bodyLines[i])) i++;
  if (bodyLines[i]!.trim() !== 'Contents') fail(where, `expected "Contents" heading, got ${JSON.stringify(bodyLines[i])}`);
  i++;
  while (isBlank(bodyLines[i])) i++;
  const { entries: contents, endAt } = parseContentsBlock(bodyLines, i);
  i = endAt;
  while (isBlank(bodyLines[i])) i++;

  // Dramatis Personae (optional - absent for Richard II in this edition)
  let dramatisPersonae: string[] | null = null;
  if (bodyLines[i]!.trim() === 'Dramatis Personæ') {
    i++;
    while (isBlank(bodyLines[i])) i++;
    const cast: string[] = [];
    while (i < bodyLines.length) {
      const t = bodyLines[i]!.trim();
      if (t === '') {
        i++;
        continue;
      }
      // NOT a TOP_LABEL_RE break here: confirmed by direct inspection that
      // several plays' own Dramatis Personae list personified roles named
      // "PROLOGUE"/"EPILOGUE" (e.g. Henry VIII, The Two Noble Kinsmen) as
      // ordinary cast entries - a bare "SCENE[.:]" note or the next ACT
      // heading is what actually ends the cast list in every case checked.
      if (/^SCENE[.:]/.test(t) || ACT_RE.test(t)) break;
      cast.push(cleanLine(bodyLines[i]!));
      i++;
    }
    dramatisPersonae = cast;
  }

  // optional whole-play "SCENE. <setting>" / "SCENE: <setting>" note
  let sceneNote: string | null = null;
  if (/^SCENE[.:]/.test(bodyLines[i]!.trim())) {
    const noteLines: string[] = [];
    while (i < bodyLines.length && !isBlank(bodyLines[i])) {
      noteLines.push(bodyLines[i]!.trim());
      i++;
    }
    sceneNote = cleanLine(noteLines.join(' '));
  }
  while (isBlank(bodyLines[i])) i++;

  // Now walk the remaining lines: top-level boundaries are ACT_RE or
  // TOP_LABEL_RE; within a container, SCENE_RE starts a child scene.
  interface Boundary {
    kind: 'act' | 'label' | 'scene';
    line: number;
    roman?: string;
    text: string;
    heading: string;
  }
  const boundaries: Boundary[] = [];
  for (let j = i; j < bodyLines.length; j++) {
    const t = bodyLines[j]!.trim();
    if (t === '') continue;
    const actM = ACT_RE.exec(t);
    const labelM = TOP_LABEL_RE.exec(t);
    const sceneM = SCENE_RE.exec(t);
    if (actM) boundaries.push({ kind: 'act', line: j, roman: actM[1], text: t, heading: t });
    else if (labelM) boundaries.push({ kind: 'label', line: j, text: t, heading: t, roman: labelM[1] });
    else if (sceneM) boundaries.push({ kind: 'scene', line: j, roman: sceneM[1], text: t, heading: t });
  }
  if (boundaries.length === 0) fail(where, 'no ACT/PROLOGUE/EPILOGUE/INDUCTION/SCENE boundaries found in play body');

  // A bare "PROLOGUE"/"EPILOGUE"/"INDUCTION" line found NESTED between the
  // first and last ACT/SCENE boundary is not a real top-level heading: it is
  // a SPEAKER CUE for a character literally named Prologue/Epilogue playing
  // a part within a scene (confirmed by direct inspection: A Midsummer
  // Night's Dream's Act V "Pyramus and Thisbe" play-within-the-play has
  // Quince speak as "PROLOGUE."; The Two Noble Kinsmen likewise has an
  // in-scene "Prologue"/"Epilogue" speaker for its morris/wooer interludes).
  // A genuine top-level label only ever occurs BEFORE the first ACT/SCENE or
  // AFTER the last one, so any 'label' boundary strictly inside that span is
  // demoted back into ordinary passage content here, before the top-level
  // walk below ever sees it.
  // Pass A: a bare label heading is sometimes immediately followed by its
  // OWN speaker's cue of the identical word (confirmed: The Two Noble
  // Kinsmen prints "PROLOGUE" as the section heading, then "PROLOGUE." as
  // the speaker cue for the character named Prologue who delivers it - two
  // matches for one logical unit). Two consecutive same-word 'label'
  // boundaries (nothing else between them) are merged into one, keeping the
  // first's position; the second's own line then simply becomes ordinary
  // content of that same container.
  const merged: Boundary[] = [];
  for (const b of boundaries) {
    const prev = merged[merged.length - 1];
    if (b.kind === 'label' && prev && prev.kind === 'label' && prev.roman === b.roman) continue;
    merged.push(b);
  }
  boundaries.length = 0;
  boundaries.push(...merged);

  // Pass B: a bare "PROLOGUE"/"EPILOGUE"/"INDUCTION" line is not a real
  // top-level heading unless it sits in the one structurally valid place for
  // its kind - PROLOGUE/INDUCTION strictly before the play's first ACT/SCENE,
  // EPILOGUE strictly as the LAST label remaining. Anywhere else it is a
  // SPEAKER CUE for a character literally named Prologue/Epilogue playing a
  // part within a scene (confirmed by direct inspection: A Midsummer Night's
  // Dream's Act V "Pyramus and Thisbe" play-within-the-play has Quince
  // deliver two further such addresses). Demoted labels are simply dropped
  // from `boundaries`, so their lines fall back into whatever scene's
  // ordinary passage content already spans them.
  const actOrSceneLines = boundaries.filter((b) => b.kind === 'act' || b.kind === 'scene').map((b) => b.line);
  const demoted = new Set<Boundary>();
  if (actOrSceneLines.length > 0) {
    const firstLine = Math.min(...actOrSceneLines);
    const labelIndices = boundaries.map((b, idx) => (b.kind === 'label' ? idx : -1)).filter((idx) => idx !== -1);
    const lastLabelIdx = labelIndices.length > 0 ? labelIndices[labelIndices.length - 1] : -1;
    boundaries.forEach((b, idx) => {
      if (b.kind !== 'label') return;
      const isProperlyPlaced = b.roman === 'EPILOGUE' ? idx === lastLabelIdx : b.line < firstLine;
      if (!isProperlyPlaced) {
        anomalies.push({ where, note: `A bare "${b.text}" line at body offset ${b.line} was found nested within the Act/Scene structure, not in the one structurally valid position for a top-level ${b.roman} - treated as a speaker cue (a character literally named ${b.roman}) within its enclosing scene, not as a top-level Division, per direct inspection of this passage.` });
        demoted.add(b);
      }
    });
  }
  const kept = boundaries.filter((b) => !demoted.has(b));
  boundaries.length = 0;
  boundaries.push(...kept);

  const divisions: RawDivision[] = [];
  let bIdx = 0;
  while (bIdx < boundaries.length) {
    const b = boundaries[bIdx]!;
    if (b.kind !== 'act' && b.kind !== 'label') fail(where, `expected a top-level ACT/PROLOGUE/EPILOGUE/INDUCTION boundary, found stray SCENE at line ${b.line}: ${JSON.stringify(b.text)}`);
    const containerId = b.kind === 'act' ? `act-${romanToInt(b.roman!)}` : b.roman!.toLowerCase();
    const containerNumber = b.kind === 'act' ? String(romanToInt(b.roman!)) : null;
    // gather this container's scene children (consecutive 'scene' boundaries
    // immediately following, until the next act/label boundary)
    let scanIdx = bIdx + 1;
    const sceneBoundaries: Boundary[] = [];
    while (scanIdx < boundaries.length && boundaries[scanIdx]!.kind === 'scene') {
      sceneBoundaries.push(boundaries[scanIdx]!);
      scanIdx++;
    }
    const containerEndLine = scanIdx < boundaries.length ? boundaries[scanIdx]!.line : bodyLines.length;

    const children: RawDivision[] = [];
    let ownPassages: RawPassage[] = [];
    if (sceneBoundaries.length === 0) {
      // no scenes at all under this container: everything is its own passages
      ownPassages = parsePassages(bodyLines.slice(b.line + 1, containerEndLine), `${where}/${containerId}`, anomalies);
    } else {
      // content before the first scene heading = container's own passages
      const firstScene = sceneBoundaries[0]!;
      const preface = bodyLines.slice(b.line + 1, firstScene.line);
      if (preface.some((l) => l.trim() !== '')) {
        ownPassages = parsePassages(preface, `${where}/${containerId}`, anomalies);
        anomalies.push({ where: `${where}/${containerId}`, note: `${ownPassages.length} passage(s) precede this container's first SCENE heading with no heading of its own printed in the body (e.g. a per-act Chorus or an induction-style opening) - kept as the container's own passages, before its child scenes.` });
      }
      for (let s = 0; s < sceneBoundaries.length; s++) {
        const sb = sceneBoundaries[s]!;
        const sEnd = s + 1 < sceneBoundaries.length ? sceneBoundaries[s + 1]!.line : containerEndLine;
        const sceneLines = bodyLines.slice(sb.line + 1, sEnd);
        const sceneId = `${containerId}-scene-${romanToInt(sb.roman!)}`;
        const scenePassages = parsePassages(sceneLines, `${where}/${sceneId}`, anomalies);
        children.push({ id: sceneId, number: String(romanToInt(sb.roman!)), sourceHeading: sb.heading, children: [], passages: scenePassages });
      }
    }
    divisions.push({ id: containerId, number: containerNumber, sourceHeading: b.heading, children, passages: ownPassages });
    bIdx = scanIdx;
  }

  return { dramatisPersonae, sceneNote, contents, divisions, anomalies };
}
