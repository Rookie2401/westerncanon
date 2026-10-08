import { describe, expect, it } from 'vitest';
import { transliterate } from '../course/translit.ts';
// @ts-expect-error -- no type declarations for the plain-JS mirror
import { transliterate as jsTransliterate } from '../../scripts/course/translit.mjs';

const WORDS = [
  'λόγος', 'ἄνθρωπος', 'ῥήτωρ', 'οὐ', 'ἄγγελος', 'Ἀθῆναι', 'ψυχή', 'ᾠδή', 'ἀϋπνία', 'εὐθύς', 'υἱός', 'αὐτός', 'ἡμεῖς', 'ὁ',
  'θεός', 'Ὅμηρος', 'δῶρον', 'ἐγώ', 'ἀλλ᾽', 'κἀγώ', 'ἔγχος', 'σοφία', 'ὦ', 'Μοῦσα', 'εἶπον', 'ηὗρον', 'τοῦ', 'καί', 'δέ',
];

describe('Greek romanisation (Stage 0 decoding drill)', () => {
  it.each(WORDS)('TS and scripts/course/translit.mjs agree on %s', (w) => {
    expect(transliterate(w)).toBe(jsTransliterate(w));
  });

  it('follows the classroom convention', () => {
    expect(transliterate('λόγος')).toBe('lógos');
    expect(transliterate('ἄνθρωπος')).toBe('ánthrōpos');
    expect(transliterate('ῥήτωρ')).toBe('rhḗtōr');
    expect(transliterate('ἄγγελος')).toBe('ángelos'); // γγ -> ng
    expect(transliterate('ψυχή')).toBe('psychḗ'); // υ alone -> y
    expect(transliterate('υἱός')).toBe('huiós'); // υι diphthong with rough breathing
    expect(transliterate('αὐτός')).toBe('autós');
    expect(transliterate('ᾠδή')).toBe('ōidḗ'); // iota subscript
    expect(transliterate('ἀϋπνία')).toBe('aypnía'); // diaeresis breaks the diphthong
    expect(transliterate('Ὅμηρος')).toBe('Hómēros');
    expect(transliterate('ὁ')).toBe('ho');
    expect(transliterate('ἐγώ')).toBe('egṓ');
  });

  it('keeps non-Greek characters as they are', () => {
    expect(transliterate('abc')).toBe('abc');
    expect(transliterate('λόγος.')).toBe('lógos.');
  });
});
