/**
 * Run-once importer for Plato, *Crito* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-crito-grc/work.json
 *   data/plato-crito-grc/about.json
 *   data/plato-crito-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('crito', 'grc');
