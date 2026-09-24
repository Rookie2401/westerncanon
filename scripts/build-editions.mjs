// Builds the two sibling editions into one deployable tree:
//   dist/            the English edition        (VITE_EDITION=en)
//   dist/original/   the original-language edition (VITE_EDITION=original)
// Each is a complete, separately-installable PWA (relative base, own sw.js).
// Usage: node scripts/build-editions.mjs [en|original|all]   (default: both)
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const which = process.argv[2] ?? 'both';
const editions = which === 'both' ? ['en', 'original'] : [which];

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const out = join(root, 'dist');
if (which === 'both' && existsSync(out)) rmSync(out, { recursive: true, force: true });
for (const ed of editions) {
  const outDir = which === 'both' ? (ed === 'en' ? 'dist' : join('dist', 'original')) : 'dist';
  console.log(`\n[build-editions] ${ed} -> ${outDir}`);
  run('node', ['scripts/copy-corpus.mjs'], { EDITION: ed });
  // Stage into a temp dir first so the nested `dist/original` build never
  // touches the parent's output while it runs.
  const stage = join(root, `.build-${ed}`);
  rmSync(stage, { recursive: true, force: true });
  run('npx', ['vite', 'build', '--outDir', stage, '--emptyOutDir'], { VITE_EDITION: ed });
  mkdirSync(join(root, outDir), { recursive: true });
  cpSync(stage, join(root, outDir), { recursive: true });
  rmSync(stage, { recursive: true, force: true });
}
console.log(`\n[build-editions] done: ${editions.join(' + ')}`);
