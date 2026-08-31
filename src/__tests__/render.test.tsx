// @vitest-environment jsdom
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
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installCorpusFetch } from '../test/corpusFetch.ts';
import { fireEvent } from '@testing-library/react';
import { Library } from '../screens/Library.tsx';
import { WorkScreen } from '../screens/Work.tsx';
import { GenericReader } from '../screens/GenericReader.tsx';
import { WorkAboutScreen } from '../screens/WorkAbout.tsx';
import { AUTHORS, authorsSorted } from '../library/registry.ts';
import type { GenericWork, WorkAbout } from '../library/types.ts';
import { Reader } from '../screens/Reader.tsx';

beforeAll(() => {
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
afterAll(() => vi.unstubAllGlobals());

describe('Library', () => {
  it('renders the LIBRARY heading, both authors in chronological order, and work meta', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );

    expect(screen.getByText('LIBRARY')).toBeTruthy();

    const porphyry = screen.getByText('Porphyry');
    const thomas = screen.getByText('Thomas Aquinas');
    expect(porphyry).toBeTruthy();
    expect(thomas).toBeTruthy();
    // Porphyry (sortYear 234) precedes Thomas Aquinas (1225) in the DOM.
    expect(
      porphyry.compareDocumentPosition(thomas) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByText('Greek · Busse')).toBeTruthy();
    expect(screen.getByText('Latin · trans. Boethius')).toBeTruthy();
    expect(screen.getByText('Latin')).toBeTruthy();
  });
});

describe('Work (Summa)', () => {
  it('renders the four parts + Proœmium', () => {
    render(
      <MemoryRouter initialEntries={['/work/summa-theologiae']}>
        <Routes>
          <Route path="/work/:workId" element={<WorkScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Proœmium')).toBeTruthy();
    for (const label of [
      'Prima Pars',
      'Prima Secundae',
      'Secunda Secundae',
      'Tertia Pars',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

describe('Work (generic)', () => {
  const FAKE_WORK: GenericWork = {
    workId: 'isagoge-la',
    language: 'la',
    divisions: [
      {
        id: 'praefatio',
        number: null,
        ref: null,
        sourceHeading: null,
        editorialTitle: 'Preface',
        children: [],
        passages: [],
      },
      {
        id: 'de-genere',
        number: 'I',
        ref: 'Busse 1.1-5.20',
        sourceHeading: 'De genere',
        editorialTitle: 'On Genus',
        children: [],
        passages: [],
      },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', async (input: unknown) => {
      const url = String(input);
      if (url.includes('isagoge-la/work.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => FAKE_WORK,
          text: async () => JSON.stringify(FAKE_WORK),
        } as Response;
      }
      throw new Error(`unexpected fetch in test: ${url}`);
    });
  });
  afterEach(() => installCorpusFetch());

  it('lists top-level divisions with canonical ref and an editorial-title marker', async () => {
    render(
      <MemoryRouter initialEntries={['/work/isagoge-la']}>
        <Routes>
          <Route path="/work/:workId" element={<WorkScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('On Genus')).toBeTruthy();
    expect(screen.getByText('Preface')).toBeTruthy();
    expect(screen.getByText('Busse 1.1-5.20')).toBeTruthy();
    // Editorial titles are visibly flagged as editorial, not source text.
    expect(screen.getByText('English section titles are editorial.')).toBeTruthy();
    expect(screen.getAllByText('ed.').length).toBe(2);
  });
});

describe('GenericReader (Isagoge / Greek)', () => {
  const GRC_WORK: GenericWork = {
    workId: 'isagoge-grc',
    language: 'grc',
    divisions: [
      {
        id: 'praefatio',
        number: null,
        ref: 'Busse p. 1',
        sourceHeading: null,
        editorialTitle: 'Preface',
        children: [],
        passages: [{ n: '', text: 'Ὄντος ἀναγκαίου, Χρυσαόριε,', ref: 'Busse p. 1' }],
      },
      {
        id: 'de-genere',
        number: 'I',
        ref: 'Busse pp. 1–3',
        sourceHeading: 'Περὶ γένους.',
        editorialTitle: 'On Genus',
        children: [],
        passages: [
          { n: '', text: 'Ἔοικεν δὲ μήτε τὸ γένος μήτε τὸ εἶδος ἁπλῶς λέγεσθαι.', ref: 'Busse p. 1' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', async (input: unknown) => {
      const url = String(input);
      if (url.includes('isagoge-grc/work.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => GRC_WORK,
          text: async () => JSON.stringify(GRC_WORK),
        } as Response;
      }
      throw new Error(`unexpected fetch in test: ${url}`);
    });
  });
  afterEach(() => installCorpusFetch());

  function renderAt(divId: string) {
    return render(
      <MemoryRouter initialEntries={[`/read/isagoge-grc/${divId}`]}>
        <Routes>
          <Route path="/read/:workId/:divId" element={<GenericReader />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the verbatim Greek heading + passage, the canonical ref, and a grc-tagged prose block', async () => {
    renderAt('de-genere');
    expect(await screen.findByText('Περὶ γένους.')).toBeTruthy();
    expect(
      screen.getByText('Ἔοικεν δὲ μήτε τὸ γένος μήτε τὸ εἶδος ἁπλῶς λέγεσθαι.'),
    ).toBeTruthy();
    expect(screen.getByText('Busse pp. 1–3')).toBeTruthy();
    // Greek prose is language-tagged so the polytonic font applies.
    expect(document.querySelector('.reader__prose--grc[lang="grc"]')).toBeTruthy();
    // Editorial section title is marked "ed."
    expect(screen.getAllByText('ed.').length).toBeGreaterThan(0);
  });

  it('back pill targets the Work, is labelled with the work title, and is not inside .reader__chrome', async () => {
    renderAt('de-genere');
    const back = await screen.findByRole('link', { name: /back to isagoge/i });
    expect(back.getAttribute('href')).toMatch(/\/work\/isagoge-grc$/);
    expect(back.textContent).toContain('ISAGOGE');
    expect(back.closest('.reader__chrome')).toBeNull();
  });

  it('offers prev/next across divisions', async () => {
    renderAt('de-genere');
    await screen.findByText('Περὶ γένους.');
    const prev = screen.getByRole('link', { name: /Praefatio/i });
    expect(prev.getAttribute('href')).toMatch(/\/read\/isagoge-grc\/praefatio$/);
  });
});

describe('WorkAbout (generic)', () => {
  const ABOUT: WorkAbout = {
    workId: 'isagoge-grc',
    title: 'Isagoge',
    author: 'Porphyry',
    language: 'grc',
    edition: 'Busse 1887',
    editor: 'Adolf Busse',
    provenance: 'TEI from First1KGreek.',
    license: 'CC BY-SA 4.0.',
    sections: [
      { heading: 'The edition', paragraphs: ['Adolf Busse, 1887.'] },
      { heading: 'Known gaps & anomalies', paragraphs: ['The heading of section XII is misprinted.'] },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', async (input: unknown) => {
      const url = String(input);
      if (url.includes('isagoge-grc/about.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ABOUT,
          text: async () => JSON.stringify(ABOUT),
        } as Response;
      }
      throw new Error(`unexpected fetch in test: ${url}`);
    });
  });
  afterEach(() => installCorpusFetch());

  it('renders the prose sections and the licensing note', async () => {
    render(
      <MemoryRouter initialEntries={['/work/isagoge-grc/about']}>
        <Routes>
          <Route path="/work/:workId/about" element={<WorkAboutScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('The edition')).toBeTruthy();
    expect(screen.getByText('Adolf Busse, 1887.')).toBeTruthy();
    expect(screen.getByText('Known gaps & anomalies')).toBeTruthy();
    expect(screen.getByText('CC BY-SA 4.0.')).toBeTruthy();
  });
});

describe('Library accordion', () => {
  it('collapses an author on toggle and hides that author’s works', () => {
    localStorage.clear();
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    );
    // Default: expanded, so a Porphyry work is visible.
    expect(screen.getByText('Greek · Busse')).toBeTruthy();
    const porphyryToggle = screen.getByRole('button', { name: /Porphyry/i });
    fireEvent.click(porphyryToggle);
    expect(screen.queryByText('Greek · Busse')).toBeNull();
    // Thomas is unaffected.
    expect(screen.getByText('Latin')).toBeTruthy();
  });
});

describe('registry', () => {
  it('authorsSorted() orders by sortYear ascending', () => {
    const ids = authorsSorted().map((a) => a.id);
    expect(ids.indexOf('porphyry')).toBeLessThan(ids.indexOf('thomas-aquinas'));
  });

  it('a hypothetical sortYear -384 author slots first', () => {
    const withAristotle = [
      ...AUTHORS,
      { id: 'aristotle', displayName: 'Aristotle', sortYear: -384 },
    ].sort((a, b) => a.sortYear - b.sortYear);
    expect(withAristotle[0]?.id).toBe('aristotle');
  });
});

describe('Reader', () => {
  it('renders OBIECTIO / SED CONTRA / RESPONDEO / AD PRIMUM for I q.2 a.3', async () => {
    render(
      <MemoryRouter initialEntries={['/read/prima-pars/2/3']}>
        <Routes>
          <Route path="/read/:partId/:qNum/:aParam" element={<Reader />} />
        </Routes>
      </MemoryRouter>,
    );

    // utrum heading (also appears in the header mini-line, so target the heading)
    expect(
      await screen.findByRole('heading', { name: 'an Deus sit' }),
    ).toBeTruthy();
    expect(screen.getByText('Obiectio I')).toBeTruthy();
    expect(screen.getByText('Obiectio II')).toBeTruthy();
    expect(screen.getByText('Sed contra')).toBeTruthy();
    expect(screen.getByText('Respondeo')).toBeTruthy();
    expect(screen.getByText('Ad primum')).toBeTruthy();
    expect(screen.getByText('Ad secundum')).toBeTruthy();

    // respondeo body present
    expect(
      screen.getByText(/Respondeo dicendum quod Deum esse quinque viis/),
    ).toBeTruthy();

    // regression guard: no `lang="la"` anywhere in the reader, so EB Garamond's
    // `locl` feature (u->v / j->i) can never be triggered on iOS Safari.
    expect(document.querySelector('[lang="la"]')).toBeNull();
    expect(document.querySelector('.reader__prose')?.hasAttribute('lang')).toBe(
      false,
    );
  });

  it('exposes a back control that targets the parent Quaestio', async () => {
    render(
      <MemoryRouter initialEntries={['/read/prima-pars/2/3']}>
        <Routes>
          <Route path="/read/:partId/:qNum/:aParam" element={<Reader />} />
        </Routes>
      </MemoryRouter>,
    );
    const back = await screen.findByRole('link', {
      name: /back to the quaestio/i,
    });
    // Up-target is the Quaestio route, a safe destination however the article
    // was reached. Not inside .reader__chrome, so immersive mode can't hide it.
    expect(back.getAttribute('href')).toMatch(/\/part\/prima-pars\/q\/2$/);
    expect(back.closest('.reader__chrome')).toBeNull();
  });

  it('shows an honest gap note for a missing article (I q.2 a.1)', async () => {
    render(
      <MemoryRouter initialEntries={['/read/prima-pars/2/1']}>
        <Routes>
          <Route path="/read/:partId/:qNum/:aParam" element={<Reader />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/not present in the bundled source transcription/i),
    ).toBeTruthy();
  });
});
