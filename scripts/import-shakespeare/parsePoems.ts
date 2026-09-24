/**
 * Parses the Sonnets and the five shorter/narrative poems from PG100's raw
 * body lines. Unlike the plays, each of these six works gets its own small,
 * hand-written parser below rather than one generic algorithm: each has a
 * genuinely different front-matter shape (a bare dedication epistle, an
 * "ARGUMENT" prose summary, a "THRENOS" sub-heading, 20 roman-numeral-
 * marked parts, ...), confirmed by direct inspection of the cached source
 * (see this module's own verification notes below and in about.json).
 *
 * Stanza convention: every poem Division here holds ONE passage whose text
 * joins each stanza's lines with "\n" and separates stanzas with a blank
 * line ("\n\n"), preserving the source's own stanza breaks exactly as
 * printed - per this batch's brief ("stanzas separated by a blank line").
 * Passage.n is '' and ref is null throughout (no line numbers are printed
 * for any of these works EXCEPT Venus and Adonis, which prints a right-
 * margin line-COUNT number every 4th line - typographic apparatus, not
 * part of the line's own text; it is stripped from the reading text here,
 * per this batch's instruction not to invent or carry any ref/n scheme, and
 * disclosed in anomalies.json/about.json rather than silently dropped.
 */

import { cleanLine } from './text.ts';
import type { RawDivision, RawPassage } from './parsePlay.ts';
import type { Anomaly } from './text.ts';

function isBlank(l: string | undefined): boolean {
  return l === undefined || l.trim() === '';
}

/** Splits lines into blank-line-delimited stanzas and joins them into one
 *  passage's text ("\n" within a stanza, "\n\n" between stanzas). */
function stanzasToPassage(lines: string[]): RawPassage {
  const stanzas: string[][] = [];
  let cur: string[] = [];
  for (const raw of lines) {
    if (isBlank(raw)) {
      if (cur.length) {
        stanzas.push(cur);
        cur = [];
      }
      continue;
    }
    cur.push(cleanLine(raw));
  }
  if (cur.length) stanzas.push(cur);
  const text = stanzas.map((s) => s.join('\n')).join('\n\n');
  return { speaker: null, lines: [text] };
}

// ---------------------------------------------------------------------------
// THE SONNETS
// ---------------------------------------------------------------------------

export function parseSonnets(bodyLines: string[], where: string, anomalies: Anomaly[]): RawDivision[] {
  let i = 0;
  if (bodyLines[i]!.trim() !== 'THE SONNETS') throw new Error(`${where}: expected "THE SONNETS" title`);
  i++;
  const divisions: RawDivision[] = [];
  while (i < bodyLines.length) {
    while (isBlank(bodyLines[i])) i++;
    if (i >= bodyLines.length) break;
    const numLine = bodyLines[i]!.trim();
    if (numLine === 'THE END') break;
    if (!/^\d+$/.test(numLine)) throw new Error(`${where}: expected a bare sonnet number, got ${JSON.stringify(bodyLines[i])} at line offset ${i}`);
    i++;
    while (isBlank(bodyLines[i])) i++;
    const sonnetLines: string[] = [];
    while (i < bodyLines.length && !isBlank(bodyLines[i])) {
      sonnetLines.push(cleanLine(bodyLines[i]!));
      i++;
    }
    if (sonnetLines.length !== 14) anomalies.push({ where: `${where}/sonnet-${numLine}`, note: `this sonnet has ${sonnetLines.length} printed lines, not the usual 14 (kept exactly as printed - a known textual peculiarity for some sonnets in this edition).` });
    divisions.push({
      id: `sonnet-${numLine}`,
      number: numLine,
      sourceHeading: numLine,
      children: [],
      passages: [{ speaker: null, lines: [sonnetLines.join('\n')] }],
    });
  }
  return divisions;
}

// ---------------------------------------------------------------------------
// A LOVER'S COMPLAINT - single continuous poem, no sub-headings
// ---------------------------------------------------------------------------

function parseLoversComplaint(bodyLines: string[]): RawDivision[] {
  const rest = bodyLines.slice(1); // drop title line
  return [{ id: 'text', number: null, sourceHeading: "A Lover's Complaint", children: [], passages: [stanzasToPassage(rest)] }];
}

// ---------------------------------------------------------------------------
// THE PASSIONATE PILGRIM - 20 roman-numeral-marked parts
// ---------------------------------------------------------------------------

const ROMAN_PART_RE = /^[IVXLC]+$/;

function romanToIntLocal(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let n = 0;
  for (let k = 0; k < roman.length; k++) {
    const cur = map[roman[k]!]!;
    const next = k + 1 < roman.length ? map[roman[k + 1]!]! : 0;
    n += cur < next ? -cur : cur;
  }
  return n;
}

function parsePassionatePilgrim(bodyLines: string[], where: string): RawDivision[] {
  const i = 1; // drop title
  const divisions: RawDivision[] = [];
  const markers: { roman: string; line: number }[] = [];
  for (let j = i; j < bodyLines.length; j++) {
    const t = bodyLines[j]!.trim();
    if (ROMAN_PART_RE.test(t)) markers.push({ roman: t, line: j });
  }
  if (markers.length !== 20) throw new Error(`${where}: expected 20 numbered parts, found ${markers.length}`);
  for (let k = 0; k < markers.length; k++) {
    const m = markers[k]!;
    const end = k + 1 < markers.length ? markers[k + 1]!.line : bodyLines.length;
    const partLines = bodyLines.slice(m.line + 1, end);
    const n = romanToIntLocal(m.roman);
    divisions.push({ id: `part-${n}`, number: String(n), sourceHeading: m.roman, children: [], passages: [stanzasToPassage(partLines)] });
  }
  return divisions;
}

// ---------------------------------------------------------------------------
// THE PHOENIX AND THE TURTLE - main poem, then a "THRENOS" section
// ---------------------------------------------------------------------------

function parsePhoenixAndTurtle(bodyLines: string[], where: string): RawDivision[] {
  const threnosIdx = bodyLines.findIndex((l) => l.trim() === 'THRENOS');
  if (threnosIdx === -1) throw new Error(`${where}: expected a "THRENOS" heading`);
  const main = bodyLines.slice(1, threnosIdx);
  const threnos = bodyLines.slice(threnosIdx + 1);
  return [
    { id: 'text', number: null, sourceHeading: 'The Phoenix and the Turtle', children: [], passages: [stanzasToPassage(main)] },
    { id: 'threnos', number: null, sourceHeading: 'Threnos', children: [], passages: [stanzasToPassage(threnos)] },
  ];
}

// ---------------------------------------------------------------------------
// THE RAPE OF LUCRECE - dedication epistle, "THE ARGUMENT.", then the poem
// ---------------------------------------------------------------------------

function parseLucrece(bodyLines: string[], where: string): RawDivision[] {
  const argIdx = bodyLines.findIndex((l) => l.trim() === 'THE ARGUMENT.');
  if (argIdx === -1) throw new Error(`${where}: expected "THE ARGUMENT." heading`);
  const dedication = bodyLines.slice(1, argIdx);
  // the poem's own text starts after the Argument's prose paragraph(s): the
  // next blank-line-delimited block boundary after argIdx that is followed
  // by verse (short lines) rather than more prose; empirically the Argument
  // is a single prose block, so the poem starts at the first non-blank line
  // after the Argument's block ends.
  let i = argIdx + 1;
  while (isBlank(bodyLines[i])) i++;
  const argLines: string[] = [];
  while (i < bodyLines.length && !isBlank(bodyLines[i])) {
    argLines.push(cleanLine(bodyLines[i]!));
    i++;
  }
  while (isBlank(bodyLines[i])) i++;
  const poemLines = bodyLines.slice(i);
  return [
    { id: 'dedication', number: null, sourceHeading: null, children: [], passages: [{ speaker: null, lines: [dedication.filter((l) => l.trim() !== '').map(cleanLine).join(' ')] }] },
    { id: 'argument', number: null, sourceHeading: 'The Argument', children: [], passages: [{ speaker: null, lines: [argLines.join(' ')] }] },
    { id: 'text', number: null, sourceHeading: 'The Rape of Lucrece', children: [], passages: [stanzasToPassage(poemLines)] },
  ];
}

// ---------------------------------------------------------------------------
// VENUS AND ADONIS - Latin epigraph, dedication epistle, repeated title,
// then the poem (right-margin line-count numbers stripped, see module doc)
// ---------------------------------------------------------------------------

const MARGIN_NUMBER_RE = /\s{2,}(\d+)\s*$/;

function stripMarginNumber(line: string): { text: string; stripped: boolean } {
  const m = MARGIN_NUMBER_RE.exec(line);
  if (!m) return { text: line, stripped: false };
  return { text: line.slice(0, m.index), stripped: true };
}

function parseVenusAndAdonis(bodyLines: string[], where: string, anomalies: Anomaly[]): RawDivision[] {
  // epigraph: the two italic lines immediately after the title
  let i = 1;
  while (isBlank(bodyLines[i])) i++;
  const epigraphLines: string[] = [];
  while (i < bodyLines.length && !isBlank(bodyLines[i])) {
    epigraphLines.push(cleanLine(bodyLines[i]!));
    i++;
  }
  while (isBlank(bodyLines[i])) i++;
  // dedication: up to the "WILLIAM SHAKESPEARE." signature line
  const sigIdx = bodyLines.findIndex((l, idx) => idx > i && l.trim() === 'WILLIAM SHAKESPEARE.');
  if (sigIdx === -1) throw new Error(`${where}: expected a "WILLIAM SHAKESPEARE." dedication signature`);
  const dedication = bodyLines.slice(i, sigIdx + 1).filter((l) => l.trim() !== '').map(cleanLine).join(' ');
  // poem: after the repeated title line following the signature
  let j = sigIdx + 1;
  while (isBlank(bodyLines[j])) j++;
  if (bodyLines[j]!.trim() !== 'VENUS AND ADONIS') throw new Error(`${where}: expected the poem's title repeated before its text, got ${JSON.stringify(bodyLines[j])}`);
  j++;
  while (isBlank(bodyLines[j])) j++;
  const poemLinesRaw = bodyLines.slice(j);
  let stripCount = 0;
  const poemLines = poemLinesRaw.map((l) => {
    if (isBlank(l)) return l;
    const { text, stripped } = stripMarginNumber(l);
    if (stripped) stripCount++;
    return text;
  });
  anomalies.push({ where: `${where}/text`, note: `${stripCount} right-margin line-count number(s) (printed every 4th line, e.g. "...scorn;        4") were stripped from the reading text as typographic apparatus - this batch's Passage.n/ref carry no line-number scheme, and these are not part of the line's own wording.` });
  return [
    { id: 'epigraph', number: null, sourceHeading: null, children: [], passages: [{ speaker: null, lines: [epigraphLines.join('\n')] }] },
    { id: 'dedication', number: null, sourceHeading: null, children: [], passages: [{ speaker: null, lines: [dedication] }] },
    { id: 'text', number: null, sourceHeading: 'Venus and Adonis', children: [], passages: [stanzasToPassage(poemLines)] },
  ];
}

export function parseNarrativePoem(slug: string, bodyLines: string[], where: string, anomalies: Anomaly[]): RawDivision[] {
  switch (slug) {
    case 'a-lovers-complaint':
      return parseLoversComplaint(bodyLines);
    case 'the-passionate-pilgrim':
      return parsePassionatePilgrim(bodyLines, where);
    case 'the-phoenix-and-the-turtle':
      return parsePhoenixAndTurtle(bodyLines, where);
    case 'the-rape-of-lucrece':
      return parseLucrece(bodyLines, where);
    case 'venus-and-adonis':
      return parseVenusAndAdonis(bodyLines, where, anomalies);
    default:
      throw new Error(`${where}: unknown narrative-poem slug ${slug}`);
  }
}
