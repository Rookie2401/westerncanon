// @vitest-environment jsdom
/**
 * Focused tests for the Euclid *Elements* import, following the patterns in
 * render.test.tsx. `euclid-elements` is not yet registered in
 * src/library/registry.ts (the lead adds that after this import lands), so a
 * throwaway Work is spliced into the imported WORKS array for the duration of
 * this file only - see the "Work (generic) - nested Division groups" describe
 * block in render.test.tsx, which is the template for this technique.
 *
 * Rather than a synthetic fixture, these tests stub `fetch` to read the REAL
 * generated data/euclid-elements/work.json straight off disk (mirroring
 * src/test/corpusFetch.ts's approach for the Summa corpus), so they exercise
 * the actual importer output, not a hand-written stand-in.
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installCorpusFetch } from '../test/corpusFetch.ts';
import { WorkScreen } from '../screens/Work.tsx';
import { GenericReader } from '../screens/GenericReader.tsx';
import { WORKS } from '../library/registry.ts';
import type { Work } from '../library/types.ts';

// Vitest runs with cwd = project root (see corpusFetch.ts).
const dataDir = resolve(process.cwd(), 'data', 'euclid-elements');

const WORK_ID = 'euclid-elements';
const TEST_WORK: Work = {
  id: WORK_ID,
  authorId: 'aristotle', // reuse an existing registry author; not under test here
  title: 'Στοιχεῖα',
  commonTitle: 'Elements',
  language: 'grc',
  citationScheme: 'heiberg-book-number',
  profile: 'generic',
  meta: 'Greek · Heiberg',
  source: {
    edition: 'Heiberg 1883-88',
    editor: 'Johan Ludvig Heiberg',
    provenance: 'test fixture (reads the real generated data/euclid-elements/work.json)',
    license: 'n/a - test only',
  },
};

beforeAll(() => {
  vi.stubGlobal('scrollTo', () => {});
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }
});
afterEach(() => cleanup());
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  WORKS.push(TEST_WORK);
  vi.stubGlobal('fetch', async (input: unknown) => {
    const url = String(input);
    const marker = `${WORK_ID}/`;
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
});
afterEach(() => {
  installCorpusFetch();
  const i = WORKS.indexOf(TEST_WORK);
  if (i >= 0) WORKS.splice(i, 1);
});

describe('Work (Euclid Elements) - nested Book -> group -> proposition tree', () => {
  it('renders Book I as a closed disclosure carrying its editorial title, expands to its section-type groups, and expands Propositions to reveal Proposition 1 as a leaf link', async () => {
    render(
      <MemoryRouter initialEntries={[`/work/${WORK_ID}`]}>
        <Routes>
          <Route path="/work/:workId" element={<WorkScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Book I: closed disclosure, never a link, carrying the curated English title.
    const bookI = await screen.findByRole('button', {
      name: /Fundamentals of Plane Geometry/,
    });
    expect(bookI.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: /Fundamentals of Plane Geometry/ })).toBeNull();

    fireEvent.click(bookI);
    expect(bookI.getAttribute('aria-expanded')).toBe('true');

    // Every book's groups are mounted from the start (for the collapse
    // animation, matching the established Library/Work pattern), so scope
    // queries to Book I's own subtree - other books also have a
    // "Definitions"/"Propositions" group and would otherwise collide.
    const bookIScope = within(bookI.closest('.entrygroup') as HTMLElement);

    // Expanding Book I reveals its four section-type groups.
    const defsBtn = bookIScope.getByRole('button', { name: /Definitions/ });
    const postsBtn = bookIScope.getByRole('button', { name: /Postulates/ });
    const cnBtn = bookIScope.getByRole('button', { name: /Common Notions/ });
    const propsBtn = bookIScope.getByRole('button', { name: /Propositions/ });
    expect(defsBtn).toBeTruthy();
    expect(postsBtn).toBeTruthy();
    expect(cnBtn).toBeTruthy();
    expect(propsBtn).toBeTruthy();
    expect(propsBtn.getAttribute('aria-expanded')).toBe('false');

    // Expanding Propositions reveals Proposition 1 as a flat, clickable leaf.
    // Scope to the Propositions group itself - Book I's Definitions,
    // Postulates and Common Notions groups each also start numbering at 1,
    // so "§ 1" alone is ambiguous at the whole-Book-I level.
    fireEvent.click(propsBtn);
    const propsScope = within(propsBtn.closest('.entrygroup') as HTMLElement);
    const prop1 = propsScope.getByRole('link', { name: '§ 1' });
    expect(prop1.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-prop-1`);
  });
});

describe('GenericReader (Euclid Elements)', () => {
  function renderAt(divId: string) {
    return render(
      <MemoryRouter initialEntries={[`/read/${WORK_ID}/${divId}`]}>
        <Routes>
          <Route path="/read/:workId/:divId" element={<GenericReader />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders Book I, Definition 1 with its verbatim Greek text', async () => {
    renderAt('book-1-def-1');
    expect(
      await screen.findByText('σημεῖόν ἐστιν, οὗ μέρος οὐθέν.'),
    ).toBeTruthy();
    expect(document.querySelector('.reader__prose--grc[lang="grc"]')).toBeTruthy();
  });

  it('renders a passage carrying a diagram marker as an honest note with its citation, never as an <img>', async () => {
    renderAt('book-1-prop-1');
    // Proposition 1's construction paragraph carries a <figure/> marker (Heiberg, Elements I.1).
    expect(
      await screen.findByText(/A diagram appears here in the printed edition/i),
    ).toBeTruthy();
    expect(screen.getByText('Heiberg, Elements I.1')).toBeTruthy();
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders a leaf division with zero passages (fully excluded under Heiberg\'s deletion marks) without crashing', async () => {
    renderAt('book-1-cn-4');
    // The division still renders its header (§ 4); the body simply has no passages.
    await screen.findByRole('heading', { name: '§ 4' });
    expect(document.querySelectorAll('.gr-passage').length).toBe(0);
  });
});
