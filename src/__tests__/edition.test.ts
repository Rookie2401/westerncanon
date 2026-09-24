import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_REGISTERED_WORKS } from '../library/registry.ts';
import { inEdition, isEnglishOriginal } from '../library/edition.ts';

const DATA = join(process.cwd(), 'data');

describe('editions', () => {
  const all = ALL_REGISTERED_WORKS.filter((w) => w.profile === 'generic');
  const en = all.filter((w) => inEdition(w, 'en'));
  const original = all.filter((w) => inEdition(w, 'original'));

  it('the English edition is exactly the language=en works', () => {
    expect(en.every((w) => w.language === 'en')).toBe(true);
    expect(en.length).toBe(all.filter((w) => w.language === 'en').length);
  });

  it('the original-language edition is every non-English work plus the English originals, nothing else', () => {
    for (const w of original) {
      expect(w.language !== 'en' || isEnglishOriginal(w)).toBe(true);
    }
    const originals = all.filter(isEnglishOriginal).map((w) => w.id).sort();
    // Every English work without a translator is an English ORIGINAL - this
    // list is the complete set as of Phase 2; a new translation lacking its
    // translator field would wrongly land in the original edition, so it is
    // pinned here.
    expect(originals.every((id) => id.startsWith('shakespeare-') || id === 'newton-opticks-en')).toBe(true);
    expect(originals).toHaveLength(45);
    expect(original.length).toBe(all.filter((w) => w.language !== 'en').length + 45);
  });

  it('the two editions together cover every work, and only English originals are in both', () => {
    const both = all.filter((w) => inEdition(w, 'en') && inEdition(w, 'original'));
    expect(both.every(isEnglishOriginal)).toBe(true);
    expect(new Set([...en, ...original].map((w) => w.id)).size).toBe(all.length);
  });

  it("copy-corpus's about.json rule agrees with the registry rule for every work", () => {
    for (const w of all) {
      const p = join(DATA, w.id, 'about.json');
      if (!existsSync(p)) continue;
      const about = JSON.parse(readFileSync(p, 'utf8')) as { language: string; translator?: string };
      const fromAbout = about.language !== 'en' || !about.translator;
      expect({ id: w.id, original: fromAbout }).toEqual({ id: w.id, original: inEdition(w, 'original') });
    }
  });
});
