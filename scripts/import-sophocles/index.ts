/**
 * Sophocles - all 7 surviving plays plus Ichneutae, Greek (+ English except
 * Ichneutae). Run-once ingestion.
 *
 *   npm run import:sophocles
 *
 * Reads scripts/import-sophocles/raw/tlg0011.tlgNNN.perseus-*.xml (already
 * fetched from PerseusDL/canonical-greekLit and committed) and writes, per
 * play per language:
 *   data/sophocles-<slug>-grc|en/{work.json,about.json,anomalies.json,types.ts}
 *
 * Then run `npm run validate:greek-drama`.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRAMA_WORKS } from '../import-greek-drama-shared/workTable.ts';
import { importOneWitness } from '../import-greek-drama-shared/runImport.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

function main(): void {
  const plays = DRAMA_WORKS.filter((e) => e.playwright === 'sophocles');
  process.stdout.write(`Sophocles importer - ${plays.length} plays\n\n`);

  let ok = 0;
  for (const entry of plays) {
    for (const lang of ['grc', 'en'] as const) {
      if (lang === 'en' && !entry.en) {
        process.stdout.write(`[${entry.tlgWork}] ${entry.slug}: no English witness shipped (see workTable.ts notes) - skipped\n`);
        continue;
      }
      try {
        const r = importOneWitness(entry, lang, RAW_DIR);
        process.stdout.write(
          `[${entry.tlgWork}] ${r.workId}: ${r.cardCount} cards, ${r.passageCount} passages, ${r.totalChars} chars, ` +
            `${r.hasDramatisPersonae ? 'has' : 'no'} dramatis personae, ${r.anomalyCount} anomalies (${r.bytesWritten} bytes)\n`,
        );
        ok += 1;
      } catch (err) {
        process.stderr.write(`STOP: ${entry.slug}-${lang}: ${(err as Error).message}\n`);
        process.exit(1);
      }
    }
  }
  process.stdout.write(`\n${ok} work(s) imported.\n`);
}

main();
