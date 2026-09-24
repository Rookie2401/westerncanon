import { describe, expect, it } from 'vitest';
import { tokenize as tsTokenize, looseKey, foldKey, shardPrefix, wordTokens } from '../lexis/tokenize.ts';
// scripts/lexis/lib.mjs is a plain-JS mirror (no .d.ts) owned by the contract
// package; this file's whole job is asserting it agrees with tokenize.ts.
// @ts-expect-error -- no type declarations for the plain-JS mirror
import { tokenize as jsTokenize, looseKey as jsLooseKey, foldKey as jsFoldKey } from '../../scripts/lexis/lib.mjs';
import type { LexLang } from '../lexis/types.ts';

/**
 * >=30 fixtures per language, exercising: elision, final sigma, combining
 * marks (Greek); macrons/breves, ligatures, j/v (Latin); apostrophes/elision
 * (Italian); plus numbers, punctuation and newlines shared by all three.
 * For every fixture we assert (a) the TS tokenizer and its scripts/lexis/lib.mjs
 * mirror agree exactly, and (b) the tokens cover the whole text with no gaps
 * or overlaps (every character belongs to exactly one token, in order).
 */
const GRC_FIXTURES: string[] = [
  'λόγος',
  'λόγος ἐστίν',
  'ἄνθρωπος',
  'ἀγαθός',
  "δ᾽ ἄρα",
  "τοῦτο δ' ἔστιν",
  'ἀλλ᾽ ὅμως',
  'ὦ ἄνθρωπε',
  'τῆς ψυχῆς',
  'οἱ ἄνθρωποι',
  'πόλεις καὶ νόμοι',
  'Σωκράτης',
  'ὁ Σωκράτης λέγει',
  'ἐν ἀρχῇ ἦν ὁ λόγος',
  'γράφει.',
  'γράφει· λέγει;',
  'γράφει, λέγει.',
  'βιβλίον 1',
  'κεφάλαιον 12',
  'Ἀριστοτέλης',
  'Ἀριστοτέλους',
  'τῇ πόλει',
  'ᾅδης',
  'ᾠδή',
  "ὥστ' εἰπεῖν",
  'μῆνις ἄειδε θεὰ',
  'οὐρανὸς\nκαὶ γῆ',
  'ἵππος καὶ ναῦς',
  'πρῶτος λόγος (α)',
  'δεύτερος — τρίτος',
  'ἡ ψυχή ἐστιν ἀθάνατος',
  'σοφία τε καὶ ἀρετή',
  'εἷς, δύο, τρεῖς',
];

const LA_FIXTURES: string[] = [
  'amō amāre',
  'āmāvī āmātum',
  'puella pulchra',
  'rēgīna Rōmae',
  'Gallia est omnis dīvīsa',
  'quīnque viīs',
  'grātiā Deī',
  'caelum et terra',
  'pœna gravis',
  'cælum serēnum',
  'Iūlius Cæsar',
  'jam nunc',
  'jūstitia',
  'iūstitia',
  'volō, velle, voluī',
  'amō, amās, amat',
  'liber prīmus.',
  'liber secundus; caput tertium',
  'quid est vēritās?',
  'annō 1520',
  'capitulum 3',
  'ō tempora, ō mōrēs!',
  'rēx et rēgīna',
  'aqua vīvā',
  'terra\nmarique',
  'in prīncipiō erat verbum',
  'vēnī, vīdī, vīcī',
  'per omnia sæcula sæculōrum',
  'sub speciē æternitātis',
  'Xāvier et Yōlanda',
  'nātūra nōn facit saltūs',
  'ūnus, duo, trēs',
];

const IT_FIXTURES: string[] = [
  "l'amore",
  "dell'anima",
  "un'idea",
  'nel mezzo del cammin',
  "l'albero",
  "c'è",
  'volere è potere',
  "quest'uomo",
  "un po' di pane",
  'Dio ci ama',
  'la ragazza bella',
  'io vado, tu vai',
  'libro primo.',
  'capitolo secondo; sezione terza',
  'che cosa è verità?',
  'anno 1300',
  'capitolo 5',
  "l'anno 2026",
  "dell'amore e della vita",
  'perché no?',
  'così va il mondo',
  'più o meno',
  'città e paesi',
  "sant'Anna",
  'buongiorno\na tutti',
  "l'uomo e la donna",
  "un'altra cosa",
  "gli amici dell'anima",
  'Firenze, Roma e Napoli',
  'uno, due, tre',
  "l'acqua e il vino",
];

function assertFullCoverage(text: string, lang: LexLang): void {
  const tokens = tsTokenize(text, lang);
  expect(tokens.length).toBeGreaterThan(0);
  let cursor = 0;
  let rebuilt = '';
  for (const t of tokens) {
    expect(t.start).toBe(cursor);
    expect(t.end).toBeGreaterThan(t.start);
    expect(text.slice(t.start, t.end)).toBe(t.surface);
    rebuilt += t.surface;
    cursor = t.end;
  }
  expect(cursor).toBe(text.length);
  expect(rebuilt).toBe(text);
}

describe.each([
  ['grc', GRC_FIXTURES],
  ['la', LA_FIXTURES],
  ['it', IT_FIXTURES],
] as const)('tokenize(%s)', (lang, fixtures) => {
  it(`has at least 30 fixtures for ${lang}`, () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  it.each(fixtures)('TS and scripts/lexis/lib.mjs agree on %j', (text) => {
    const ts = tsTokenize(text, lang);
    const js = jsTokenize(text, lang);
    expect(ts).toEqual(js);
  });

  it.each(fixtures)('tokens cover the whole text exactly for %j', (text) => {
    assertFullCoverage(text, lang);
  });
});

describe('looseKey / foldKey mirror', () => {
  it.each([...GRC_FIXTURES, ...LA_FIXTURES, ...IT_FIXTURES])(
    'looseKey/foldKey of every word token in %j matches the .mjs mirror',
    (text) => {
      for (const lang of ['grc', 'la', 'it'] as const) {
        for (const tok of wordTokens(text, lang)) {
          expect(looseKey(tok.surface, lang)).toBe(tok.key);
          expect(looseKey(tok.surface, lang)).toBe(jsLooseKey(tok.surface, lang));
          expect(foldKey(tok.surface, lang)).toBe(jsFoldKey(tok.surface, lang));
        }
      }
    },
  );
});

describe('elision handling', () => {
  it('Greek: an elision mark right after a letter run joins the word token', () => {
    const tokens = tsTokenize("δ᾽ ἄρα", 'grc');
    expect(tokens[0]!.kind).toBe('word');
    expect(tokens[0]!.surface).toBe('δ᾽');
  });

  it("Italian: l'amore tokenizes as one word token including the apostrophe", () => {
    const tokens = tsTokenize("l'amore", 'it');
    expect(tokens[0]!.kind).toBe('word');
    expect(tokens[0]!.surface).toBe("l'");
    expect(tokens[0]!.key).toBe("l'");
    expect(tokens[1]!.surface).toBe('amore');
  });

  it('Latin: elision marks are NOT joined into the word token (la is not in the elision language set)', () => {
    // Latin fixtures never carry a real elision apostrophe, but guard the rule:
    // a straight quote after a Latin word starts a new (punct) token.
    const tokens = tsTokenize("quid'st", 'la');
    expect(tokens.map((t) => t.kind)).toEqual(['word', 'punct', 'word']);
  });
});

describe('final sigma and case', () => {
  it('looseKey lower-cases (JS Unicode case-folding keeps final sigma as final-form ς)', () => {
    expect(looseKey('ΛΟΓΟΣ', 'grc')).toBe('λογος');
    expect(looseKey('λόγος', 'grc')).toBe('λόγος');
  });

  it('foldKey normalizes final sigma to medial sigma and strips accents', () => {
    expect(foldKey('λόγος', 'grc')).toBe('λογοσ');
    expect(foldKey('λόγος', 'grc')).not.toMatch(/ς/);
  });
});

describe('Latin macrons, ligatures, j/v', () => {
  it('strips macrons/breves and folds j->i, æ/œ ligatures', () => {
    expect(looseKey('Iūlius', 'la')).toBe('iulius');
    expect(looseKey('jam', 'la')).toBe('iam');
    expect(looseKey('cælum', 'la')).toBe('caelum');
    expect(looseKey('pœna', 'la')).toBe('poena');
  });

  it('foldKey additionally unifies v/u', () => {
    expect(foldKey('vīvā', 'la')).toBe('uiua');
  });
});

describe('shardPrefix', () => {
  it('takes the first two letters of the lemma, diacritics stripped, lower-cased', () => {
    expect(shardPrefix('grc:noun:λόγος')).toBe('λο');
    expect(shardPrefix('la:verb:amo')).toBe('am');
    expect(shardPrefix('it:noun:amore')).toBe('am');
  });

  it('strips a homograph suffix (#2, #3) before computing the prefix', () => {
    expect(shardPrefix('la:noun:volo#2')).toBe('vo');
  });

  it('falls back to "_" for an empty lemma', () => {
    expect(shardPrefix('la:noun:')).toBe('_');
  });
});
