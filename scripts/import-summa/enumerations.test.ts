import { describe, expect, it } from 'vitest';
import { assignArticleTitles, parseArticleEnumeration } from './enumerations.ts';
import { articleCitation, normalizePartCode, partCodeFromReference } from './citations.ts';
import { cleanText, findForbidden, foldForSearch } from './normalize.ts';

describe('parseArticleEnumeration', () => {
  it('picks the final per-article list, not a structural preamble', () => {
    const pr =
      'Quia igitur principalis intentio ... primo tractabimus de Deo; secundo, de motu ...; tertio, de Christo ... ' +
      'Consideratio autem de Deo tripartita erit. Primo namque considerabimus ea quae ad essentiam divinam pertinent; ' +
      'secundo, ea quae pertinent ad distinctionem personarum; tertio, ea quae pertinent ad processum creaturarum ab ipso. ' +
      'Circa primum quaeruntur tria. Primo, utrum Deum esse sit per se notum. Secundo, utrum sit demonstrabile. Tertio, an Deus sit.';
    const [best] = parseArticleEnumeration(pr);
    expect(best).toEqual(['utrum Deum esse sit per se notum', 'utrum sit demonstrabile', 'an Deus sit']);
  });

  it('recovers a run when the source drops the separator before a lower-case ordinal', () => {
    const pr =
      'Circa primum quaeruntur quatuor. Primo, utrum A. Secundo, utrum B. Tertio, utrum C ' +
      'quarto, utrum D.';
    const [best] = parseArticleEnumeration(pr);
    expect(best).toEqual(['utrum A', 'utrum B', 'utrum C', 'utrum D']);
  });

  it('handles ordinals past 12 in both "decimotertio" and "tertiodecimo" shapes', () => {
    const pr =
      'Circa hoc quaeruntur quattuordecim. Primo, utrum a. Secundo, utrum b. Tertio, utrum c. ' +
      'Quarto, utrum d. Quinto, utrum e. Sexto, utrum f. Septimo, utrum g. Octavo, utrum h. ' +
      'Nono, utrum i. Decimo, utrum j. Undecimo, utrum k. Duodecimo, utrum l. ' +
      'Tertiodecimo, utrum M. Quartodecimo, utrum N.';
    const [best] = parseArticleEnumeration(pr);
    expect(best).toHaveLength(14);
    expect(best[12]).toBe('utrum M');
    expect(best[13]).toBe('utrum N');
  });

  it('returns no candidates when there is no enumeration', () => {
    expect(parseArticleEnumeration('Deinde considerandum est de anima.')).toEqual([]);
    expect(parseArticleEnumeration(null)).toEqual([]);
  });
});

describe('assignArticleTitles', () => {
  it('maps titles by article number when the source omits a middle article', () => {
    // q.2: articles 2 and 3 present, enumeration lists three items.
    const pr = 'Circa primum quaeruntur tria. Primo, utrum X. Secundo, utrum Y. Tertio, an Z.';
    const a = assignArticleTitles(pr, [2, 3]);
    expect(a.rejected).toBeNull();
    expect(a.byNumber.get(2)).toBe('utrum Y');
    expect(a.byNumber.get(3)).toBe('an Z');
  });

  it('rejects (all null) when no prooemium', () => {
    const a = assignArticleTitles(null, [1, 2, 3]);
    expect(a.rejected).toBe('no-prooemium');
    expect(a.byNumber.size).toBe(0);
  });

  it('rejects when the parsed count cannot cover the articles', () => {
    const pr = 'Et circa hoc quaeruntur duo. Primo, quae sint partes. Secundo, de singulis.';
    const a = assignArticleTitles(pr, [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a.rejected).toBe('count-mismatch');
  });
});

describe('citations', () => {
  it('normalizes part codes', () => {
    expect(normalizePartCode('Ia')).toBe('I');
    expect(normalizePartCode('Ia-IIae')).toBe('I-II');
    expect(normalizePartCode('IIa-IIae')).toBe('II-II');
    expect(normalizePartCode('IIIa')).toBe('III');
  });

  it('reads the part code from a reference, comma variant included', () => {
    expect(partCodeFromReference('IIa-IIae, q. 128 co.')).toBe('II-II');
    expect(partCodeFromReference('Ia q. 1 pr.')).toBe('I');
  });

  it('builds article citations, unnumbered falls back to the question citation', () => {
    expect(articleCitation('I', 2, 3)).toBe('I q. 2 a. 3');
    expect(articleCitation('II-II', 128, null)).toBe('II-II q. 128');
  });
});

describe('normalize', () => {
  it('collapses whitespace', () => {
    expect(cleanText('  a\n\t b   c ')).toBe('a b c');
  });

  it('folds ligatures and accents for search', () => {
    expect(foldForSearch('Pœna')).toBe('poena');
    expect(foldForSearch('cælum')).toBe('caelum');
    expect(foldForSearch('grātiā')).toBe('gratia');
  });

  it('flags forbidden substrings but not ordinary Latin', () => {
    expect(findForbidden('secundum quod dicitur')).toEqual([]);
    expect(findForbidden('see <tag> here')).toContain('<');
    expect(findForbidden('dit het een woord')).toContain('het');
  });
});
