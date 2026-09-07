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
  it('renders Book I as a closed disclosure carrying its editorial title, expands to reveal Definitions/Postulates/Common Notions as single consolidated links and a Propositions disclosure, and expands Propositions to reveal Proposition 1 as a leaf link', async () => {
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

    // Definitions/Postulates/Common Notions are consolidatable groups: each
    // is now a single link straight into the reader (all of that category's
    // entries read together on one tabbed page), not a disclosure hiding N
    // individually-clickable leaves.
    const defsLink = bookIScope.getByRole('link', { name: /Definitions/ });
    expect(defsLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-definitions`);
    const postsLink = bookIScope.getByRole('link', { name: /Postulates/ });
    expect(postsLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-postulates`);
    const cnLink = bookIScope.getByRole('link', { name: /Common Notions/ });
    expect(cnLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-common-notions`);

    // Propositions is not consolidatable (48 full proofs, each often with its
    // own diagram) and keeps the existing disclosure-of-individual-leaves
    // treatment.
    const propsBtn = bookIScope.getByRole('button', { name: /Propositions/ });
    expect(propsBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(propsBtn);
    const propsScope = within(propsBtn.closest('.entrygroup') as HTMLElement);
    const prop1 = propsScope.getByRole('link', { name: '§ 1' });
    expect(prop1.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-prop-1`);
    // This test mounts the whole WorkScreen against the real 611-leaf work.json
    // and drives disclosure expansions; it legitimately runs close to (and,
    // on a loaded machine, over) the 5s default test timeout, so it gets an
    // explicit allowance rather than being flaky under normal CI load.
  }, 20000);
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

  it("renders Book I's real diagram as a mask-tinted figure (sourced from the printed edition) with its citation and alt text", async () => {
    renderAt('book-1-prop-1');
    // Proposition 1's construction paragraph carries a <figure/> marker (Heiberg, Elements I.1),
    // and Book I is the one book with a real, hand-checked diagram image for every proposition.
    // The image ships as a transparent-background PNG used as a CSS mask (tinted via the app's
    // own accent colour, theme-reactive), never a plain <img> - see GenericReader.tsx.
    expect(await screen.findByText('Heiberg, Elements I.1')).toBeTruthy();
    const fig = document.querySelector<HTMLElement>('.gr-figure__img');
    expect(fig).toBeTruthy();
    expect(fig!.getAttribute('role')).toBe('img');
    expect(fig!.style.maskImage).toContain('euclid-elements/images/book-1-prop-1.png');
    expect(fig!.getAttribute('aria-label')).toMatch(/Heiberg, Elements I\.1/);
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(screen.queryByText(/not yet available in this build/i)).toBeNull();
  });

  it('renders a passage carrying a diagram marker for a book without a real image yet as an honest note, never as a figure mask', async () => {
    renderAt('book-2-prop-1');
    expect(
      await screen.findByText(/A diagram appears here in the printed edition/i),
    ).toBeTruthy();
    expect(screen.getByText('Heiberg, Elements II.1')).toBeTruthy();
    expect(document.querySelector('.gr-figure__img')).toBeNull();
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

describe('GenericReader (Euclid Elements) - consolidated Preliminaries', () => {
  function renderAt(divId: string) {
    return render(
      <MemoryRouter initialEntries={[`/read/${WORK_ID}/${divId}`]}>
        <Routes>
          <Route path="/read/:workId/:divId" element={<GenericReader />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders Book I Definitions with all 23 definitions on one page, a tab bar for its trio, and Definitions marked active', async () => {
    renderAt('book-1-definitions');
    expect(
      await screen.findByText('σημεῖόν ἐστιν, οὗ μέρος οὐθέν.'),
    ).toBeTruthy();
    // Definition 23 (the last one) is on the SAME page — proof this is one
    // consolidated view, not just definition 1 alone.
    expect(
      screen.getByText(/παράλληλοί εἰσιν εὐθεῖαι/),
    ).toBeTruthy();

    const tabs = screen.getByRole('navigation', { name: 'Preliminaries' });
    const defsTab = within(tabs).getByRole('link', { name: 'Definitions' });
    const postsTab = within(tabs).getByRole('link', { name: 'Postulates' });
    const cnTab = within(tabs).getByRole('link', { name: 'Common Notions' });
    expect(defsTab.getAttribute('aria-current')).toBe('page');
    expect(postsTab.getAttribute('aria-current')).toBeNull();
    expect(cnTab.getAttribute('aria-current')).toBeNull();
    expect(postsTab.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-postulates`);
    expect(cnTab.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-common-notions`);
  });

  it('renders Book I Postulates as the active tab with its own content only, not Definitions', async () => {
    renderAt('book-1-postulates');
    expect(
      await screen.findByText('Ἠιτήσθω ἀπὸ παντὸς σημείου ἐπὶ πᾶν σημεῖον εὐθεῖαν γραμμὴν ἀγαγεῖν.'),
    ).toBeTruthy();
    expect(screen.queryByText('σημεῖόν ἐστιν, οὗ μέρος οὐθέν.')).toBeNull();

    const tabs = screen.getByRole('navigation', { name: 'Preliminaries' });
    expect(
      within(tabs).getByRole('link', { name: 'Postulates' }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it("renders Book II's single Definitions group (no Postulates/Common Notions sibling) as one page with both definitions and no tab bar", async () => {
    renderAt('book-2-definitions');
    expect(
      await screen.findByText(/πᾶν παραλληλόγραμμον ὀρθογώνιον/),
    ).toBeTruthy();
    expect(screen.getByText(/παντὸς δὲ παραλληλογράμμου/)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Preliminaries' })).toBeNull();
  });

  it("treats Book I's Definitions/Postulates/Common Notions trio as a single Prev/Next stop, ahead of Proposition 1", async () => {
    renderAt('book-1-prop-1');
    const prevLink = await screen.findByRole('link', { name: /Prev/ });
    expect(prevLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-definitions`);
  });
});
