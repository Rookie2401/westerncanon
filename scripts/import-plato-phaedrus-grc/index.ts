/**
 * Plato, Phaedrus — Greek text (ed. John Burnet, Platonis Opera vol. 2,
 * Oxford: Clarendon Press, 1910; CTS urn:cts:greekLit:tlg0059.tlg012.perseus-grc2).
 * Run-once ingestion pipeline built on the shared tokenizer in
 * scripts/import-plato-b-shared/parse.ts.
 *
 *   npx tsx scripts/import-plato-phaedrus-grc/index.ts
 *
 * Reads scripts/import-plato-phaedrus-grc/raw/tlg0059.tlg012.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes
 *   data/plato-phaedrus-grc/{work.json,about.json,anomalies.json}
 *
 * See scripts/import-plato-b-shared/parse.ts for the full faithfulness
 * rules shared by all ten Plato dialogue importers in this batch, and
 * scripts/import-plato-b-shared/validate.ts to check the result.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runImport } from '../import-plato-b-shared/runImport.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runImport({
  slug: 'phaedrus',
  lang: 'grc',
  rawPath: join(HERE, 'raw', 'tlg0059.tlg012.perseus-grc2.xml'),
  outDir: join(REPO_ROOT, 'data', 'plato-phaedrus-grc'),
});
