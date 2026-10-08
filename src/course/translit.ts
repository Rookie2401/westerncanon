/**
 * Romanisation of polytonic Greek for the Stage 0 decoding drills — a mirror
 * of scripts/course/translit.mjs (src/__tests__/course-translit.test.ts
 * asserts the two agree). Classroom convention close to ALA-LC: ē/ō for η/ω,
 * y for υ outside diphthongs, h for the rough breathing (rh for ῥ), γ before
 * a velar as n, iota subscript as a following i; the accented syllable's vowel
 * keeps an acute (grave and circumflex shown as acute: in modern reading all
 * three are stress).
 */
const BASE: Record<string, string> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
  ϝ: 'w', ϛ: 'st', ϙ: 'q', ϡ: 'ss',
};
const VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
const VELARS = new Set(['γ', 'κ', 'ξ', 'χ']);
const DIPHTHONG: Record<string, Set<string>> = { ι: new Set(['α', 'ε', 'ο', 'υ']), υ: new Set(['α', 'ε', 'η', 'ο', 'ω']) };

const ROUGH = '̔';
const SMOOTH = '̓';
const ACUTE = '́';
const GRAVE = '̀';
const CIRCUMFLEX = '͂';
const SUBSCRIPT = 'ͅ';
const DIAERESIS = '̈';
const MARKS = /[̀-ͯ]/;

function accentVowel(s: string): string {
  for (let i = s.length - 1; i >= 0; i--) {
    if ('aeiouyēō'.includes(s[i]!)) return s.slice(0, i) + s[i] + ACUTE + s.slice(i + 1);
  }
  return s;
}

function letters(word: string): { ch: string; marks: string }[] {
  const out: { ch: string; marks: string }[] = [];
  for (const ch of word.normalize('NFD')) {
    if (MARKS.test(ch) && out.length) out[out.length - 1]!.marks += ch;
    else out.push({ ch, marks: '' });
  }
  return out;
}

export function transliterate(word: string): string {
  const ls = letters(word);
  let out = '';
  let i = 0;
  while (i < ls.length) {
    const L = ls[i]!;
    const lower = L.ch.toLowerCase();
    const upper = L.ch !== lower;
    const next = ls[i + 1];
    const nextLower = next ? next.ch.toLowerCase() : '';
    let piece: string;
    let consumed = 1;
    let marks = L.marks;
    if (VOWELS.has(lower)) {
      let v = BASE[lower]!;
      const nextIsDiph = !!next && !!DIPHTHONG[nextLower] && DIPHTHONG[nextLower]!.has(lower) && !next.marks.includes(DIAERESIS);
      if (nextIsDiph) {
        v = `${lower === 'υ' ? 'u' : v}${nextLower === 'υ' ? 'u' : 'i'}`;
        marks = L.marks + next!.marks;
        consumed = 2;
      }
      if (marks.includes(SUBSCRIPT)) v += 'i';
      if (marks.includes(ACUTE) || marks.includes(GRAVE) || marks.includes(CIRCUMFLEX)) v = accentVowel(v);
      piece = marks.includes(ROUGH) ? `h${v}` : v;
    } else if (lower === 'ρ') {
      piece = marks.includes(ROUGH) ? 'rh' : 'r';
      if (next && nextLower === 'ρ' && next.marks.includes(ROUGH)) {
        piece = 'rrh';
        consumed = 2;
      }
    } else if (lower === 'γ' && next && VELARS.has(nextLower)) {
      piece = 'n';
    } else if (BASE[lower] !== undefined) {
      piece = BASE[lower]!;
    } else if (lower === '᾽' || lower === '’' || lower === "'" || lower === 'ʼ') {
      piece = '’';
    } else {
      piece = L.ch + (marks.includes(SMOOTH) || marks.includes(ROUGH) ? '' : marks);
    }
    if (upper) piece = piece[0]!.toUpperCase() + piece.slice(1);
    out += piece;
    i += consumed;
  }
  return out.normalize('NFC');
}
