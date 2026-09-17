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

describe('Work (Euclid Elements) - nested Book -> flat section list', () => {
  it('renders Book I as a closed disclosure carrying its editorial title, and expanding it reveals ONE flat list: Definitions/Postulates/Common Notions as single consolidated links, immediately followed by Proposition 1 as its own leaf link — no intermediate "Propositions" disclosure', async () => {
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
    // "Definitions"/Proposition-1 entry and would otherwise collide.
    const bookIScope = within(bookI.closest('.entrygroup') as HTMLElement);

    // Definitions/Postulates/Common Notions are consolidatable groups: each
    // is a single link straight into the reader (all of that category's
    // entries read together on one page), not a disclosure hiding N
    // individually-clickable leaves.
    const defsLink = bookIScope.getByRole('link', { name: 'Definitions' });
    expect(defsLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-definitions`);
    const postsLink = bookIScope.getByRole('link', { name: 'Postulates' });
    expect(postsLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-postulates`);
    const cnLink = bookIScope.getByRole('link', { name: 'Common Notions' });
    expect(cnLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-common-notions`);

    // Propositions is NOT consolidatable (48 full proofs, each often with its
    // own diagram) — its own "Propositions" group has no row of its own at
    // all; its leaves are spliced directly into the same flat list, with no
    // extra expand/collapse step in between.
    expect(bookIScope.queryByRole('button', { name: /Propositions/ })).toBeNull();
    expect(bookIScope.queryByRole('link', { name: /Propositions/ })).toBeNull();
    const prop1 = bookIScope.getByRole('link', { name: 'Proposition 1' });
    expect(prop1.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-prop-1`);
    const prop2 = bookIScope.getByRole('link', { name: 'Proposition 2' });
    expect(prop2.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-prop-2`);

    // And it's genuinely ONE flat list: Definitions, Postulates, Common
    // Notions and Proposition 1 are all direct children of the same
    // `.entrygroup__children` container, not nested inside one another.
    const children = bookI.closest('.entrygroup')!.querySelector('.entrygroup__children')!;
    expect(children.contains(defsLink)).toBe(true);
    expect(defsLink.parentElement).toBe(children);
    expect(prop1.parentElement).toBe(children);
    // This test mounts the whole WorkScreen against the real 611-leaf work.json
    // and drives a disclosure expansion; it legitimately runs close to (and,
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
    renderAt('book-5-prop-1');
    expect(
      await screen.findByText(/A diagram appears here in the printed edition/i),
    ).toBeTruthy();
    expect(screen.getByText('Heiberg, Elements V.1')).toBeTruthy();
    expect(document.querySelector('.gr-figure__img')).toBeNull();
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it("renders Book II's real diagram as a mask-tinted figure, with its citation and alt text, the same as Book I", async () => {
    renderAt('book-2-prop-4');
    expect(await screen.findByText('Heiberg, Elements II.4')).toBeTruthy();
    const fig = document.querySelector<HTMLElement>('.gr-figure__img');
    expect(fig).toBeTruthy();
    expect(fig!.getAttribute('role')).toBe('img');
    expect(fig!.style.maskImage).toContain('euclid-elements/images/book-2-prop-4.png');
    expect(fig!.getAttribute('aria-label')).toMatch(/Heiberg, Elements II\.4/);
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(screen.queryByText(/not yet available in this build/i)).toBeNull();
  });

  it("renders Book III's real diagram as a mask-tinted figure, with its citation and alt text, the same as Book I and II", async () => {
    renderAt('book-3-prop-1');
    expect(await screen.findByText('Heiberg, Elements III.1')).toBeTruthy();
    const fig = document.querySelector<HTMLElement>('.gr-figure__img');
    expect(fig).toBeTruthy();
    expect(fig!.getAttribute('role')).toBe('img');
    expect(fig!.style.maskImage).toContain('euclid-elements/images/book-3-prop-1.png');
    expect(fig!.getAttribute('aria-label')).toMatch(/Heiberg, Elements III\.1/);
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(screen.queryByText(/not yet available in this build/i)).toBeNull();
  });

  it("renders Book IV's real diagram as a mask-tinted figure, with its citation and alt text, the same as Books I-III", async () => {
    renderAt('book-4-prop-1');
    expect(await screen.findByText('Heiberg, Elements IV.1')).toBeTruthy();
    const fig = document.querySelector<HTMLElement>('.gr-figure__img');
    expect(fig).toBeTruthy();
    expect(fig!.getAttribute('role')).toBe('img');
    expect(fig!.style.maskImage).toContain('euclid-elements/images/book-4-prop-1.png');
    expect(fig!.getAttribute('aria-label')).toMatch(/Heiberg, Elements IV\.1/);
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(screen.queryByText(/not yet available in this build/i)).toBeNull();
  });

  it('renders Book IV.16 (the one proposition in Books I-IV with no printed diagram at all) as an honest note, never a figure mask', async () => {
    renderAt('book-4-prop-16');
    expect(
      await screen.findByText(/A diagram appears here in the printed edition/i),
    ).toBeTruthy();
    expect(screen.getByText('Heiberg, Elements IV.16')).toBeTruthy();
    expect(document.querySelector('.gr-figure__img')).toBeNull();
    expect(document.querySelector('.gr-figure img')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it("renders Book I, Common Notion 4 with Heiberg's own bracketed wording (a probable later interpolation he prints, not omits) and a flagged anomaly note, rather than a blank division", async () => {
    renderAt('book-1-cn-4');
    // The division still renders its header (§ 4), and now shows Heiberg's
    // own bracketed text - verified directly against his 1883 printed page -
    // instead of nothing.
    await screen.findByRole('heading', { name: '§ 4' });
    expect(
      await screen.findByText('καὶ ἐὰν ἀνίσοις ἴσα προστεθῇ, τὰ ὅλα ἐστὶν ἄνισα.'),
    ).toBeTruthy();
    expect(document.querySelectorAll('.gr-passage').length).toBe(1);
    const anomaly = document.querySelector('.gr-passage__anomaly');
    expect(anomaly).toBeTruthy();
    expect(anomaly!.textContent).toMatch(/Bracketed in Heiberg's printed edition/);
  });

  it("renders Book II, Proposition 4's deleted corollary in place of an orphaned trailing period, flagged, alongside its real proof text", async () => {
    renderAt('book-2-prop-4');
    // The real, never-deleted proof is untouched.
    expect(
      await screen.findByText(/Ἀναγεγράφθω γὰρ ἀπὸ τῆς ΑΒ τετράγωνον/),
    ).toBeTruthy();
    // The paragraph that used to survive as a lone "." (everything but its
    // closing period was <del>-wrapped) now shows Heiberg's own bracketed
    // corollary - verified letter-for-letter against his 1883 printed page -
    // with its punctuation restored to the end of the sentence, not floating
    // on its own.
    const restored = await screen.findByText(
      'ἐκ δὴ τούτου φανερόν, ὅτι ἐν τοῖς τετραγώνοις χωρίοις τὰ περὶ τὴν διάμετρον παραλληλόγραμμα τετράγωνά ἐστιν.',
    );
    expect(restored).toBeTruthy();
    expect(screen.queryByText('.')).toBeNull();
    const anomalies = document.querySelectorAll('.gr-passage__anomaly');
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].textContent).toMatch(/Bracketed in Heiberg's printed edition/);
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

  it('renders Book I Definitions with all 23 definitions on one page, numbered, and no Postulates/Common Notions content mixed in', async () => {
    renderAt('book-1-definitions');
    expect(
      await screen.findByText('σημεῖόν ἐστιν, οὗ μέρος οὐθέν.'),
    ).toBeTruthy();
    // Definition 23 (the last one) is on the SAME page — proof this is one
    // consolidated view, not just definition 1 alone.
    expect(screen.getByText(/παράλληλοί εἰσιν εὐθεῖαι/)).toBeTruthy();
    // Postulate 1's text (a different group) is NOT pulled in.
    expect(
      screen.queryByText('Ἠιτήσθω ἀπὸ παντὸς σημείου ἐπὶ πᾶν σημεῖον εὐθεῖαν γραμμὴν ἀγαγεῖν.'),
    ).toBeNull();
    expect(document.querySelectorAll('.prelim-item').length).toBe(23);
  });

  it("renders Book II's single Definitions group (no Postulates/Common Notions in this book) as one page with both of its definitions", async () => {
    renderAt('book-2-definitions');
    expect(
      await screen.findByText(/πᾶν παραλληλόγραμμον ὀρθογώνιον/),
    ).toBeTruthy();
    expect(screen.getByText(/παντὸς δὲ παραλληλογράμμου/)).toBeTruthy();
    expect(document.querySelectorAll('.prelim-item').length).toBe(2);
  });

  it("navigates Prev/Next straight through Book I's flat sequence — Definitions, Postulates, Common Notions, Proposition 1 — each its own stop", async () => {
    renderAt('book-1-postulates');
    const prevLink = await screen.findByRole('link', { name: /Prev/ });
    expect(prevLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-definitions`);
    const nextLink = screen.getByRole('link', { name: /Next/ });
    expect(nextLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-common-notions`);
  });

  it('treats Common Notions as the stop immediately before Proposition 1', async () => {
    renderAt('book-1-prop-1');
    const prevLink = await screen.findByRole('link', { name: /Prev/ });
    expect(prevLink.getAttribute('href')).toBe(`/read/${WORK_ID}/book-1-common-notions`);
  });
});
