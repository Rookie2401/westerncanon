/**
 * Residual OCR-error audit for dante-vita-nuova-it.
 *
 *   npx tsx scripts/import-dante/vita-nuova-it/residualCheck.ts [--dump-unresolved=<file>]
 *
 * WHY. A page-by-page verification against the scans (see index.ts) can
 * still leave a small residue of OCR garbage that reads plausibly at a
 * glance (a sibling lane found ~0.4% of tokens like "ilium" for "illum"
 * surviving such a pass). This audit hunts for that residue with a
 * vocabulary cross-check against a second, independent, complete Italian
 * text of the Vita Nuova: Project Gutenberg #71218 (ed. A. Agresti, Roux e
 * Viarengo, 1902; fetched once, cached as raw/pg71218-crosscheck.txt).
 * That text is used ONLY as a vocabulary - never as source text: it is a
 * different edition with different (modernised) orthography, and nothing
 * from it is ever copied into the shipped work.
 *
 * METHOD. Both texts are tokenised (NFC, lowercase, letters only - so
 * apostrophes split tokens) and each token is reduced to a normalisation
 * key that ignores the orthographic differences between the two editions:
 * accents stripped, u/v and i/j merged, runs of a doubled letter collapsed.
 * Every token of data/dante-vita-nuova-it/work.json whose key never occurs
 * in the cross-check vocabulary is a SUSPECT, listed with its count,
 * chapters and the djvu page(s) it sits on. Every suspect must then be
 * resolved by viewing that page image: either "confirmed-as-printed"
 * (Barbi prints it so; typically a genuine archaic/Barbi form the 1902
 * edition modernised away) or "corrected" (the per-page source under
 * raw/corrected-text/ - or, for pages 307-336, the wikitext correction
 * table in raw/scratch/genProofreadPages.mjs - was fixed and the importer
 * re-run). Resolutions live in raw/residual-audit.json, keyed by the
 * normalisation key. This script prints every suspect with its status and
 * exits non-zero if any suspect is unresolved, so the audit can be re-run
 * until the list is fully accounted for.
 *
 * RESULT OF THE FIRST PASS (2026-09-23): 383 suspects; 14 were genuine
 * residual OCR errors, all on pages the initial review had passed and 13
 * of them on Wikisource-"proofread" pages (e.g. "cho" for "che", "faro"
 * for "fare", "comenciò" for "cominciò", "nr infamasse" for "m'infamasse",
 * "spiritai" for "spirital"); 15 more were print-hyphenation fragments
 * ("reg-"/"gesse") that exposed a page-break rejoin bug in index.ts, since
 * fixed; the rest are Barbi's own spellings, each confirmed on its scan.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORK_JSON = join(REPO_ROOT, 'data', 'dante-vita-nuova-it', 'work.json');
const PAGES_JSON = join(HERE, 'raw', 'corrected-pages.json');
const CROSSCHECK = join(HERE, 'raw', 'pg71218-crosscheck.txt');
const AUDIT = join(HERE, 'raw', 'residual-audit.json');

interface Passage {
  text: string;
}
interface Division {
  id: string;
  passages: Passage[];
}
interface Work {
  divisions: Division[];
}
interface CorrectedPage {
  page: number;
  text: string;
}
export interface AuditEntry {
  key: string;
  forms: string[];
  status: 'confirmed-as-printed' | 'corrected';
  pages: number[];
  note: string;
}
export interface Suspect {
  key: string;
  forms: string[];
  count: number;
  chapters: string[];
  pages: number[];
}

export function tokens(s: string): string[] {
  return s
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((t) => t.length > 0);
}

/** Orthography-insensitive key: accents off, u=v, i=j, doubled letters collapsed. */
export function normKey(token: string): string {
  return token
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/v/g, 'u')
    .replace(/j/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

function crossCheckBody(raw: string): string {
  const start = raw.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
  const end = raw.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
  if (start === -1 || end === -1) {
    process.stderr.write('STOP (residualCheck): Gutenberg START/END markers not found in cross-check text\n');
    process.exit(1);
  }
  return raw.slice(raw.indexOf('\n', start) + 1, end);
}

function main(): void {
  const dumpArg = process.argv.find((a) => a.startsWith('--dump-unresolved='));
  const work = JSON.parse(readFileSync(WORK_JSON, 'utf8')) as Work;
  const pages = JSON.parse(readFileSync(PAGES_JSON, 'utf8')) as CorrectedPage[];
  const vocab = new Set(tokens(crossCheckBody(readFileSync(CROSSCHECK, 'utf8'))).map(normKey));
  const audit = JSON.parse(readFileSync(AUDIT, 'utf8')) as AuditEntry[];
  const auditByKey = new Map(audit.map((a) => [a.key, a]));

  // Per-page token-key sets, for locating each suspect on its djvu page(s).
  const pageKeys = pages.map((p) => ({ page: p.page, keys: new Set(tokens(p.text).map(normKey)) }));

  const suspects = new Map<string, { forms: Set<string>; count: number; chapters: Set<string> }>();
  let totalTokens = 0;
  for (const d of work.divisions) {
    for (const p of d.passages) {
      for (const t of tokens(p.text)) {
        totalTokens += 1;
        const k = normKey(t);
        if (vocab.has(k)) continue;
        const s = suspects.get(k) ?? { forms: new Set<string>(), count: 0, chapters: new Set<string>() };
        s.forms.add(t);
        s.count += 1;
        s.chapters.add(d.id);
        suspects.set(k, s);
      }
    }
  }

  const keys = [...suspects.keys()].sort();
  const unresolvedList: Suspect[] = [];
  let unresolved = 0;
  let confirmed = 0;
  let corrected = 0;
  process.stdout.write(`cross-check vocabulary: ${vocab.size} keys; work tokens: ${totalTokens}; suspects: ${keys.length}\n\n`);
  for (const k of keys) {
    const s = suspects.get(k)!;
    const pagesWith = pageKeys.filter((p) => p.keys.has(k)).map((p) => p.page);
    const a = auditByKey.get(k);
    const status = a ? `${a.status}: ${a.note}` : 'UNRESOLVED';
    if (!a) {
      unresolved += 1;
      unresolvedList.push({ key: k, forms: [...s.forms], count: s.count, chapters: [...s.chapters], pages: pagesWith });
    } else if (a.status === 'confirmed-as-printed') confirmed += 1;
    else corrected += 1;
    process.stdout.write(`${[...s.forms].join('/')}  x${s.count}  [${[...s.chapters].join(',')}]  p.${pagesWith.join(',')}  ${status}\n`);
  }
  const resolvedAway = audit.filter((a) => a.status === 'corrected' && !suspects.has(a.key));
  process.stdout.write(`\ncorrected (token no longer present): ${resolvedAway.length}\n`);
  process.stdout.write(`suspects still present: ${keys.length} (confirmed as printed: ${confirmed}, corrected-but-still-flagged: ${corrected}, UNRESOLVED: ${unresolved})\n`);
  if (dumpArg) {
    const file = dumpArg.slice('--dump-unresolved='.length);
    writeFileSync(file, JSON.stringify(unresolvedList, null, 2) + '\n', 'utf8');
    process.stdout.write(`wrote ${unresolvedList.length} unresolved suspect(s) to ${file}\n`);
  }
  if (unresolved > 0) {
    process.stderr.write(`STOP (residualCheck): ${unresolved} suspect(s) unresolved - view the page image and record each in raw/residual-audit.json\n`);
    process.exit(1);
  }
}

main();
