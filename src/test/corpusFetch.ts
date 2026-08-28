import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { vi } from 'vitest';

// Vitest runs with cwd = project root. import.meta.url is not a file: URL under
// the jsdom environment, so resolve from cwd instead.
const dataDir = resolve(process.cwd(), 'data', 'summa');

/**
 * Stub global fetch so the corpus loader reads the committed JSON straight from
 * disk (data/summa/) during tests — no dev server, no network.
 */
export function installCorpusFetch(): void {
  vi.stubGlobal('fetch', async (input: unknown) => {
    const url = String(input);
    const marker = '/summa/';
    const idx = url.indexOf(marker);
    const name = idx >= 0 ? url.slice(idx + marker.length).split('?')[0] : null;
    if (!name) throw new Error(`unexpected fetch in test: ${url}`);
    const text = await readFile(join(dataDir, name), 'utf8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(text),
      text: async () => text,
    } as Response;
  });
}
