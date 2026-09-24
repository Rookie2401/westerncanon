// @vitest-environment jsdom
/**
 * Tests for the R-UI package (docs/LEXIS-PLAN.md §5): TokenizedText's text
 * fidelity and tap-to-open, WordCard's levels and reading switch, the
 * Vocabulary screen's counts, and Settings' edition gating.
 *
 * The runtime core (src/lexis/index.ts, morph.ts, vocab.ts, settings.ts,
 * coverage.ts) is being built in parallel by a sibling package and may not
 * exist on disk yet — every one of those modules is mocked here per plan §6's
 * signatures, so these tests are self-contained and don't depend on landing
 * order. Only src/lexis/types.ts and src/lexis/tokenize.ts (already landed,
 * contract-owned) are used for real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { tokenize } from '../lexis/tokenize.ts';
import type { KnownWord, LexLang, Reading, WorkLexis } from '../lexis/types.ts';
import { DEFAULT_LEXIS_SETTINGS } from '../lexis/types.ts';

/* -------------------------------------------------------------------------
   Mocks for the not-yet-landed (or landed-elsewhere) core, per plan §6.
   ------------------------------------------------------------------------- */
const vocabStore = new Map<string, KnownWord>();

vi.mock('../lexis/index.ts', () => ({
  lexisAvailable: (lang: string) => lang === 'grc' || lang === 'la' || lang === 'it',
  loadManifest: vi.fn(async () => ({
    version: 1,
    built_at: '2026-09-24',
    languages: {
      grc: { lexemes: 100, works: 2, coverage: 0.82, sources: [], lex_shards: {} },
      la: { lexemes: 200, works: 3, coverage: 0.91, sources: [], lex_shards: {} },
    },
    works: {},
  })),
  loadWorkLexis: vi.fn(async () => null),
  readingsFor: (bundle: WorkLexis, key: string) => bundle.forms[key] ?? [],
  loadEntry: vi.fn(async () => null),
  __configureLexis: vi.fn(),
}));

vi.mock('../lexis/morph.ts', () => ({
  describeMorph: (tags: string) => `described(${tags})`,
  morphShort: (tags: string) => `short(${tags})`,
  posLabel: (pos: string) => pos,
}));

vi.mock('../lexis/vocab.ts', () => ({
  useStatuses: (keys: string[]) => {
    const m = new Map<string, KnownWord>();
    for (const k of keys) {
      const v = vocabStore.get(k);
      if (v) m.set(k, v);
    }
    return m;
  },
  setStatus: vi.fn(async (key: string, status: KnownWord['status']) => {
    const prev = vocabStore.get(key);
    vocabStore.set(key, {
      key,
      lang: prev?.lang ?? 'grc',
      status,
      reason: 'manual',
      lookups: prev?.lookups ?? 0,
      encounters: prev?.encounters ?? 0,
      first_seen: prev?.first_seen ?? 0,
      last_seen: 0,
      updated_at: 0,
    });
  }),
  recordLookup: vi.fn(async () => {}),
  recordRead: vi.fn(async () => {}),
  markAllKnown: vi.fn(async () => 0),
  exportVocab: vi.fn(async () => '[]'),
  importVocab: vi.fn(async () => 0),
  vocabCounts: vi.fn(async () => ({})),
  // Needed by the Vocabulary screen to enumerate the stored vocabulary —
  // not in plan §6 as written; see the final report.
  listKnownWords: vi.fn(async () => [...vocabStore.values()]),
}));

vi.mock('../lexis/settings.ts', () => ({
  useLexisSettings: () => DEFAULT_LEXIS_SETTINGS,
  setLexisSettings: vi.fn(),
}));

import { TokenizedText } from '../lexis/ui/TokenizedText.tsx';
import { WordCard } from '../lexis/ui/WordCard.tsx';

beforeEach(() => {
  vocabStore.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* -------------------------------------------------------------------------
   Fixture bundle: a tiny hand-built WorkLexis, keyed with the REAL looseKey
   (via the real tokenize.ts) so the fixture can't drift from the tokenizer.
   ------------------------------------------------------------------------- */
const LANG: LexLang = 'grc';
const TEXT = 'λόγος δ᾽ ἐστίν.\nἄλλος λόγος.';

function buildBundle(): WorkLexis {
  const readingsForLogos: Reading[] = [
    ['grc:noun:λόγος', 'noun nom sg m', 1],
    ['grc:noun:λόγος#2', 'noun voc sg m', 0.3],
  ];
  const forms: Record<string, Reading[]> = {};
  for (const t of tokenize(TEXT, LANG)) {
    if (t.kind !== 'word') continue;
    if (t.key === 'λόγος') forms[t.key] = readingsForLogos;
    else if (t.key === 'δ') forms[t.key] = [['grc:conj:δέ', 'conj', 1]];
    else if (t.key === 'ἄλλος') forms[t.key] = [['grc:adj:ἄλλος', 'adj nom sg m', 1]];
    // 'ἐστίν' deliberately left unrecognised
  }
  return {
    workId: 'test-work',
    lang: LANG,
    tokens: 5,
    recognized: 4,
    forms,
    lexemes: {
      'grc:noun:λόγος': { id: 'grc:noun:λόγος', lemma: 'λόγος', pos: 'noun', gloss: 'word, reason' },
      'grc:noun:λόγος#2': { id: 'grc:noun:λόγος#2', lemma: 'λόγος', pos: 'noun', gloss: 'word (homograph)' },
      'grc:conj:δέ': { id: 'grc:conj:δέ', lemma: 'δέ', pos: 'conj', gloss: 'but, and' },
      'grc:adj:ἄλλος': { id: 'grc:adj:ἄλλος', lemma: 'ἄλλος', pos: 'adj', gloss: 'other' },
    },
    analysis: 'test-analysis v0',
  };
}

describe('TokenizedText', () => {
  it('renders text byte-identical to the source, newlines/elision/punctuation included', () => {
    const bundle = buildBundle();
    const { container } = render(
      <p data-testid="text">
        <TokenizedText
          text={TEXT}
          lang={LANG}
          workId="test-work"
          divId="div-1"
          bundle={bundle}
          statuses={new Map()}
          highlight="all"
          morphOnFirstLevel
        />
      </p>,
    );
    expect(container.querySelector('[data-testid="text"]')!.textContent).toBe(TEXT);
  });

  it('opens a WordCard dialog on tapping a recognised word, showing its lemma and gloss', () => {
    const bundle = buildBundle();
    render(
      <TokenizedText
        text={TEXT}
        lang={LANG}
        workId="test-work"
        divId="div-1"
        bundle={bundle}
        statuses={new Map()}
        highlight="all"
        morphOnFirstLevel
      />,
    );
    const words = screen.getAllByText('λόγος');
    fireEvent.click(words[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('word, reason')).toBeTruthy();
  });

  it('opens an honest "no reading" card for an unrecognised word, still offering the status picker', () => {
    const bundle = buildBundle();
    render(
      <TokenizedText
        text={TEXT}
        lang={LANG}
        workId="test-work"
        divId="div-1"
        bundle={bundle}
        statuses={new Map()}
        highlight="all"
        morphOnFirstLevel
      />,
    );
    fireEvent.click(screen.getByText('ἐστίν'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/no reading for this word/i)).toBeTruthy();
    expect(within(dialog).getByRole('group', { name: 'Word status' })).toBeTruthy();
  });
});

describe('WordCard', () => {
  it('shows the top reading\'s lemma, gloss and morphology, and switches on chip click', () => {
    const bundle = buildBundle();
    const readings = bundle.forms['λόγος']!;
    render(
      <WordCard
        surface="λόγος"
        formKey="λόγος"
        lang={LANG}
        workId="test-work"
        divId="div-1"
        readings={readings}
        bundle={bundle}
        morphOnFirstLevel
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('word, reason')).toBeTruthy();
    expect(screen.getByText('described(noun nom sg m)')).toBeTruthy();

    // Two ambiguous readings -> two chips; switching shows the other lexeme's gloss.
    const chips = screen.getAllByRole('button', { name: /λόγος/ }).filter((b) => b.className.includes('lx-chip'));
    expect(chips.length).toBe(2);
    fireEvent.click(chips[1]!);
    expect(screen.getByText('word (homograph)')).toBeTruthy();
  });

  it('closes on Escape', () => {
    const bundle = buildBundle();
    const onClose = vi.fn();
    render(
      <WordCard
        surface="ἄλλος"
        formKey="ἄλλος"
        lang={LANG}
        workId="test-work"
        divId="div-1"
        readings={bundle.forms['ἄλλος']!}
        bundle={bundle}
        morphOnFirstLevel
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Vocabulary screen', () => {
  it('renders per-language status counts and the filtered list', async () => {
    vocabStore.set('grc:noun:λόγος', {
      key: 'grc:noun:λόγος',
      lang: 'grc',
      status: 'known',
      reason: 'manual',
      lookups: 3,
      encounters: 5,
      first_seen: 0,
      last_seen: 0,
      updated_at: 0,
    });
    vocabStore.set('la:verb:amo', {
      key: 'la:verb:amo',
      lang: 'la',
      status: 'new',
      reason: 'lookup',
      lookups: 1,
      encounters: 0,
      first_seen: 0,
      last_seen: 0,
      updated_at: 0,
    });

    const { VocabularyScreen } = await import('../screens/Vocabulary.tsx');
    render(
      <MemoryRouter>
        <VocabularyScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByText('λόγος')).toBeTruthy();
    expect(screen.getByText('amo')).toBeTruthy();
    // One Greek word marked "known" — its count shows under the Greek block.
    expect(
      screen.getByText(
        (_, el) => el?.className === 'lx-vocab-counts__stat' && el.textContent?.replace(/\s+/g, ' ').trim() === '1 known',
      ),
    ).toBeTruthy();
  });
});

describe('Settings — Language help section', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('is absent in the English edition', async () => {
    vi.doMock('../library/edition.ts', () => ({
      EDITION: 'en',
      EDITION_NAME: { en: 'English edition', original: 'Original-language edition', all: 'Complete library' },
      SIBLING_EDITION: null,
    }));
    const { SettingsScreen } = await import('../screens/Settings.tsx');
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Language help')).toBeNull();
  });

  it('is present in the original-language edition', async () => {
    vi.doMock('../library/edition.ts', () => ({
      EDITION: 'original',
      EDITION_NAME: { en: 'English edition', original: 'Original-language edition', all: 'Complete library' },
      SIBLING_EDITION: null,
    }));
    const { SettingsScreen } = await import('../screens/Settings.tsx');
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText('Language help')).toBeTruthy();
  });
});
