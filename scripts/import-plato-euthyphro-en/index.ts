/**
 * Run-once importer for Plato, *Euthyphro* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-euthyphro-en/work.json
 *   data/plato-euthyphro-en/about.json
 *   data/plato-euthyphro-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('euthyphro', 'en');
