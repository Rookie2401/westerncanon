/**
 * Run-once importer for Plato, *Phaedo* (en).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-phaedo-en/work.json
 *   data/plato-phaedo-en/about.json
 *   data/plato-phaedo-en/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('phaedo', 'en');
