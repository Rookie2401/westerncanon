// Elided/apocopated tokens in Dante's Vita Nuova (13th-c. Tuscan) that the tokenizer keeps as
// their own word (looseKey keeps the trailing apostrophe, e.g. "l'", "dell'" — tokenize.ts §3).
// kaikki's Wiktionary extract has no headword for a bare elided fragment, so each is mapped here
// to the un-elided word(s) it stands for, confirmed by ordinary Italian/Dantean philology (not
// guessed per-instance): a genuine vowel-elision before a following vowel (l' = lo/la), or one of
// Dante's well-known poetic apocopes (fe' = fece, i' = io, se' = sei…). Ambiguous elisions (l',
// quell', s'…) map to every candidate; the reader sees both as alternative readings. An elided
// form NOT in this table is left unmapped — recorded as a miss in REPORT, never invented.
export const ELISION_MAP = {
  "l'": ['lo', 'la'],
  "d'": ['di'],
  "c'": ['ci'],
  "ch'": ['che'],
  "m'": ['mi'],
  "n'": ['ne'],
  "s'": ['si', 'se'],
  "t'": ['ti'],
  "v'": ['vi'],
  "un'": ['una'],
  "quell'": ['quello', 'quella'],
  "com'": ['come'],
  "ov'": ['ove'],
  "dov'": ['dove'],
  "perch'": ['perché'],
  "quand'": ['quando'],
  "sanz'": ['sanza'], // archaic for senza, "without" — attested Dante spelling
  "mentr'": ['mentre'],
  "altr'": ['altro', 'altra', 'altri'],
  "ogn'": ['ogni'],
  "a'": ['ai'],
  "de'": ['dei'],
  "ne'": ['nei'],
  "que'": ['quei'],
  "cu'": ['cui'],
  "fe'": ['fece'],
  "i'": ['io'],
  "sa'": ['sai'],
  "se'": ['sei'],
  "so'": ['sono'],
  "vo'": ['voglio'],
  "ell'": ['ella'],
  "ond'": ['onde'],
  "ciascun'": ['ciascuna'],
  "e'": ['egli'],
};
