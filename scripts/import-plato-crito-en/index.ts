/**
 * Run-once importer for Plato, *Crito* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-crito-en/work.json
 *   data/plato-crito-en/about.json
 *   data/plato-crito-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('crito', 'en');
