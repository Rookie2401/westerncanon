/**
 * Table-driven parser for the five Latin theological tractates (Opuscula
 * sacra), all from the same Loeb 1918 Stewart & Rand edition, Perseus
 * canonical-latinLit (perseus-lat1.xml for each).
 *
 * Structure confirmed by direct inspection, tractate by tractate - NOT
 * assumed uniform:
 *   - Quomodo Substantiae (stoa003), De Fide Catholica (stoa006), Utrum
 *     Pater (stoa028): FLAT. Exactly one `<div type="textpart" n="1"
 *     subtype="section">` wraps the entire tractate - this edition marks no
 *     internal chapter divisions for these three at all. Imported as a
 *     single division, `ch-1`.
 *   - Contra Eutychen (stoa023): `<div ... n="pr" subtype="section">`
 *     (preface) then n="1".."8" (8 chapters) - 9 divisions total.
 *   - De Trinitate (stoa025): `<div ... n="pr" subtype="section">` then
 *     n="1".."6" (6 chapters) - 7 divisions total.
 * Each tractate's own expected section-id list is declared in TRACTATES
 * below and cross-checked; a mismatch stops the run rather than silently
 * shipping a different shape.
 *
 * Every tractate opens with a `<head>...</head>` (the work's own title
 * rubric, e.g. "contra Eutychen") sitting immediately before its first
 * `<div subtype="section">` (or, for the three flat tractates, immediately
 * INSIDE that single section, since there is nowhere else for it to sit) -
 * captured as the first division's `sourceHeading`, exactly as printed
 * (lower-case, as the source has it - not re-cased). Four of the five also
 * carry a `<label type="opener">`/`<label n="opener">` - the manuscript's
 * own incipit/dedication formula (e.g. "Anicii Manlii Severini Boethii ...
 * incipit liber contra Eutychen et Nestorium ... Iohanni diacono Boethius
 * filius"). This is genuine source text (the treatise's own opening
 * address), not apparatus, so it is kept verbatim as the first division's
 * opening paragraph - disclosed, not silently folded in.
 *
 * `<q>...</q>` (four of five tractates) carries no literal quotation-mark
 * characters, matching the Consolatio's own handling: a `<q>` fully
 * contained within one paragraph-level unit is rendered wrapped in
 * straight double quotes; one that wraps a whole `<p>` (or more) gets no
 * synthesised quote mark (see parseConsolatioLa.ts's module doc for the
 * full rationale - the same extractProseUnits/renderProseUnit is used
 * here, for consistency and as a safety net, even though a direct raw-vs-
 * output check found only single-digit-character gaps in these five
 * tractates, not the systematic dialogue loss found in the Consolatio).
 * `<foreign xml:lang="grc">` (Contra Eutychen, De Trinitate - Boethius's
 * own Greek philosophical terms, e.g. οὐσίωσις) is kept verbatim.
 * `<milestone unit="loebline" n="N"/>` and `<pb n="p.NNN"/>` are transport
 * scaffolding, dropped.
 */

import type { Anomaly, Division, GenericWork, Passage } from './genericTypes.ts';
import { cleanText, extractProseUnits, joinParagraphs, nfc, stripTags } from './text.ts';

export interface TractateConfig {
  workId: string;
  expectedNs: string[];
}

export const LATIN_TRACTATES: TractateConfig[] = [
  { workId: 'boethius-quomodo-substantiae-la', expectedNs: ['1'] },
  { workId: 'boethius-de-fide-catholica-la', expectedNs: ['1'] },
  { workId: 'boethius-contra-eutychen-la', expectedNs: ['pr', '1', '2', '3', '4', '5', '6', '7', '8'] },
  { workId: 'boethius-de-trinitate-la', expectedNs: ['pr', '1', '2', '3', '4', '5', '6'] },
  { workId: 'boethius-utrum-pater-la', expectedNs: ['1'] },
];

interface SectionMatch {
  n: string;
  index: number;
  tagLength: number;
}

function findSectionDivs(body: string): SectionMatch[] {
  const re = /<div type="textpart"[^>]*>/g;
  const out: SectionMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const tag = m[0];
    if (!/subtype="section"/.test(tag)) continue;
    const nMatch = /\sn="([^"]+)"/.exec(tag);
    if (!nMatch) continue;
    out.push({ n: nMatch[1]!, index: m.index, tagLength: tag.length });
  }
  return out;
}

export function parseLatinTractate(workId: string, xml: string): { work: GenericWork; anomalies: Anomaly[] } {
  const cfg = LATIN_TRACTATES.find((t) => t.workId === workId);
  if (!cfg) throw new Error(`no LATIN_TRACTATES entry for ${workId}`);

  function fail(msg: string): never {
    process.stderr.write(`STOP (${workId}): ${msg}\n`);
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found');
  const body = xml.slice(bodyStart, bodyEnd);

  const headMatch = /<head>([^<]*)<\/head>/.exec(body);
  const sourceHeading = headMatch ? nfc(cleanText(headMatch[1]!)) : null;
  if (!sourceHeading) {
    anomalies.push({ where: `${workId} / heading`, note: 'No <head> element found in this source; the first division\'s sourceHeading is null.' });
  }
  const labelMatch = /<label[^>]*>([\s\S]*?)<\/label>/.exec(body);
  const openerText = labelMatch ? cleanText(stripTags(labelMatch[1]!)) : null;

  const milestoneCount = (body.match(/<milestone\b/g) ?? []).length;
  const pbCount = (body.match(/<pb\b/g) ?? []).length;
  const totalQInBody = (body.match(/<q\b[^>]*>/g) ?? []).length;
  let unpairedQCount = 0;
  let looseUnitCount = 0;
  const looseUnitLocations: string[] = [];

  const sections = findSectionDivs(body);
  if (sections.length === 0) fail('no section divs found');
  const gotNs = sections.map((s) => s.n);
  if (gotNs.length !== cfg.expectedNs.length || gotNs.some((n, i) => n !== cfg.expectedNs[i])) {
    fail(`section id mismatch: expected [${cfg.expectedNs.join(',')}], got [${gotNs.join(',')}]`);
  }

  const divisions: Division[] = [];

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    const start = s.index + s.tagLength;
    const end = i + 1 < sections.length ? sections[i + 1]!.index : body.lastIndexOf('</div>');
    let chunk = body.slice(start, end);

    // Strip the work-level <head>/<label> rubric, which (for the flat tractates) sits inside
    // this very section - its text is captured above and handled separately, never duplicated.
    chunk = chunk.replace(/<head>[^<]*<\/head>/g, ' ');
    chunk = chunk.replace(/<label[^>]*>[\s\S]*?<\/label>/g, ' ');
    chunk = chunk.replace(/<milestone\b[^>]*\/>/g, ' ');
    chunk = chunk.replace(/<pb\b[^>]*\/>/g, ' ');

    const { units: nonEmpty, looseUnits, unpairedQ } = extractProseUnits(chunk);
    unpairedQCount += unpairedQ;
    if (looseUnits > 0) {
      looseUnitCount += looseUnits;
      looseUnitLocations.push(`ch-${s.n} (${looseUnits})`);
    }

    const passageAnomalies: string[] = [];
    let allParas = nonEmpty;
    if (i === 0 && openerText) {
      allParas = [openerText, ...nonEmpty];
      passageAnomalies.push(
        `This division's text opens with the manuscript's own incipit/dedication rubric ("${openerText.slice(0, 90)}${openerText.length > 90 ? '…' : ''}"), kept verbatim as its first paragraph (genuine source text, not apparatus).`,
      );
      anomalies.push({ where: `${workId} / ${cfg.expectedNs[0] === 'pr' ? 'ch-pr' : 'ch-1'}`, note: passageAnomalies[0]! });
    }
    if (allParas.length === 0) fail(`section "${s.n}" produced empty text`);

    const text = nfc(joinParagraphs(allParas));
    const passage: Passage = { n: '', text, ref: null };
    if (passageAnomalies.length > 0) passage.anomaly = passageAnomalies.join(' ');

    const div: Division = {
      id: `ch-${s.n}`,
      number: s.n,
      ref: null,
      sourceHeading: i === 0 ? sourceHeading : null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    divisions.push(div);
  }

  const flat = cfg.expectedNs.length === 1;
  anomalies.push({
    where: `${workId} / structure`,
    note: flat
      ? 'This edition marks no internal chapter divisions for this tractate at all: the entire text is one continuous `<div subtype="section" n="1">`. Imported as a single division, ch-1, rather than an invented chapter split.'
      : `This edition divides the tractate into a Preface ("pr") and ${cfg.expectedNs.length - 1} numbered chapters, exactly as printed; imported as ch-pr, ch-1 .. ch-${cfg.expectedNs.length - 1}.`,
  });
  anomalies.push({
    where: `${workId} / transport scaffolding`,
    note: `${milestoneCount} <milestone unit="loebline"/> ticks and ${pbCount} <pb/> page-break markers were dropped as pure typesetting scaffolding; this source carries no citation scheme this schema can use, so Division.ref and Passage.ref are null throughout.`,
  });
  if (totalQInBody > 0) {
    const pairedQCount = totalQInBody - unpairedQCount;
    anomalies.push({
      where: `${workId} / direct speech`,
      note: `${totalQInBody} <q>...</q> span(s) carry no literal quotation-mark characters in this XML. ${pairedQCount} are fully contained within a single paragraph-level unit and are rendered wrapped in straight double quotes, matching this app's Consolatio handling. ${unpairedQCount} wrap one or more WHOLE <p> paragraphs; for these no quote mark is synthesised, since placing one correctly across a paragraph boundary would be invented rather than read from the source.`,
    });
  }
  if (looseUnitCount > 0) {
    anomalies.push({
      where: `${workId} / dialogue outside <p>`,
      note: `${looseUnitCount} paragraph-level unit(s) of text sit OUTSIDE any <p> element in this source; recovered in full via extractProseUnits (see parseConsolatioLa.ts's module doc for the concrete bug this guards against). Locations (unit count): ${looseUnitLocations.join(', ')}.`,
    });
  }
  if (/<foreign/.test(body)) {
    anomalies.push({
      where: `${workId} / foreign-language text`,
      note: "Boethius's own Greek philosophical terms (wrapped in <foreign xml:lang=\"grc\">) are kept verbatim, in their original script.",
    });
  }

  const work: GenericWork = { workId, language: 'la', divisions };
  return { work, anomalies };
}
