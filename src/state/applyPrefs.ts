/**
 * Applies reading preferences to <html>: the resolved theme (`data-theme`) and
 * the reading typography custom properties. Mirrors the pre-paint inline script
 * in index.html — keep FONT_SIZES / LINE_HEIGHTS in sync with that script.
 */
import { FONT_SIZES, LINE_HEIGHTS, getPrefs } from './storage.ts';
import type { Prefs, ThemeChoice } from './storage.ts';

export function resolveTheme(theme: ThemeChoice): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyPrefs(p: Prefs = getPrefs()): void {
  const root = document.documentElement;
  root.style.setProperty('--reading-font-size', FONT_SIZES[p.fontSize] ?? FONT_SIZES[2]);
  root.style.setProperty('--reading-line-height', LINE_HEIGHTS[p.lineSpacing] ?? LINE_HEIGHTS[1]);
  root.setAttribute('data-theme', resolveTheme(p.theme));
}
