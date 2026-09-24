// Re-encodes every data/lexis/works/*.json bundle in the compact v2 form
// (scripts/lexis/lib.mjs encodeWorkLexis; decoded by src/lexis/compact.ts).
// Idempotent; verifies a decode round-trip of every file before overwriting.
//   node scripts/lexis/compact.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeWorkLexis, encodeWorkLexis, isCompact } from './lib.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'lexis', 'works');
let before = 0, after = 0, converted = 0, already = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const p = join(dir, f);
  before += statSync(p).size;
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  if (isCompact(raw)) { already++; after += statSync(p).size; continue; }
  const enc = encodeWorkLexis(raw);
  const back = decodeWorkLexis(enc);
  // Semantic round-trip check: a reading's confidence is stored to two decimals
  // and an explicit 1 is the same as an omitted one; key order is irrelevant.
  const norm = (fs) => Object.keys(fs).sort().map((k) => k + '=' + fs[k].map((r) => r[0] + '|' + r[1] + '|' + Math.round((r[2] ?? 1) * 100)).join(';'));
  for (const k of Object.keys(raw)) {
    const same = k === 'forms' ? JSON.stringify(norm(raw.forms)) === JSON.stringify(norm(back.forms)) : JSON.stringify(back[k]) === JSON.stringify(raw[k]);
    if (!same) throw new Error(`round-trip mismatch in ${f} (${k})`);
  }
  const text = JSON.stringify(enc);
  writeFileSync(p, text);
  after += Buffer.byteLength(text);
  converted++;
}
console.log(`[lexis:compact] ${converted} converted, ${already} already compact; ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
