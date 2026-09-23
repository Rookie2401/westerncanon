/**
 * Aristophanes, the 11 surviving comedies - the anonymous 1912 Athenian
 * Society English translation, via English Wikisource. Run-once ingestion
 * pipeline (table-driven over PLAYS, see ./playTable.ts).
 *
 *   npx tsx scripts/import-aristophanes-en/index.ts
 *
 * SOURCE / EDITION (confirmed from the index page itself, raw/index.json):
 * "Aristophanes: The Eleven Comedies" (title as printed), translator credited
 * only as "Anonymous" - Wikisource's own header note records that although
 * published anonymously, the translation is presumed (by the Athenian
 * Society's own later attribution, not by this importer) to be the work of
 * Oscar Wilde, a Greek scholar and Society member; first published 1912 by
 * the (London) Athenian Society. That header note is Wikisource's own
 * editorial gloss, not this app's claim, and is reported as such below.
 *
 * FETCH TECHNIQUE - discovered per play, not assumed uniform (see
 * playTable.ts's module doc): a `list=allpages` query under this index page
 * found exactly 11 subpages (raw/allpages.json). Of those, 9 returned real
 * prose from action=query&prop=revisions (ordinary wikitext); Peace and
 * Lysistrata returned only a `<pages index="..." from=X to=Y />` marker, so
 * their RENDERED HTML was fetched instead via action=parse&prop=text and
 * parsed with jsdom (pagescanPlay.ts) - exactly the split already used by
 * scripts/import-aristotle-rest-en-shared for its own batch.
 *
 * STRUCTURE: this translation is PROSE with no printed line numbers, so -
 * unlike this app's Perseus-sourced Greek tragedy corpus - there is no
 * card/line division to align to. Each play ships an optional
 * `dramatis-personae` division (every one of the 11 prints a cast list) plus
 * a single flat `text` division, one Passage per speech, in document order.
 * See wikitextPlay.ts / pagescanPlay.ts for the per-technique parsing rules
 * (speaker-cue shapes, stage-direction bracket convention, footnote
 * handling) and each work's own about.json for what was found play by play.
 *
 * DELIBERATELY NOT IMPORTED: each play page also carries a translator's
 * "Introduction" - a page or more of literary-historical criticism, not
 * speech-shaped text. This app's generic-work Passage schema has no slot for
 * essay prose (Passage.text is speaker-name + speech, or a bracketed stage
 * direction), so, rather than force it into a fake "speech", the Introduction
 * is dropped and its absence is disclosed in every play's about.json. Same
 * treatment for the trailing "Notes"/"Footnotes" heading, which renders no
 * text of its own beyond the <ref>/<sup> footnotes already captured inline.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYS, workId, type PlayMeta } from './playTable.ts';
import { parseWikitextPlay, type RawPassage } from './wikitextPlay.ts';
import { parsePagescanPlay, extractDramatisPersonaeFromHtml } from './pagescanPlay.ts';
import { buildWork, writeOutputs, printSummary, type WorkAbout, type WorkAboutSection } from './emit.ts';
import { TYPES_FILE } from './typesTemplate.ts';
import type { Anomaly } from './text.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

const TITLES: Record<string, string> = {
  acharnians: 'The Acharnians',
  knights: 'The Knights',
  clouds: 'The Clouds',
  wasps: 'The Wasps',
  peace: 'Peace',
  birds: 'The Birds',
  lysistrata: 'Lysistrata',
  thesmophoriazusae: 'The Thesmophoriazusae',
  frogs: 'The Frogs',
  ecclesiazusae: 'The Ecclesiazusae',
  plutus: 'Plutus',
};

const EDITION =
  'Aristophanes: The Eleven Comedies. Anonymous, translator. London: The Athenian Society, 1912.';

interface ParsedPlay {
  dramatisPersonae: string[];
  passages: RawPassage[];
  footnotes: Map<number, string>;
  speakerLabelsSeen: string[];
  anomalies: Anomaly[];
  techniqueNote: string;
}

function parsePlay(meta: PlayMeta): ParsedPlay {
  const where = `aristophanes-${meta.slug}-en`;
  const rawPath = join(RAW_DIR, meta.rawFile);
  const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as Record<string, unknown>;

  if (meta.technique === 'wikitext') {
    const pages = (raw.query as { pages: Record<string, { revisions: { slots: { main: { '*': string } } }[] }> }).pages;
    const key = Object.keys(pages)[0]!;
    const content = pages[key]!.revisions[0]!.slots.main['*'];
    if (!meta.shape) throw new Error(`${where}: wikitext play with no shape declared`);
    const r = parseWikitextPlay(content, meta.shape, where);
    let dramatisPersonae = r.dramatisPersonae;
    let techniqueNote = `Ordinary wikitext (action=query&prop=revisions&rvslots=main&rvprop=content returned the real prose directly); speaker-cue shape "${meta.shape}" (see wikitextPlay.ts's module doc for what each shape means).`;
    const anomalies = [...r.anomalies];
    if (meta.dpRawFile) {
      // Plutus: front pages (title, Dramatis Personæ) are a page-scan
      // transclusion even though the play body is ordinary wikitext -
      // recover the cast list from the rendered HTML instead.
      const dpRaw = JSON.parse(readFileSync(join(RAW_DIR, meta.dpRawFile), 'utf8')) as { parse: { text: { '*': string } } };
      const dp = extractDramatisPersonaeFromHtml(dpRaw.parse.text['*'], where);
      if (dp === null) throw new Error(`${where}: dpRawFile given but no Dramatis Personæ heading found in its rendered HTML`);
      dramatisPersonae = dp;
      techniqueNote += ` This play's own front matter (title page, Dramatis Personæ) turned out to be a djvu PAGE-SCAN TRANSCLUSION even though the play body a few pages later is ordinary wikitext - a mixed shape unique to this play, discovered only once the wikitext-only parse produced no cast list at all. The cast list was recovered separately from the rendered HTML (action=parse&prop=text, cached as raw/${meta.dpRawFile}).`;
      anomalies.push({ where, note: `Dramatis Personæ recovered from the page's RENDERED HTML (raw/${meta.dpRawFile}), not from the wikitext used for the play body: this play's front pages are a page-scan transclusion, invisible to the ordinary action=query&prop=revisions fetch used for the body text.` });
    }
    return {
      dramatisPersonae,
      passages: r.passages,
      footnotes: r.footnotes,
      speakerLabelsSeen: r.speakerLabelsSeen,
      anomalies,
      techniqueNote,
    };
  }

  const html = (raw as { parse: { text: { '*': string } } }).parse.text['*'];
  const r = parsePagescanPlay(html, where);
  return {
    dramatisPersonae: r.dramatisPersonae,
    passages: r.passages,
    footnotes: r.footnotes,
    speakerLabelsSeen: r.speakerLabelsSeen,
    anomalies: [...r.anomalies, { where, note: `${r.headingsSkipped} decorative running-title/section heading div(s) (repeated page banners, not speech text) were skipped.` }],
    techniqueNote: 'Djvu PAGE-SCAN TRANSCLUSION: the wikitext is only a `<pages index="..." from=X to=Y />` marker, so the RENDERED HTML was fetched instead (action=parse&prop=text) and parsed with jsdom.',
  };
}

function buildAbout(meta: PlayMeta, parsed: ParsedPlay, speechCount: number, charCount: number): WorkAbout {
  const title = TITLES[meta.slug]!;
  const distinctSpeakers = [...new Set(parsed.speakerLabelsSeen)];
  const sections: WorkAboutSection[] = [
    {
      heading: 'About this edition',
      paragraphs: [
        `This is the anonymous 1912 Athenian Society English translation of Aristophanes' ${title}, one of the eleven surviving comedies, as transcribed on English Wikisource.`,
        'The text here is the translation, verbatim. Nothing is modernised, paraphrased, bowdlerised, or silently corrected; where the 1912 print itself is blunt (this translation renders explicit content directly in English rather than switching to Latin or asterisks, unlike some contemporary classical translations - none of the plays in this corpus were found to use any censorship convention), that is exactly what is bundled here.',
      ],
    },
    {
      heading: 'The translation',
      paragraphs: [
        `${EDITION} Published without a named translator; English Wikisource's own header note on the collection's index page records that the translation is "presumed to be the work of Oscar Wilde, who was a Greek scholar and member of the Society" - Wikisource's editorial attribution, not a claim verified independently here, and reported for that reason as presumed rather than certain. about.json's "translator" field is left as "Anonymous (presumed Oscar Wilde, per Wikisource)" accordingly.`,
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is English Wikisource's page "Aristophanes: The Eleven Comedies/${meta.pageTitle}", fetched once (rate-limited, one request per 3+ seconds, with a descriptive User-Agent) and cached under scripts/import-aristophanes-en/raw/${meta.rawFile}; nothing is loaded from the network at runtime. ${parsed.techniqueNote}`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `This translation is PROSE with no printed line numbers, so - unlike this app's Perseus-sourced Greek tragedy corpus - there is no card/line division to align to. Every play carries a source-printed cast list, imported as a single \`dramatis-personae\` division (one Passage, the character list joined one per line, exactly as printed) followed by one flat \`text\` division holding every speech in document order. Passage.n is '' and Passage.ref is null throughout, as instructed for this whole batch.`,
        `Speeches are segmented on this source's own speaker-cue convention: each Passage's text begins with the speaker's name exactly as printed (this translation is not consistent about case across plays - some print names in full capitals, others in title case; both are kept verbatim, not normalised), then the speech as a single running paragraph. A parenthetical stage direction printed by the source - "(...)" - is converted to "[...]" in place, whether it opens a speech (e.g. a cue printed with "(alone)" immediately after the speaker's name) or falls mid-speech; it is not split into a separate Passage. A stand-alone "SCENE:" setting line with no speaker of its own becomes its own bracketed Passage with no speaker-name line. This play found ${distinctSpeakers.length} distinct speaker-cue label(s) in the source.`,
        `The translator's own footnotes are kept, not discarded: each footnote's text is attached, verbatim, as a trailing "[Note N: ...]" line on whichever Passage its marker fell in (one line per footnote, several if more than one falls in the same Passage). Numbering is internal to this play's body text only and starts at 1 there - the translator's Introduction essay (see below) is not imported, so its own footnotes, if any, are not numbered or carried over.`,
        "The translator's Introduction - a page or more of literary-historical criticism prefacing the play - is NOT imported: it is prose criticism, not a speech or a stage direction, and this app's generic-work schema (speaker-name + speech, or a bracketed direction) has no honest slot for it. Importing it as a fake \"speech\" would misrepresent the source, so it is dropped and disclosed here instead. The trailing \"Notes\"/\"Footnotes\" heading itself renders no additional text beyond the footnotes already captured inline, and is dropped for the same reason (nothing lost).",
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Every Division.ref and Passage.ref is null, and every Passage.n is the empty string, throughout this corpus: the 1912 translation prints no line numbers, act/scene numbers, or page-citable markers of any kind within the play text itself, so no citation scheme is invented here. A reader wanting to cite a specific line should quote the speech and speaker; there is no finer machine-checkable address than "this play, this speech" for this edition.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `Completeness. This play produced ${speechCount} passage(s) in the \`text\` division, ${charCount} characters of reading text, and ${parsed.footnotes.size} footnote(s); nothing is dropped, merged, or reordered beyond what is documented here and in anomalies.json.`,
        `${parsed.anomalies.length} anomaly/anomalies were logged for this play during import - see anomalies.json for the full list with verbatim excerpts. This includes any place the source's own printed cast-list or speaker-cue spelling is internally inconsistent (e.g. a character's name spelled two ways) - such irregularities are preserved exactly as printed, never silently corrected.`,
      ],
    },
  ];

  return {
    workId: workId(meta.slug),
    title,
    author: 'Aristophanes',
    language: 'en',
    edition: EDITION,
    translator: 'Anonymous (presumed Oscar Wilde, per Wikisource\'s own editorial note)',
    provenance: `English Wikisource, "Aristophanes: The Eleven Comedies/${meta.pageTitle}"; imported by scripts/import-aristophanes-en.`,
    license:
      "The 1912 translation is in the public domain (published 1912, anonymous; well past any US or UK copyright term). The underlying Greek is ancient and in the public domain everywhere. English Wikisource's own digital transcription is distributed under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections,
  };
}

function main(): void {
  process.stdout.write('=== import:aristophanes-en ===\n');
  for (const meta of PLAYS) {
    const id = workId(meta.slug);
    const parsed = parsePlay(meta);
    const work = buildWork(id, TITLES[meta.slug]!, parsed.dramatisPersonae, parsed.passages, parsed.footnotes);
    const textDiv = work.divisions.find((d) => d.id === 'text')!;
    const actualChars = textDiv.passages.reduce((n, p) => n + p.text.length, 0);
    const about = buildAbout(meta, parsed, textDiv.passages.length, actualChars);
    const outDir = join(DATA_ROOT, id);
    writeOutputs(outDir, work, about, parsed.anomalies, TYPES_FILE);
    printSummary(id, work, parsed.anomalies, parsed.footnotes.size);
  }
  process.stdout.write('\ndone.\n');
}

main();
