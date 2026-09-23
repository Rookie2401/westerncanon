/**
 * Aristophanes - all 11 surviving comedies, Greek only. Run-once ingestion.
 *
 *   npm run import:aristophanes
 *
 * Reads scripts/import-aristophanes/raw/tlg0019.tlgNNN.perseus-grc2.xml
 * (already fetched from PerseusDL/canonical-greekLit and committed) and
 * writes, per play:
 *   data/aristophanes-<slug>-grc/{work.json,about.json,anomalies.json,types.ts}
 *
 * GREEK ONLY, deliberately: the English side of this corpus is being
 * imported separately (a different agent, a different source) - see
 * workTable.ts's ARISTOPHANES_WORKS module doc. This driver never even
 * looks for an `en` witness (every entry's `en` is `null`).
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
  const plays = DRAMA_WORKS.filter((e) => e.playwright === 'aristophanes');
  process.stdout.write(`Aristophanes importer - ${plays.length} plays (Greek only)\n\n`);

  let ok = 0;
  for (const entry of plays) {
    if (entry.en) {
      process.stderr.write(`STOP: ${entry.slug}: expected en: null for this Greek-only driver, got a witness\n`);
      process.exit(1);
    }
    try {
      const r = importOneWitness(entry, 'grc', RAW_DIR);
      process.stdout.write(
        `[${entry.tlgWork}] ${r.workId}: ${r.cardCount} cards, ${r.passageCount} passages, ${r.totalChars} chars, ` +
          `${r.hasDramatisPersonae ? 'has' : 'no'} dramatis personae, ${r.anomalyCount} anomalies (${r.bytesWritten} bytes)\n`,
      );
      ok += 1;
    } catch (err) {
      process.stderr.write(`STOP: ${entry.slug}: ${(err as Error).message}\n`);
      process.exit(1);
    }
  }
  process.stdout.write(`\n${ok} work(s) imported.\n`);
}

main();
