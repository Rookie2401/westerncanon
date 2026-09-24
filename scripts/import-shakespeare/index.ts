/**
 * Shakespeare: the complete works, from Project Gutenberg eBook #100 ("The
 * Complete Works of William Shakespeare") - run-once ingestion pipeline,
 * table-driven over the 44 works parsed out of the PG file's own table of
 * contents (see source.ts / playTable.ts).
 *
 *   npx tsx scripts/import-shakespeare/index.ts
 *
 * SOURCE / EDITION. eBook #100's own front matter (raw/pg100.txt's header,
 * reproduced in full in every work's about.json "Digital source" section)
 * gives only: title, author, release date (1994-01-01, most recently
 * updated 2025-08-24), and "Language: English" - it does NOT itself name a
 * printed source edition (no "Globe", "Clark & Wright", or "Moby" wording
 * anywhere in the file, confirmed by a full-text search of raw/pg100.txt).
 * That the text IS the Globe edition (W. G. Clark & W. Aldis Wright,
 * Macmillan, 1864/1866) by way of the so-called "Moby Shakespeare" (the
 * Clark & Wright text as re-keyed for the Complete Works of William
 * Shakespeare CD-ROM project, released to the public domain in 1995, and
 * adopted verbatim by Project Gutenberg as eBook #100 in January 1994/its
 * later revisions) is well documented externally - see Open Source
 * Shakespeare's history note ("How Moby Shakespeare Took Over the
 * Internet") - but is NOT a claim made by the file itself. Both facts are
 * recorded, distinctly, in every work's about.json rather than conflated.
 * Either way the underlying text is public domain many times over: the
 * plays/poems (Shakespeare d. 1616), the Globe edition (1864/1866), and the
 * Moby/PG transcription (1995 public-domain release; PG's own eBook #100 is
 * offered "for the use of anyone... with almost no restrictions
 * whatsoever").
 *
 * STRUCTURE - see parsePlay.ts / parsePoems.ts for the full parsing rules.
 * In short: for plays, dramatis-personae? + one Division per ACT/PROLOGUE/
 * EPILOGUE/INDUCTION, each with `<id>-scene-M` children per printed SCENE
 * heading; for the Sonnets, one `sonnet-N` Division each; for the five
 * shorter/narrative poems, one Division per poem or per the edition's own
 * named part.
 *
 * NOT IMPORTED: nothing of the reading text is dropped. The PG licence
 * header/footer (before "*** START ***" / after "*** END ***") is stripped,
 * as it is transport boilerplate, not part of Shakespeare's or the Globe
 * editors' text - disclosed here and in every work's about.json.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSource, type WorkBound } from './source.ts';
import { WORKS, workId } from './playTable.ts';
import { parsePlayBody, type RawDivision } from './parsePlay.ts';
import { parseSonnets, parseNarrativePoem } from './parsePoems.ts';
import { buildWork, writeOutputs, printSummary, type WorkAbout, type WorkAboutSection } from './emit.ts';
import { TYPES_FILE } from './typesTemplate.ts';
import type { Anomaly } from './text.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

const EDITION =
  'The Globe Edition of the Works of William Shakespeare, ed. William George Clark & William Aldis Wright (Cambridge/London: Macmillan, 1864/1866), by way of the "Moby Shakespeare" re-keying (released to the public domain, 1995); transcribed as Project Gutenberg eBook #100, "The Complete Works of William Shakespeare" (first released 1994-01-01; most recently updated 2025-08-24).';

const LICENSE =
  'Public domain. Shakespeare’s plays and poems (author d. 1616); the Globe edition’s text (Clark & Wright, 1864/1866, both long deceased); and the "Moby Shakespeare" digital transcription (explicitly released to the public domain, 1995). Project Gutenberg’s own eBook #100 is distributed "for the use of anyone anywhere... with almost no restrictions whatsoever" under the terms of the Project Gutenberg License (see gutenberg.org/policy/license.html); no additional restriction is added here.';

interface ParsedWork {
  meta: (typeof WORKS)[number];
  bound: WorkBound;
  dramatisPersonae: string[] | null;
  sceneNote: string | null;
  divisions: RawDivision[];
  anomalies: Anomaly[];
  contentsSummary: string;
}

function parseOne(source: ReturnType<typeof loadSource>, index: number): ParsedWork {
  const meta = WORKS[index]!;
  const bound = source.works[index]!;
  const where = `shakespeare-${meta.slug}-en`;
  const bodyLines = source.lines.slice(bound.startLine, bound.endLine);

  if (bound.kind === 'sonnets') {
    const anomalies: Anomaly[] = [];
    const divisions = parseSonnets(bodyLines, where, anomalies);
    return { meta, bound, dramatisPersonae: null, sceneNote: null, divisions, anomalies, contentsSummary: `${divisions.length} sonnets` };
  }
  if (bound.kind === 'poem') {
    const anomalies: Anomaly[] = [];
    const divisions = parseNarrativePoem(meta.slug, bodyLines, where, anomalies);
    return { meta, bound, dramatisPersonae: null, sceneNote: null, divisions, anomalies, contentsSummary: `${divisions.length} division(s)` };
  }
  const parsed = parsePlayBody(bodyLines, bound.sourceTitle, where);
  const actCount = parsed.divisions.filter((d) => d.id.startsWith('act-')).length;
  const sceneCount = parsed.divisions.reduce((n, d) => n + d.children.length, 0);
  const contentsSummary = `${actCount} act(s) / ${sceneCount} scene(s) (source Contents: ${parsed.contents.length} top-level entr${parsed.contents.length === 1 ? 'y' : 'ies'}, ${parsed.contents.reduce((n, e) => n + e.scenes.length, 0)} scene lines)`;
  return { meta, bound, dramatisPersonae: parsed.dramatisPersonae, sceneNote: parsed.sceneNote, divisions: parsed.divisions, anomalies: parsed.anomalies, contentsSummary };
}

function buildAbout(pw: ParsedWork, work: ReturnType<typeof buildWork>): WorkAbout {
  const id = workId(pw.meta.slug);
  const structureNote =
    pw.bound.kind === 'play'
      ? `This play has ${pw.contentsSummary}. Divisions: ${pw.dramatisPersonae ? 'a `dramatis-personae` division (the printed cast list' + (pw.sceneNote ? ', plus the play’s own whole-play "SCENE." setting note, appended as the list’s final line - the source prints it immediately after the cast with no heading of its own)' : ')') + ', then ' : 'no `dramatis-personae` division (this edition prints no cast list for this play), then '}one Division per ACT (id \`act-N\`) or per bare PROLOGUE/EPILOGUE/INDUCTION label the source places at the top level, each with \`<id>-scene-M\` children for its printed SCENE headings.`
      : pw.bound.kind === 'sonnets'
        ? `${pw.divisions.length} sonnets, one \`sonnet-N\` Division each.`
        : `${pw.contentsSummary}.`;

  const sections: WorkAboutSection[] = [
    {
      heading: 'About this edition',
      paragraphs: [
        `This is the text of ${work.workId === id ? pw.meta.title : pw.meta.title} as printed in Project Gutenberg's "The Complete Works of William Shakespeare" (eBook #100), source heading "${pw.bound.sourceTitle}".`,
        'The text here is verbatim: nothing is modernised, paraphrased, or silently corrected. Archaic spellings, elisions, and apostrophe forms ("’d", "’t", etc.) are kept exactly as printed.',
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [EDITION, 'See this batch’s importer (scripts/import-shakespeare/index.ts) module doc for exactly what the eBook’s own file header states versus what is externally documented about its textual ancestry (the Globe/Moby lineage) - the two are kept distinct, not conflated.'],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is Project Gutenberg eBook #100, fetched once (raw/pg100.txt) and bundled with the app; nothing is loaded from the network at runtime. The PG licence header (before "*** START OF THE PROJECT GUTENBERG EBOOK ***") and footer (after "*** END OF THE PROJECT GUTENBERG EBOOK ***") are stripped as transport boilerplate, not part of the literary text; nothing else is removed.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        structureNote,
        'Every Passage is one speech: the speaker’s name exactly as printed (all capitals, trailing period) on its own first line, then the speech. A speech is classified as verse (kept one printed line per "\\n") unless an interior line begins with a lowercase letter, which only happens in this transcription when a PROSE paragraph was mechanically word-wrapped at the plain-text file’s column width (verified by direct inspection: this typesetting convention capitalises the first word of every real verse line regardless of grammar); prose speeches are then reflowed to a single paragraph (space-joined), collapsing that wrap artifact rather than preserving it as a false line break. A stand-alone stage direction (an "Enter"/"Exit"/"Exeunt"/"Re-enter"/similar block, or a bracketed "[...]" direction) is its own Passage with no speaker line; a direction printed inline within a speech (e.g. "[Aside.]" prefixed to a dialogue line) stays inline, on that line, exactly as printed. PG100’s own underscore italic markers ("_..._") are unwrapped (they are transcription markup for italic type, not literal underscores or printed text); real printed brackets around a stage direction are kept.',
        'Passage.n is \'\' and ref is null throughout this batch: the Globe text prints no citable line numbers for its plays, Sonnets, or most poems.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: ['This edition prints no line-citable reference scheme; Division.number carries the act/scene/sonnet/part number as printed (arabic), and Division.ref/Passage.ref are always null.'],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `Completeness. ${pw.anomalies.length} anomal${pw.anomalies.length === 1 ? 'y is' : 'ies are'} logged for this work - see anomalies.json for the full list. Nothing is dropped, merged, or reordered beyond what is documented there and above.`,
      ],
    },
  ];

  return {
    workId: id,
    title: pw.meta.title,
    author: 'William Shakespeare',
    language: 'en',
    edition: EDITION,
    provenance: `Project Gutenberg eBook #100, "The Complete Works of William Shakespeare" (source heading "${pw.bound.sourceTitle}"); imported by scripts/import-shakespeare.`,
    license: LICENSE,
    sections,
  };
}

function main(): void {
  process.stdout.write('=== import:shakespeare ===\n');
  const source = loadSource();
  if (source.works.length !== WORKS.length) {
    process.stderr.write(`STOP: source.ts found ${source.works.length} works but playTable.ts declares ${WORKS.length}\n`);
    process.exit(1);
  }
  for (let k = 0; k < WORKS.length; k++) {
    const pw = parseOne(source, k);
    const id = workId(pw.meta.slug);
    const work = buildWork(id, pw.dramatisPersonae, pw.sceneNote, pw.divisions);
    const about = buildAbout(pw, work);
    const outDir = join(DATA_ROOT, id);
    writeOutputs(outDir, work, about, pw.anomalies, TYPES_FILE);
    printSummary(id, work, pw.anomalies);
  }
  process.stdout.write('\ndone.\n');
}

main();
