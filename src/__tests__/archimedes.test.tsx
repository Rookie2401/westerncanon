// @vitest-environment jsdom
/**
 * Focused render tests for the Archimedes importer's output shape, following
 * the same patterns as src/__tests__/render.test.tsx:
 *   - "Work (generic) — nested Division groups" for the splice-a-synthetic-Work
 *     technique (none of the 13 real archimedes-* workIds are registered yet -
 *     the lead adds them after this importer lands).
 *   - "GenericReader (Isagoge / Greek)" for GenericReader fixture/render style.
 *
 * A fresh, never-before-fetched workId is used per describe block:
 * src/library/genericCorpus.ts caches fetched work.json Promises for the life
 * of the module, so reusing a workId across tests/files would risk hitting
 * another test's cached data instead of this file's fixture.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installCorpusFetch } from '../test/corpusFetch.ts';
import { WorkScreen } from '../screens/Work.tsx';
import { GenericReader } from '../screens/GenericReader.tsx';
import { WORKS } from '../library/registry.ts';
import type { GenericWork, Work } from '../library/types.ts';

beforeEach(() => {
  installCorpusFetch();
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

function stubWorkJson(workId: string, work: GenericWork): void {
  vi.stubGlobal('fetch', async (input: unknown) => {
    const url = String(input);
    if (url.includes(`${workId}/work.json`)) {
      return {
        ok: true,
        status: 200,
        json: async () => work,
        text: async () => JSON.stringify(work),
      } as Response;
    }
    throw new Error(`unexpected fetch in test: ${url}`);
  });
}

const BASE_WORK_FIELDS = {
  authorId: 'porphyry',
  language: 'grc' as const,
  citationScheme: 'test',
  profile: 'generic' as const,
  meta: 'Test fixture',
  source: { provenance: 'test fixture', license: 'n/a' },
};

describe('Work (generic) — Archimedes flat work (e.g. the Sand-Reckoner shape)', () => {
  const WORK_ID = 'test-archimedes-flat-work';
  const TEST_WORK: Work = {
    id: WORK_ID,
    title: 'Ψαμμίτης',
    commonTitle: 'The Sand-Reckoner',
    ...BASE_WORK_FIELDS,
  };
  const FLAT_WORK: GenericWork = {
    workId: WORK_ID,
    language: 'grc',
    divisions: [1, 2, 3, 4].map((n) => ({
      id: `${WORK_ID}-ch-${n}`,
      number: String(n),
      ref: `Mugler vol. 2 p. ${133 + n}`,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: `Chapter ${n} reading text.`, ref: `Mugler vol. 2 p. ${133 + n}` }],
    })),
  };

  beforeEach(() => {
    WORKS.push(TEST_WORK);
    stubWorkJson(WORK_ID, FLAT_WORK);
  });
  afterEach(() => {
    installCorpusFetch();
    const i = WORKS.indexOf(TEST_WORK);
    if (i >= 0) WORKS.splice(i, 1);
  });

  it('renders each numbered chapter as a leaf link, never as a disclosure', async () => {
    render(
      <MemoryRouter initialEntries={[`/work/${WORK_ID}`]}>
        <Routes>
          <Route path="/work/:workId" element={<WorkScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('§ 1');
    for (const n of [1, 2, 3, 4]) {
      const num = screen.getByText(`§ ${n}`);
      const link = num.closest('a.entry');
      expect(link?.getAttribute('href')).toBe(`/read/${WORK_ID}/${WORK_ID}-ch-${n}`);
    }
    // A flat work has no container divisions: no disclosure buttons at all.
    expect(screen.queryAllByRole('button').length).toBe(0);
    // No editorial titles anywhere in this corpus (numbered-only policy).
    expect(screen.queryByText('ed.')).toBeNull();
  });
});

describe('Work (generic) — Archimedes multi-book work (e.g. the Sphere and Cylinder shape)', () => {
  const WORK_ID = 'test-archimedes-books-work';
  const TEST_WORK: Work = {
    id: WORK_ID,
    title: 'Περὶ σφαίρας καὶ κυλίνδρου',
    commonTitle: 'On the Sphere and Cylinder',
    ...BASE_WORK_FIELDS,
  };
  const BOOKS_WORK: GenericWork = {
    workId: WORK_ID,
    language: 'grc',
    divisions: ['1', '2'].map((bn) => ({
      id: `${WORK_ID}-book-${bn}`,
      number: bn === '1' ? 'I' : 'II',
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      passages: [],
      children: ['pr', '1'].map((cn) => ({
        id: `${WORK_ID}-book-${bn}-ch-${cn}`,
        number: cn,
        ref: `Mugler vol. 1 p. ${cn === 'pr' ? 8 : 12}`,
        sourceHeading: cn === 'pr' ? 'Ἀρχιμήδης Δοσιθέῳ χαίρειν' : null,
        editorialTitle: null,
        children: [],
        passages: [
          {
            n: '',
            text: cn === 'pr' ? 'Preface reading text.' : 'Proposition 1 reading text.',
            ref: `Mugler vol. 1 p. ${cn === 'pr' ? 8 : 12}`,
          },
        ],
      })),
    })),
  };

  beforeEach(() => {
    WORKS.push(TEST_WORK);
    stubWorkJson(WORK_ID, BOOKS_WORK);
  });
  afterEach(() => {
    installCorpusFetch();
    const i = WORKS.indexOf(TEST_WORK);
    if (i >= 0) WORKS.splice(i, 1);
  });

  it('renders each Book as a closed-by-default disclosure (never a link), expanding to reveal its numbered chapters', async () => {
    render(
      <MemoryRouter initialEntries={[`/work/${WORK_ID}`]}>
        <Routes>
          <Route path="/work/:workId" element={<WorkScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Book containers carry no invented title - just their number.
    const bookI = await screen.findByRole('button', { name: '§ I' });
    const bookII = screen.getByRole('button', { name: '§ II' });
    expect(bookI.getAttribute('aria-expanded')).toBe('false');
    expect(bookII.getAttribute('aria-expanded')).toBe('false');
    // Never rendered as links - the Book label lives inside the button itself.
    expect(bookI.closest('a')).toBeNull();

    fireEvent.click(bookI);
    const book1Group = within(bookI.closest('.entrygroup')!);
    const prefaceLeaf = book1Group.getByText('§ pr').closest('a.entry');
    expect(prefaceLeaf?.getAttribute('href')).toBe(`/read/${WORK_ID}/${WORK_ID}-book-1-ch-pr`);
    const prop1Leaf = book1Group.getByText('§ 1').closest('a.entry');
    expect(prop1Leaf?.getAttribute('href')).toBe(`/read/${WORK_ID}/${WORK_ID}-book-1-ch-1`);
  });
});

describe('GenericReader (Archimedes) — decoded triangle glyph, honest figure marker, gap anomaly', () => {
  const WORK_ID = 'test-archimedes-reader-work';
  const READER_WORK: GenericWork = {
    workId: WORK_ID,
    language: 'grc',
    divisions: [
      {
        id: 'tri',
        number: '12',
        ref: 'Mugler vol. 1 p. 79',
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [
          {
            n: '',
            text: 'Καὶ ἔστω μέγιστος κύκλος ὁ ΑΒΓ▵, ὥστε τριγώνων ▵Ζ εἶναι.',
            ref: 'Mugler vol. 1 p. 79',
          },
        ],
      },
      {
        id: 'figure',
        number: '13',
        ref: 'Mugler vol. 1 p. 80',
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [
          {
            n: '',
            text: 'Text before the figure marker in the printed edition.',
            ref: 'Mugler vol. 1 p. 80',
            figure: {
              source: 'Mugler, De sphaera et cylindro I.13',
              note: 'A diagram appears here in the printed edition; not yet available in this build.',
            },
          },
        ],
      },
      {
        id: 'gap',
        number: '14',
        ref: 'Mugler vol. 1 p. 81',
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [
          {
            n: '',
            text: 'Text survives before and after the lacuna in this passage.',
            ref: 'Mugler vol. 1 p. 81',
            anomaly:
              'A lacuna (editorial gap, reason: "omitted") occurs in this passage; no text is supplied for the gap.',
          },
        ],
      },
    ],
  };
  const TEST_WORK: Work = {
    id: WORK_ID,
    title: 'Test Archimedes Reader Work',
    ...BASE_WORK_FIELDS,
  };

  beforeEach(() => {
    WORKS.push(TEST_WORK);
    stubWorkJson(WORK_ID, READER_WORK);
  });
  afterEach(() => {
    installCorpusFetch();
    const i = WORKS.indexOf(TEST_WORK);
    if (i >= 0) WORKS.splice(i, 1);
  });

  function renderAt(divId: string) {
    return render(
      <MemoryRouter initialEntries={[`/read/${WORK_ID}/${divId}`]}>
        <Routes>
          <Route path="/read/:workId/:divId" element={<GenericReader />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the decoded ▵ (U+25B3) character correctly inside the passage text', async () => {
    renderAt('tri');
    expect(
      await screen.findByText('Καὶ ἔστω μέγιστος κύκλος ὁ ΑΒΓ▵, ὥστε τριγώνων ▵Ζ εἶναι.'),
    ).toBeTruthy();
    // Never a raw, undecoded numeric entity string leaking into the DOM.
    expect(screen.queryByText(/&#9651;/)).toBeNull();
  });

  it('renders an honest figure note with a source citation and no <img>', async () => {
    renderAt('figure');
    await screen.findByText('Text before the figure marker in the printed edition.');
    expect(
      screen.getByText('A diagram appears here in the printed edition; not yet available in this build.'),
    ).toBeTruthy();
    expect(screen.getByText('Mugler, De sphaera et cylindro I.13')).toBeTruthy();
    expect(document.querySelector('.gr-figure__img')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders a <gap>-derived anomaly note alongside the surviving text, with no fabricated gap-filler text', async () => {
    renderAt('gap');
    const passageText = await screen.findByText('Text survives before and after the lacuna in this passage.');
    expect(passageText).toBeTruthy();
    expect(
      screen.getByText(
        'A lacuna (editorial gap, reason: "omitted") occurs in this passage; no text is supplied for the gap.',
      ),
    ).toBeTruthy();
    // The anomaly note is rendered, not folded into the passage text itself.
    expect(document.querySelector('.gr-passage__anomaly')?.textContent).toMatch(/lacuna/i);
  });
});
