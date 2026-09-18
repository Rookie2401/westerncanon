/**
 * Shared run-once ingestion pipeline for the twelve Plato dialogue
 * imports. Each scripts/import-plato-<slug>-<lang>/index.ts is a thin
 * wrapper calling runPlatoImport(slug, lang) - it reads that work's own
 * raw/*.xml (already in the repo; nothing is downloaded at import time)
 * and writes that work's own data/<workId>/{work.json,about.json,anomalies.json}.
 *
 *   npm run import:plato-euthyphro-grc   (etc., one per work, once wired up)
 *
 * Then run the shared validator (scripts/import-plato-shared/validate.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIALOGUES, rawFileName, type DialogueMeta } from './dialogues.ts';
import { buildAbout, type AboutStats } from './about.ts';
import { parsePlatoDialogue } from './parse.ts';
import type { Lang } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

function writeJson(dir: string, name: string, data: unknown): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

export function runPlatoImport(slug: string, lang: Lang): void {
  const meta: DialogueMeta | undefined = DIALOGUES[slug];
  if (!meta) {
    process.stderr.write(`STOP: unknown dialogue slug "${slug}"\n`);
    process.exit(1);
  }
  const label = `${meta.titleEn} (${lang})`;
  const workId = `plato-${slug}-${lang}`;
  const importerDir = join(REPO_ROOT, 'scripts', `import-plato-${slug}-${lang}`);
  const rawFile = join(importerDir, 'raw', rawFileName(meta, lang));
  const outDir = join(REPO_ROOT, 'data', workId);

  process.stdout.write(`parsing ${rawFile} ...\n`);
  const xml = readFileSync(rawFile, 'utf8');

  const result = parsePlatoDialogue(xml, {
    workId,
    language: lang,
    label,
    noSpeakerMarkup: meta.noSpeakerMarkup,
  });

  const firstPage = result.pageNumbers[0]!;
  const lastPage = result.pageNumbers[result.pageNumbers.length - 1]!;

  const stats: AboutStats = {
    firstPage,
    lastPage,
    sectionCount: result.work.divisions.length,
    paragraphCount: result.paragraphCount,
    noteCount: result.noteCount,
    biblCount: result.biblCount,
    milestoneCount: result.milestoneCount,
    noSpeakerParagraphCount: result.noSpeakerParagraphCount,
  };

  const about = buildAbout(meta, lang, stats);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: `${workId} / structure`,
    note: `${stats.sectionCount} Stephanus-page divisions (pp. ${firstPage}–${lastPage}), ${stats.paragraphCount} paragraphs, ${stats.milestoneCount} <milestone/> markers stripped, ${stats.noteCount} <note> and ${stats.biblCount} <bibl> excluded from the reading text (translator apparatus, each logged individually above).`,
  });
  if (meta.noSpeakerMarkup) {
    anomalies.push({
      where: `${workId} / speaker markup`,
      note: `This source carries no <said>/<label> markup at all: all ${stats.noSpeakerParagraphCount} paragraphs are plain prose with no speaker prefix (see about.json "How it was imported"). Not treated as an error - this matches ${meta.titleEn}'s dramatic form as one continuous speech.`,
    });
  }

  writeJson(outDir, 'work.json', result.work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', anomalies);

  let totalChars = 0;
  for (const d of result.work.divisions) totalChars += d.passages[0]!.text.length;

  process.stdout.write(
    `  ${label}: sec-${firstPage}..sec-${lastPage} (${stats.sectionCount} pages), ${stats.paragraphCount} paragraphs, ${totalChars} chars, ${anomalies.length} anomalies\n\n`,
  );
}
