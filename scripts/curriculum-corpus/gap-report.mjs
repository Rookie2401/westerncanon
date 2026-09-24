// Compares the Codex curriculum audit (corpus.json) with this library's
// registry: which curriculum authors/works are already in the app, which are
// missing, and what the audit records as the authoritative edition and access
// for each missing work. Writes GAP-REPORT.md next to this file.
//   node scripts/curriculum-corpus/gap-report.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const corpus = JSON.parse(readFileSync(join(here, 'corpus.json'), 'utf8'));
const registry = readFileSync(join(root, 'src/library/registry.ts'), 'utf8');

// Registry authors (displayName) and works (commonTitle) - parsed from source.
const authors = [...registry.matchAll(/id: '([^']+)',\r?\n\s+displayName: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));
// A quoted registry string: anything but a quote or backslash, or a backslash escape.
const BS = String.fromCharCode(92);
const STR = `'((?:[^'${BS}${BS}]|${BS}${BS}.)*)'`;
const WORK_RE = new RegExp(`id: '([^']+)',\\r?\\n\\s+authorId: '([^']+)',\\r?\\n\\s+title: ${STR},\\r?\\n\\s+commonTitle: ${STR}`, 'g');
const works = [...registry.matchAll(WORK_RE)].map((m) => ({ id: m[1], authorId: m[2], title: m[3], commonTitle: m[4] }));

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const surname = (name) => { const parts = norm(name).replace(/\b(saint|st|of|de|da|von|van|the|elder|younger)\b/g, ' ').trim().split(' ').filter(Boolean); return parts[parts.length - 1] ?? ''; };
const keyWords = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 3 && !['book', 'books', 'works', 'selected', 'selections', 'complete', 'from', 'with', 'and', 'the'].includes(w)));

// Author match: registry author whose normalized name shares the surname or whose name is contained.
const authorMatch = (name) => {
  const n = norm(name); const sn = surname(name);
  return authors.find((a) => { const an = norm(a.name); return an === n || n.includes(an) || an.includes(n) || (sn.length > 3 && surname(a.name) === sn); }) ?? null;
};
const worksOf = (authorId) => works.filter((w) => w.authorId === authorId);
const workMatch = (authorId, title) => {
  const kw = keyWords(title); if (!kw.size) return null;
  let best = null, bestScore = 0;
  for (const w of worksOf(authorId)) {
    const wk = new Set([...keyWords(w.commonTitle), ...keyWords(w.title)]);
    let hit = 0; for (const k of kw) if (wk.has(k)) hit++;
    const score = hit / kw.size;
    if (score > bestScore) { bestScore = score; best = w; }
  }
  return bestScore >= 0.5 ? best : null;
};

const byAuthor = new Map();
for (const e of corpus.editions) {
  if (!e['Author']) continue;
  const list = byAuthor.get(e['Author']) ?? []; list.push(e); byAuthor.set(e['Author'], list);
}
const curriculumByAuthor = new Map();
for (const c of corpus.curriculum) { const k = c['Author normalized']; if (!k) continue; const l = curriculumByAuthor.get(k) ?? []; l.push(c); curriculumByAuthor.set(k, l); }

let present = [], partial = [], missing = [];
const rows = [];
for (const a of corpus.authors) {
  const name = a['Author / creator'];
  const eds = (byAuthor.get(name) ?? []).filter((e) => ['corpus_work_record', 'complete_extant_work'].includes(e['Work scope status']));
  const match = authorMatch(name);
  const have = match ? eds.filter((e) => workMatch(match.id, e['Work title (English)'])) : [];
  const status = !match ? 'missing' : have.length === eds.length && eds.length > 0 ? 'present' : 'partial';
  ({ missing, partial, present })[status].push(name);
  rows.push({ name, type: a['Creator type'], colleges: a['College(s)'], years: a['Year(s)'], curriculumRows: a['Curriculum rows'], corpusRows: eds.length, inApp: match?.id ?? '', have: have.length, status,
    missingWorks: eds.filter((e) => !have.includes(e)).map((e) => ({ title: e['Work title (English)'], orig: e['Original title'], lang: e['Original language'], survival: e['Survival status'], attribution: e['Attribution status'], origEd: e['Original edition citation'], origAccess: e['Original access URL'], transl: e['English translation citation'], translAccess: e['Translation access URL'], origPdf: e['Original-language PDF'], enPdf: e['English PDF'], rights: e['PDF rights / access note'], note: e['Notes'] })) });
}
rows.sort((x, y) => (y.curriculumRows ?? 0) - (x.curriculumRows ?? 0) || x.name.localeCompare(y.name));

let md = `# Curriculum corpus vs. this library — gap report\n\nSource: Codex audit of the Thomas Aquinas College and St. John's College reading programs (audit date 2026-09-24; see aquinas_st_johns_research_report.md). Matching is by author surname and title keywords against src/library/registry.ts, so treat "present"/"partial" as a first pass to be confirmed by hand, not a verdict.\n\n`;
md += `- Curriculum authors/creators: ${rows.length}\n- Already in the library (every audited complete work matched): ${present.length}\n- Partly in the library: ${partial.length}\n- Not in the library at all: ${missing.length}\n- Audited complete-work records: ${corpus.editions.filter((e) => ['corpus_work_record', 'complete_extant_work'].includes(e['Work scope status'])).length}\n\n`;
const section = (title, list) => {
  md += `## ${title} (${list.length})\n\n`;
  for (const r of list) {
    md += `### ${r.name}${r.type && r.type !== 'individual' ? ` (${r.type})` : ''} — ${r.colleges ?? ''}${r.years ? `, ${r.years}` : ''}; ${r.curriculumRows ?? 0} curriculum row(s); ${r.corpusRows} audited work(s)${r.inApp ? `; in app as \`${r.inApp}\` (${r.have}/${r.corpusRows} matched)` : ''}\n\n`;
    for (const w of r.missingWorks) {
      md += `- **${w.title}**${w.orig && w.orig !== w.title ? ` (*${w.orig}*)` : ''} — ${w.lang ?? '?'}; ${w.survival ?? ''}${w.attribution && w.attribution !== 'secure' ? `, attribution ${w.attribution}` : ''}\n`;
      if (w.origEd) md += `  - Original: ${w.origEd}${w.origAccess ? ` — ${w.origAccess}` : ''}\n`;
      if (w.transl) md += `  - English: ${w.transl}${w.translAccess ? ` — ${w.translAccess}` : ''}\n`;
      if (w.origPdf) md += `  - Original PDF: ${w.origPdf}\n`;
      if (w.enPdf) md += `  - English PDF: ${w.enPdf}${w.rights ? ` (${w.rights})` : ''}\n`;
      if (w.note) md += `  - Note: ${String(w.note).slice(0, 300)}\n`;
    }
    md += '\n';
  }
};
section('Not in the library', rows.filter((r) => r.status === 'missing'));
section('Partly in the library', rows.filter((r) => r.status === 'partial'));
md += `## Already in the library (${present.length})\n\n${rows.filter((r) => r.status === 'present').map((r) => `- ${r.name} (\`${r.inApp}\`)`).join('\n')}\n`;
writeFileSync(join(here, 'GAP-REPORT.md'), md);
writeFileSync(join(here, 'gap.json'), JSON.stringify(rows, null, 1));
console.log(`present ${present.length}, partial ${partial.length}, missing ${missing.length}`);
console.log('present:', present.join('; '));
console.log('partial:', partial.join('; '));
