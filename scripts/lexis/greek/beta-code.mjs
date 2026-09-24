// TLG/CCAT Beta Code -> Unicode (NFC) converter, for Diorisis `form`/`entry` values and LSJ
// `orth`/entry text. Both sources use the same convention (confirmed by direct inspection of
// both raw files): diacritics normally follow the letter they modify ("kate/bhn" = κατέβην),
// but when a letter is capitalised with a leading '*', its diacritics are written BETWEEN the
// '*' and the letter ("*)abdhri/ths" = Ἀβδηρίτης, "*peiraia=" = Πειραιᾶ). This file has no
// dependency on the rest of the app; it is a pure string -> string function, self-tested below.

const LOWER = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ',
  l: 'λ', m: 'μ', n: 'ν', c: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ',
  f: 'φ', x: 'χ', y: 'ψ', w: 'ω', v: 'ϝ',
};
const UPPER = {
  a: 'Α', b: 'Β', g: 'Γ', d: 'Δ', e: 'Ε', z: 'Ζ', h: 'Η', q: 'Θ', i: 'Ι', k: 'Κ',
  l: 'Λ', m: 'Μ', n: 'Ν', c: 'Ξ', o: 'Ο', p: 'Π', r: 'Ρ', s: 'Σ', t: 'Τ', u: 'Υ',
  f: 'Φ', x: 'Χ', y: 'Ψ', w: 'Ω', v: 'Ϝ',
};
// Combining diacritical marks, added in an order NFC will canonically re-sort regardless.
const MARK = {
  ')': '̓', // psili / smooth breathing
  '(': '̔', // dasia / rough breathing
  '/': '́', // oxia / acute
  '\\': '̀', // varia / grave
  '=': '͂', // perispomeni / circumflex
  '+': '̈', // diaeresis
  '|': 'ͅ', // ypogegrammeni / iota subscript
  '^': '̆', // breve (vowel-length note; stripped after composition, see below)
  _: '̄', // macron (vowel-length note; stripped after composition, see below)
};
const DIACRITIC = new Set(Object.keys(MARK));
const LENGTH_MARKS = /[̄̆]/g;

/**
 * Convert one Beta-Code "word run" (a maximal sequence of [A-Za-z*diacritics]) to Unicode.
 * Vowel-length marks (^ macron/breve equivalents) are accepted but dropped after composition:
 * our corpus and Diorisis/LSJ headwords never distinguish long/short vowels in the surface
 * spelling, only in these editorial notes, so keeping them would break matching against
 * `looseKey()`, which never sees them (kaikki's raw forms have the same issue - see
 * GREEK-MORPHOLOGY-RESEARCH.md).
 */
function convertRun(run) {
  let out = '';
  let i = 0;
  const n = run.length;
  while (i < n) {
    let capital = false;
    if (run[i] === '*') {
      capital = true;
      i++;
    }
    // Marks preceding the letter (only meaningful for a capitalised letter; TLG convention).
    let preMarks = '';
    while (i < n && DIACRITIC.has(run[i])) {
      preMarks += run[i];
      i++;
    }
    if (i >= n) {
      // trailing '*' or stray marks with nothing to attach to: emit literally
      out += (capital ? '*' : '') + preMarks;
      break;
    }
    const ch = run[i];
    const lower = ch.toLowerCase();
    const base = capital ? UPPER[lower] : LOWER[lower];
    if (!base) {
      // not a Beta-Code Greek letter (stray char): pass through literally
      out += (capital ? '*' : '') + preMarks + ch;
      i++;
      continue;
    }
    i++;
    let postMarks = '';
    while (i < n && DIACRITIC.has(run[i])) {
      postMarks += run[i];
      i++;
    }
    let combining = '';
    for (const m of preMarks + postMarks) combining += MARK[m] ?? '';
    out += (base + combining).normalize('NFC');
  }
  return out;
}

const WORD_RUN = /[A-Za-z*)(/\\=+^_|]+/g;

/** Convert a full Beta-Code string (may contain spaces, punctuation, colons) to Unicode NFC. */
export function betaToUnicode(s) {
  if (!s) return s;
  let out = s.replace(WORD_RUN, (run) => convertRun(run));
  // NFC may have composed a breve/macron combination into a single Greek-Extended codepoint
  // (e.g. U+1FB0 α+breve); decompose to NFD so the length mark is a separate combining char
  // again before stripping it, then recompose.
  out = out.normalize('NFD').replace(LENGTH_MARKS, '').normalize('NFC');
  // final sigma: any σ not immediately followed by another Greek letter becomes ς
  out = out.replace(/σ(?![Ͱ-Ͽἀ-῿])/g, 'ς');
  return out;
}

// ---- self-test (run directly: `node scripts/lexis/greek/beta-code.mjs`) ----
if ((process.argv[1] ?? '').replace(/\\/g, '/').endsWith('greek/beta-code.mjs')) {
  const cases = [
    ['kate/bhn', 'κατέβην'],
    ['xqe\\s', 'χθὲς'], // grave: positional variant, attested as printed in running text
    ['ei)s', 'εἰς'],
    ['*peiraia=', 'Πειραιᾶ'],
    ['meta\\', 'μετὰ'],
    ['*glau/kwnos', 'Γλαύκωνος'],
    ['tou=', 'τοῦ'],
    ['*)ari/stwnos', 'Ἀρίστωνος'],
    ['proseuco/meno/s', 'προσευξόμενός'],
    ['te', 'τε'],
    ['th=|', 'τῇ'],
    ['qew=|', 'θεῷ'],
    ['kai\\', 'καὶ'],
    ['a(/ma', 'ἅμα'],
    ['th\\n', 'τὴν'],
    ['*)abdhri/ths', 'Ἀβδηρίτης'],
    ['*)/abrwn', 'Ἄβρων'],
    ['ba^bu^lw/n', 'βαβυλών'], // length marks (^) stripped
    ['bh=ta', 'βῆτα'],
  ];
  let fail = 0;
  for (const [beta, want] of cases) {
    const got = betaToUnicode(beta);
    if (got !== want) {
      fail++;
      console.log(`FAIL ${beta} -> ${got} (want ${want})`);
    }
  }
  console.log(fail === 0 ? `beta-code.mjs: all ${cases.length} self-tests passed` : `beta-code.mjs: ${fail}/${cases.length} FAILED`);
}
