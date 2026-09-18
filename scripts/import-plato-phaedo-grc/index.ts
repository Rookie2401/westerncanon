/**
 * Run-once importer for Plato, *Phaedo* (grc).
 * Reads raw/*.xml (already in the repo) and writes
 *   data/plato-phaedo-grc/work.json
 *   data/plato-phaedo-grc/about.json
 *   data/plato-phaedo-grc/anomalies.json
 * All parsing logic lives in scripts/import-plato-shared/ (shared by all
 * twelve Plato dialogue importers in this batch).
 */

import { runPlatoImport } from '../import-plato-shared/run.ts';

runPlatoImport('phaedo', 'grc');
