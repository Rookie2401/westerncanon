// Romanisation of polytonic Greek for the Stage 0 decoding drills (docs/COURSE-PLAN.md §1).
// Classroom convention, close to ALA-LC: ē/ō for η/ω, y for υ outside diphthongs,
// h for the rough breathing (rh for ῥ), γ before a velar as n, iota subscript as
// a following i. The accented syllable's vowel keeps an acute (grave and
// circumflex are shown as acute too: in modern reading all three are stress).
// Mirrored in src/course/translit.ts; src/__tests__/course-translit.test.ts asserts equality.

const BASE = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
  ϝ: 'w', ϛ: 'st', ϙ: 'q', ϡ: 'ss',
};
const VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
const VELARS = new Set(['γ', 'κ', 'ξ', 'χ']);
/** second members of diphthongs: the first vowel + this = one syllable */
const DIPHTHONG = { ι: new Set(['α', 'ε', 'ο', 'υ']), υ: new Set(['α', 'ε', 'η', 'ο', 'ω']) };

const ROUGH = '̔';
const SMOOTH = '̓';
const ACUTE = '́';
const GRAVE = '̀';
const CIRCUMFLEX = '͂';
const SUBSCRIPT = 'ͅ';
const DIAERESIS = '̈';
const MARKS = /[̀-ͯ]/;

function accentVowel(s) {
  // put an acute on the LAST vowel letter of a transliterated vowel group
  for (let i = s.length - 1; i >= 0; i--) {
    if ('aeiouyēō'.includes(s[i])) return s.slice(0, i) + s[i] + ACUTE + s.slice(i + 1);
  }
  return s;
}

/** Decompose into [base letter, marks] units; non-Greek characters pass through. */
function letters(word) {
  const out = [];
  for (const ch of word.normalize('NFD')) {
    if (MARKS.test(ch) && out.length) out[out.length - 1].marks += ch;
    else out.push({ ch, marks: '' });
  }
  return out;
}

export function transliterate(word) {
  const ls = letters(word);
  let out = '';
  let i = 0;
  while (i < ls.length) {
    const L = ls[i];
    const lower = L.ch.toLowerCase();
    const upper = L.ch !== lower;
    const next = ls[i + 1];
    const nextLower = next ? next.ch.toLowerCase() : '';
    let piece;
    let consumed = 1;
    let marks = L.marks;
    if (VOWELS.has(lower)) {
      let v = BASE[lower];
      const nextIsDiph = next && DIPHTHONG[nextLower] && DIPHTHONG[nextLower].has(lower) && !next.marks.includes(DIAERESIS);
      if (nextIsDiph) {
        // diphthong: the breathing/accent is written on the second vowel in Greek;
        // υ as the first member (υι) is u, not y
        v = `${lower === 'υ' ? 'u' : v}${nextLower === 'υ' ? 'u' : 'i'}`;
        marks = L.marks + next.marks;
        consumed = 2;
      }
      if (marks.includes(SUBSCRIPT)) v += 'i';
      if (marks.includes(ACUTE) || marks.includes(GRAVE) || marks.includes(CIRCUMFLEX)) v = accentVowel(v);
      piece = marks.includes(ROUGH) ? `h${v}` : v;
    } else if (lower === 'ρ') {
      piece = marks.includes(ROUGH) ? 'rh' : 'r';
      // ῤῥ in the middle of a word: rrh
      if (next && nextLower === 'ρ' && next.marks.includes(ROUGH)) {
        piece = 'rrh';
        consumed = 2;
      }
    } else if (lower === 'γ' && next && VELARS.has(nextLower)) {
      piece = 'n';
    } else if (BASE[lower] !== undefined) {
      piece = BASE[lower];
    } else if (lower === '\u1fbd' || lower === '\u2019' || lower === "'" || lower === '\u02bc') {
      piece = '\u2019'; // elision / coronis
    } else {
      piece = L.ch + (marks.includes(SMOOTH) || marks.includes(ROUGH) ? '' : marks); // punctuation, Latin letters
    }
    if (upper) piece = piece[0].toUpperCase() + piece.slice(1);
    out += piece;
    i += consumed;
  }
  return out.normalize('NFC');
}
