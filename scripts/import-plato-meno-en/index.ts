/**
 * Run-once importer for Plato, *Meno* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-meno-en/work.json
 *   data/plato-meno-en/about.json
 *   data/plato-meno-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('meno', 'en');
