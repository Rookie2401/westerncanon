/**
 * Run-once importer for Plato, *Apology* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-apology-grc/work.json
 *   data/plato-apology-grc/about.json
 *   data/plato-apology-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('apology', 'grc');
