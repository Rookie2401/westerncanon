/**
 * Plato, Charmides — English translation (Plato in Twelve Volumes,
 * Loeb Classical Library; CTS urn:cts:greekLit:tlg0059.tlg018.perseus-eng2).
 * Run-once ingestion pipeline built on the shared tokenizer in
 * scripts/import-plato-b-shared/parse.ts.
 *
 *   npx tsx scripts/import-plato-charmides-en/index.ts
 *
 * Reads scripts/import-plato-charmides-en/raw/tlg0059.tlg018.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes
 *   data/plato-charmides-en/{work.json,about.json,anomalies.json}
 *
 * See scripts/import-plato-b-shared/parse.ts for the full faithfulness
 * rules shared by all 28 Plato dialogue importers in this project, and
 * scripts/import-plato-b-shared/validate.ts to check the result.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runImport } from '../import-plato-b-shared/runImport.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runImport({
  slug: 'charmides',
  lang: 'en',
  rawPath: join(HERE, 'raw', 'tlg0059.tlg018.perseus-eng2.xml'),
  outDir: join(REPO_ROOT, 'data', 'plato-charmides-en'),
});
