// Extracts the Codex research package (Thomas Aquinas College + St. John's
// College author-corpus audit, 2026-09-24) into JSON the import planning can
// query. Source of truth is the committed workbook; this reads the sibling
// `.inspect.ndjson` dump Codex produced next to it (a cell-by-cell export of
// every sheet) when present, else fails loudly.
//   node scripts/curriculum-corpus/extract.mjs [path-to-inspect.ndjson]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] ?? 'C:/Users/CJWal/Documents/Codex/2026-09-23/us/outputs/aquinas_st_johns_author_corpus_audit.xlsx.inspect.ndjson';
const lines = readFileSync(src, 'utf8').split('\n').filter(Boolean);
const tables = {};
for (const l of lines) {
  const j = JSON.parse(l);
  if (j.kind !== 'table') continue;
  const hi = j.values.findIndex((r) => r && r.filter((x) => x != null).length >= 3);
  if (hi < 0) continue;
  const header = j.values[hi].map((h) => (h == null ? '' : String(h).trim()));
  const rows = j.values.slice(hi + 1).filter((r) => r && r.some((x) => x != null && x !== '')).map((r) => {
    const o = {};
    header.forEach((h, i) => { if (h) o[h] = r[i] ?? null; });
    return o;
  });
  tables[j.sheet] = rows;
}
const out = {
  source: 'aquinas_st_johns_author_corpus_audit.xlsx (Codex, audit date 2026-09-24)',
  authors: tables['Authors'] ?? [],
  curriculum: tables['Curriculum Works'] ?? [],
  editions: tables['Corpus Editions'] ?? [],
  sources: tables['Sources & Method'] ?? [],
  unresolved: tables['Unresolved Items'] ?? [],
};
writeFileSync(join(here, 'corpus.json'), JSON.stringify(out, null, 1));
console.log(Object.entries(out).filter(([k]) => k !== 'source').map(([k, v]) => `${k}=${v.length}`).join(' '));
