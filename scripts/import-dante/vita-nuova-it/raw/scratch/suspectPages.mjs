/**
 * One-off helper for the residual-error audit (NOT part of the shipped
 * pipeline): for every suspect token printed by residualCheck.ts, find the
 * djvu page(s) of raw/corrected-pages.json that contain it, so each can be
 * checked against its page image. Usage:
 *   npx tsx residualCheck.ts > suspects.txt ; node suspectPages.mjs suspects.txt
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(readFileSync(join(HERE, '..', 'corrected-pages.json'), 'utf8'));
const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => /UNRESOLVED/.test(l));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const l of lines) {
  const forms = l.split('  ')[0].split('/');
  const found = [];
  for (const p of pages) {
    const t = p.text.normalize('NFC').toLowerCase();
    for (const f of forms) {
      const re = new RegExp(`(^|[^\\p{L}])${esc(f)}(?=[^\\p{L}]|$)`, 'u');
      const m = re.exec(t);
      if (m) {
        const i = m.index;
        found.push(`${p.page}:"${p.text.slice(Math.max(0, i - 25), i + f.length + 25).replace(/\n/g, ' ')}"`);
        break;
      }
    }
  }
  process.stdout.write(`${forms.join('/')} @ ${found.join(' | ')}\n`);
}
