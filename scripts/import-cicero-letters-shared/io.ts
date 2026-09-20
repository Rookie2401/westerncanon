import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function writeJson(outDir: string, name: string, data: unknown): void {
  const file = join(outDir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

export function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}
