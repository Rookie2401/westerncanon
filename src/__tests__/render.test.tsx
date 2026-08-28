// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installCorpusFetch } from '../test/corpusFetch.ts';
import { Home } from '../screens/Home.tsx';
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

describe('Home', () => {
  it('renders the title and the four parts + Proœmium', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('Summa Theologiae')).toBeTruthy();
    expect(screen.getByText('Sancti Thomae Aquinatis')).toBeTruthy();
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
