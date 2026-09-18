/**
 * Run-once importer for Plato, *Meno* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-meno-grc/work.json
 *   data/plato-meno-grc/about.json
 *   data/plato-meno-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('meno', 'grc');
