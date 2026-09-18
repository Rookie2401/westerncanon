/**
 * Run-once importer for Plato, *Euthyphro* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-euthyphro-grc/work.json
 *   data/plato-euthyphro-grc/about.json
 *   data/plato-euthyphro-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('euthyphro', 'grc');
