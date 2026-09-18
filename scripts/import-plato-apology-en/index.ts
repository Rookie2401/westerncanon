/**
 * Run-once importer for Plato, *Apology* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-apology-en/work.json
 *   data/plato-apology-en/about.json
 *   data/plato-apology-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('apology', 'en');
