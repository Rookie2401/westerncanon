/**
 * Run-once importer for Plato, *Ion* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-ion-grc/work.json
 *   data/plato-ion-grc/about.json
 *   data/plato-ion-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('ion', 'grc');
