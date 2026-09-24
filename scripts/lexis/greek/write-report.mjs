// One-off generator for scripts/lexis/REPORT-greek.md (the task brief's required deliverable).
// Combines static prose with data pulled live from scripts/lexis/raw/build-greek-stats.json and
// data/lexis/ so the coverage table/sizes/unrecognised-form list can never drift from the actual
// build output. Run after scripts/lexis/build-greek.mjs. Not part of the runtime pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
const stats = JSON.parse(fs.readFileSync(path.join(rawDir, 'build-greek-stats.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'lexis', 'coverage.json'), 'utf8'));

const wr = stats.workResults.slice().sort((a, b) => a.workId.localeCompare(b.workId));
let table = '| work | tlg | tokens | recognized | coverage | matched Diorisis |\n|---|---|---:|---:|---:|:---:|\n';
for (const w of wr) {
  const cov = w.tokens ? ((100 * w.recognized) / w.tokens).toFixed(1) : '0.0';
  const tlg = w.tlgAuthor ? `${w.tlgAuthor}.${w.tlgId}` : '-';
  table += `| ${w.workId} | ${tlg} | ${w.tokens} | ${w.recognized} | ${cov}% | ${w.matched ? 'yes' : 'no'} |\n`;
}

const NARRATIVE = fs.readFileSync(path.join(rawDir, 'greek-narrative.md'), 'utf8');
if (!NARRATIVE.includes('{{TABLE}}')) throw new Error('greek-narrative.md is missing the {{TABLE}} placeholder');
fs.writeFileSync(path.join(root, 'scripts', 'lexis', 'REPORT-greek.md'), NARRATIVE.replace('{{TABLE}}', table));
console.log('wrote REPORT-greek.md,', wr.length, 'work rows, total coverage', (100 * coverage.grc.coverage).toFixed(1) + '%');
