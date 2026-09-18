/**
 * Run-once importer for Plato, *Ion* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-ion-en/work.json
 *   data/plato-ion-en/about.json
 *   data/plato-ion-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('ion', 'en');
