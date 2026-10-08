// @vitest-environment jsdom
/**
 * The course screens (docs/COURSE-PLAN.md §1) against a synthetic ladder and
 * Stage 0 pack served by a fake fetch: Your path (stages, next step, Stage 0
 * card), Stage 0 (a drill answer is recorded, a step is marked done), the
 * reader's path bar (finishing a unit, reporting, the rescue link), and the
 * edition gate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { __configureCourse } from '../course/index.ts';
import { __configureLexis } from '../lexis/index.ts';
import { __resetDb } from '../lexis/db.ts';
import { __resetVocab } from '../lexis/vocab.ts';
import { __resetEvidence, listEvents, recordEvent } from '../course/evidence.ts';
import { PathScreen } from '../screens/Path.tsx';
import { Stage0Screen } from '../screens/Stage0.tsx';
import { PathBar } from '../course/ui/PathBar.tsx';
import type { CourseLadder, Stage0Pack } from '../course/types.ts';

const ladder: CourseLadder = {
  lang: 'grc',
  version: 1,
  built_at: 't',
  policy: { minEncounters: 3, coreWords: 3, coreShare: 0.6, unitWords: [800, 2500], stages: [] },
  works: { 'plato-apology-grc': { title: 'Apology', author: 'Plato', en: { workId: 'plato-apology-en', aligned: true } } },
  core: ['grc:art:ὁ', 'grc:conj:καί', 'grc:part:δέ'],
  units: [
    { id: 'plato-apology-grc/sec-17', work: 'plato-apology-grc', divs: ['sec-17', 'sec-18'], label: '§ 17–18', words: 900, lemmas: 300, cov3: 0.8, cov1: 0.9, newPer100: 3, unrec: 0.01, pool: 400, stage: 'I', section: 0 },
    { id: 'plato-apology-grc/sec-19', work: 'plato-apology-grc', divs: ['sec-19'], label: '§ 19', words: 700, lemmas: 250, cov3: 0.85, cov1: 0.92, newPer100: 2, unrec: 0.0, pool: 1200, stage: 'II', section: 0 },
  ],
};

const pack: Stage0Pack = {
  lang: 'grc',
  version: 1,
  built_at: 't',
  pronunciation: { note: 'A note on sounds.', sources: ['Allen, Vox Graeca'] },
  script: [{ id: 'alphabet', title: 'The alphabet', intro: ['Twenty-four letters.'], rows: [{ sign: 'Α α', name: 'alpha', translit: 'a', sound: 'a as in father' }] }],
  coreShare: 0.6,
  core: Array.from({ length: 8 }, (_, i) => ({ id: `grc:noun:w${i}`, lemma: `λόγος${i}`, pos: 'noun', gloss: `gloss ${i}`, count: 10, share: 0.01, translit: `lógos${i}` })),
  micro: [{ text: 'τί δʼ ἔστι;', work: 'plato-apology-grc', div: 'sec-17', cite: '§ 17', words: [{ surface: 'τί', lemma: 'τίς', pos: 'pron', gloss: 'who? what?', morph: 'pron nom sg n' }, { surface: 'δʼ', lemma: 'δέ', pos: 'part', gloss: 'but', morph: 'part' }, { surface: 'ἔστι', lemma: 'εἰμί', pos: 'verb', gloss: 'to be', morph: 'verb pres ind act 3 sg' }] }],
  provenance: { words: 'From the corpus.', micro: 'Verbatim sentences.' },
};

function fakeFetch(): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input);
    const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as Response;
    if (url.includes('course/ladder.grc.json')) return json(ladder);
    if (url.includes('course/stage0.grc.json')) return json(pack);
    if (url.includes('course/ladder.')) return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as Response;
    if (url.includes('lexis/manifest.json')) return json({ version: 1, built_at: 't', languages: {}, works: {} });
    if (url.endsWith('/work.json')) return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as Response;
    throw new Error(`unexpected fetch in course test: ${url}`);
  }) as typeof fetch;
}

beforeEach(() => {
  __resetDb();
  __resetVocab();
  __resetEvidence();
  localStorage.clear();
  localStorage.setItem('course:lang', 'grc');
  const f = fakeFetch();
  __configureCourse({ baseUrl: '/', fetchImpl: f });
  __configureLexis({ baseUrl: '/', fetchImpl: f });
  vi.stubGlobal('fetch', f);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Your path', () => {
  it('shows Stage 0, the next unit, and the stages with their units', async () => {
    render(
      <MemoryRouter>
        <PathScreen />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId('path-next')).toBeTruthy());
    const next = screen.getByTestId('path-next');
    expect(next.getAttribute('data-unit')).toBe('plato-apology-grc/sec-17');
    expect(within(next).getByText(/Plato, Apology/)).toBeTruthy();
    expect(screen.getByTestId('path-stage0').textContent).toContain('0 of 4 steps');
    expect(screen.getByText('Begin with Stage 0').getAttribute('href')).toBe('/path/grc/start');
    const stageI = document.querySelector('[data-stage="I"]')!;
    expect(stageI.textContent).toContain('1 unit');
    const rows = document.querySelectorAll('.co-unit');
    expect(rows.length).toBe(2);
    expect(rows[0]!.getAttribute('data-state')).toBe('next');
    expect(rows[1]!.getAttribute('data-state')).toBe('later');
    expect(rows[0]!.querySelector('a')!.getAttribute('href')).toBe('/read/plato-apology-grc/sec-17');
    expect(document.body.textContent).toContain('Nothing was written or simplified');
  });

  it('moves the next step after a unit is finished', async () => {
    await recordEvent({ type: 'UnitCompleted', lang: 'grc', unitId: 'plato-apology-grc/sec-17', workId: 'plato-apology-grc' });
    render(
      <MemoryRouter>
        <PathScreen />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId('path-next').getAttribute('data-unit')).toBe('plato-apology-grc/sec-19'));
    expect(document.querySelector('.co-unit[data-state="done"]')).toBeTruthy();
  });
});

describe('Stage 0', () => {
  it('renders the script, records a decoding answer, and marks a step done', async () => {
    render(
      <MemoryRouter initialEntries={['/path/grc/start']}>
        <Routes>
          <Route path="/path/:lang/start" element={<Stage0Screen />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('The alphabet')).toBeTruthy());
    expect(document.body.textContent).toContain('a as in father');
    fireEvent.click(screen.getByTestId('stage0-done'));
    await waitFor(async () => expect((await listEvents()).some((e) => e.type === 'Stage0StepCompleted' && e.step === 'script')).toBe(true));
    await waitFor(() => expect(screen.getByText('Marked done')).toBeTruthy());

    fireEvent.click(screen.getByText('Reading the letters'));
    const drill = await screen.findByTestId('drill-decode');
    expect(within(drill).getByTestId('drill-hint')).toBeTruthy(); // the hint shows until three unaided right answers
    const options = within(drill).getAllByRole('button').filter((b) => /^lógos\d$/.test(b.textContent ?? ''));
    expect(options.length).toBe(4);
    fireEvent.click(options[0]!);
    await waitFor(async () => expect((await listEvents()).some((e) => e.type === 'Stage0DecodeAnswered' && e.hinted === true)).toBe(true));
    expect(within(drill).getByTestId('drill-next')).toBeTruthy();
  });

  it('shows the micro-passages verbatim with tap glosses', async () => {
    render(
      <MemoryRouter initialEntries={['/path/grc/start']}>
        <Routes>
          <Route path="/path/:lang/start" element={<Stage0Screen />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('First sentences')).toBeTruthy());
    fireEvent.click(screen.getByText('First sentences'));
    const text = document.querySelector('.co-micro__text')!;
    expect(text.textContent).toBe('τί δʼ ἔστι;');
    fireEvent.click(within(text as HTMLElement).getByText('ἔστι'));
    expect(document.querySelector('.co-micro__gloss')!.textContent).toContain('εἰμί');
    expect(document.querySelector('.co-micro__gloss')!.textContent).toContain('to be');
    expect(document.querySelector('.co-micro__cite')!.textContent).toContain('Plato');
  });
});

describe('the reader path bar', () => {
  it('finishes a unit only on the button, records a report, and links the aligned English section', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <PathBar ladder={ladder} evidence={{ reads: [], lookups: [], events: [] }} lang="grc" workId="plato-apology-grc" divId="sec-18" />
      </MemoryRouter>,
    );
    const bar = screen.getByTestId('path-bar');
    expect(bar.textContent).toContain('unit 1 of 2');
    expect(bar.textContent).toContain('section 2 of 2');
    fireEvent.click(screen.getByText('Most'));
    await waitFor(async () => expect((await listEvents()).some((e) => e.type === 'ComprehensionReported' && e.degree === 'most')).toBe(true));
    expect((await listEvents()).some((e) => e.type === 'UnitCompleted')).toBe(false);
    fireEvent.click(screen.getByTestId('path-finish'));
    await waitFor(async () => expect((await listEvents()).some((e) => e.type === 'UnitCompleted' && e.unitId === 'plato-apology-grc/sec-17')).toBe(true));
    const events = await listEvents();
    rerender(
      <MemoryRouter>
        <PathBar ladder={ladder} evidence={{ reads: [], lookups: [], events }} lang="grc" workId="plato-apology-grc" divId="sec-18" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Finished')).toBeTruthy();
    const rescue = screen.getByText(/English translation of this section/);
    expect(rescue.getAttribute('href')).toContain('plato-apology-en/sec-18');
    fireEvent.click(rescue);
    await waitFor(async () => expect((await listEvents()).some((e) => e.type === 'RescueOpened' && e.divId === 'sec-18')).toBe(true));
  });

  it('renders nothing for a stop off the path of a work with no aligned English', () => {
    const noEn: CourseLadder = { ...ladder, works: { 'plato-apology-grc': { title: 'Apology', author: 'Plato' } } };
    const { container } = render(
      <MemoryRouter>
        <PathBar ladder={noEn} evidence={undefined} lang="grc" workId="plato-apology-grc" divId="sec-99" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });
});
