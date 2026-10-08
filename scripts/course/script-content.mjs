// Stage 0 script sections (docs/COURSE-PLAN.md §1): the signs of each language
// and how they are read. Authored content, kept as data so build-stage0.mjs can
// ship it unchanged. The pronunciation notes follow the restored classical
// conventions described in W. Sidney Allen, Vox Graeca (3rd ed., 1987) and
// Vox Latina (2nd ed., 1978), with the common classroom alternative named
// where it differs; nothing here claims to be the only way the texts were read.

export const GREEK = {
  pronunciation: {
    note:
      'The sounds below follow the restored classical pronunciation of Attic Greek of about 400 BC, as reconstructed in W. Sidney Allen’s Vox Graeca. Where classrooms commonly read a letter differently (the “Erasmian” habit), that reading is given second. Homer, the tragedians, Herodotus and Plutarch spoke differently from one another; one convention is adopted here so that the drills have one answer.',
    sources: ['W. Sidney Allen, Vox Graeca: The Pronunciation of Classical Greek, 3rd ed., Cambridge 1987'],
  },
  sections: [
    {
      id: 'alphabet',
      title: 'The alphabet',
      intro: [
        'Twenty-four letters. Each has a capital and a small form; sigma has two small forms, σ inside a word and ς at its end.',
        'Every letter is always pronounced; there are no silent letters.',
      ],
      rows: [
        { sign: 'Α α', name: 'alpha', translit: 'a', sound: 'a as in father (short) or far (long)' },
        { sign: 'Β β', name: 'beta', translit: 'b', sound: 'b as in bed' },
        { sign: 'Γ γ', name: 'gamma', translit: 'g', sound: 'g as in go; before γ κ ξ χ it is ng as in sing (ἄγγελος angelos)' },
        { sign: 'Δ δ', name: 'delta', translit: 'd', sound: 'd as in dog' },
        { sign: 'Ε ε', name: 'epsilon', translit: 'e', sound: 'short e as in pet' },
        { sign: 'Ζ ζ', name: 'zeta', translit: 'z', sound: 'zd as in wisdom (classical); often read z as in zoo' },
        { sign: 'Η η', name: 'eta', translit: 'ē', sound: 'long open e, as in French tête or English air (without the r); often read ay as in day' },
        { sign: 'Θ θ', name: 'theta', translit: 'th', sound: 'an aspirated t, as in pot-hole (classical); often read th as in thin' },
        { sign: 'Ι ι', name: 'iota', translit: 'i', sound: 'i as in bit (short) or machine (long)' },
        { sign: 'Κ κ', name: 'kappa', translit: 'k', sound: 'k as in skin (no puff of air)' },
        { sign: 'Λ λ', name: 'lambda', translit: 'l', sound: 'l as in lamp' },
        { sign: 'Μ μ', name: 'mu', translit: 'm', sound: 'm as in man' },
        { sign: 'Ν ν', name: 'nu', translit: 'n', sound: 'n as in net' },
        { sign: 'Ξ ξ', name: 'xi', translit: 'x', sound: 'ks as in box' },
        { sign: 'Ο ο', name: 'omicron', translit: 'o', sound: 'short o as in British pot' },
        { sign: 'Π π', name: 'pi', translit: 'p', sound: 'p as in spin (no puff of air)' },
        { sign: 'Ρ ρ', name: 'rho', translit: 'r', sound: 'a trilled r, as in Scots or Italian; with the rough breathing (ῥ) it is breathed: rh' },
        { sign: 'Σ σ ς', name: 'sigma', translit: 's', sound: 's as in hiss, never z' },
        { sign: 'Τ τ', name: 'tau', translit: 't', sound: 't as in stop (no puff of air)' },
        { sign: 'Υ υ', name: 'upsilon', translit: 'y (u in diphthongs)', sound: 'French u or German ü, short or long; often read oo as in food' },
        { sign: 'Φ φ', name: 'phi', translit: 'ph', sound: 'an aspirated p, as in uphill (classical); often read f' },
        { sign: 'Χ χ', name: 'chi', translit: 'ch', sound: 'an aspirated k, as in backhand (classical); often read as Scots loch or German Bach' },
        { sign: 'Ψ ψ', name: 'psi', translit: 'ps', sound: 'ps as in lapse' },
        { sign: 'Ω ω', name: 'omega', translit: 'ō', sound: 'long open o, as in British saw; often read oh as in go' },
      ],
    },
    {
      id: 'diphthongs',
      title: 'Two vowels, one sound',
      intro: ['When these pairs stand together they are read as one syllable. A diaeresis (¨) on the second vowel means they are separate: ἀϊδιος a-i-dios.'],
      rows: [
        { sign: 'αι', name: '', translit: 'ai', sound: 'as in aisle' },
        { sign: 'ει', name: '', translit: 'ei', sound: 'as in vein (classical: a long close e)' },
        { sign: 'οι', name: '', translit: 'oi', sound: 'as in boil' },
        { sign: 'υι', name: '', translit: 'ui', sound: 'French u gliding to i, roughly as in we' },
        { sign: 'αυ', name: '', translit: 'au', sound: 'as in house' },
        { sign: 'ευ', name: '', translit: 'eu', sound: 'e gliding to u: eh-oo in one syllable' },
        { sign: 'ηυ', name: '', translit: 'ēu', sound: 'as ευ with a longer first vowel' },
        { sign: 'ου', name: '', translit: 'ou', sound: 'as in food' },
      ],
    },
    {
      id: 'breathings',
      title: 'Breathings',
      intro: [
        'Every word that begins with a vowel (or with ρ) carries a breathing mark over its first vowel; in a diphthong the mark sits on the second vowel.',
        'The rough breathing is an h before the vowel; the smooth breathing is nothing at all. The two are written for every such word, so the mark must be looked for.',
      ],
      rows: [
        { sign: 'ἁ ἑ ἡ ἱ ὁ ὑ ὡ', name: 'rough breathing (δασεῖα)', translit: 'h-', sound: 'ὁ ho, ἡμεῖς hēmeis; the h is sounded' },
        { sign: 'ἀ ἐ ἠ ἰ ὀ ὐ ὠ', name: 'smooth breathing (ψιλή)', translit: '–', sound: 'ἐγώ egō; no h' },
        { sign: 'ῥ', name: 'rho with rough breathing', translit: 'rh', sound: 'at the start of a word ρ always takes the rough breathing: ῥήτωρ rhētōr' },
      ],
    },
    {
      id: 'accents',
      title: 'Accents and other marks',
      intro: [
        'Almost every word carries one accent on one of its last three syllables. In classical times the accent was a rise of pitch; readers today pronounce the accented syllable with stress, and that is what the drills expect.',
        'The three marks differ in origin, not in how you read them now.',
      ],
      rows: [
        { sign: 'ά έ ή ί ό ύ ώ', name: 'acute (ὀξεῖα)', translit: '´', sound: 'a rise of pitch; read as stress: λόγος LÓ-gos' },
        { sign: 'ὰ ὲ ὴ ὶ ὸ ὺ ὼ', name: 'grave (βαρεῖα)', translit: '`', sound: 'an acute lowered on the last syllable of a word before another word; read as a light stress or none' },
        { sign: 'ᾶ ῆ ῖ ῦ ῶ', name: 'circumflex (περισπωμένη)', translit: '^', sound: 'a rise and fall on a long vowel or diphthong; read as stress: δῶρον DÔ-ron' },
        { sign: 'ᾳ ῃ ῳ', name: 'iota subscript (ὑπογεγραμμένη)', translit: 'āi ēi ōi', sound: 'a small iota written under α η ω: once a diphthong with a long vowel, later silent; with capitals it is written beside the letter (ᾼ = ᾳ)' },
        { sign: 'ϊ ϋ', name: 'diaeresis (διαίρεσις)', translit: '¨', sound: 'the vowel is pronounced on its own, not as part of a diphthong' },
        { sign: '᾽ ’', name: 'apostrophe and coronis', translit: '’', sound: 'elision: a final vowel dropped before another word (ἀλλ᾽ ἐγώ for ἀλλὰ ἐγώ); crasis: two words run together (κἀγώ for καὶ ἐγώ)' },
      ],
    },
    {
      id: 'punctuation',
      title: 'Punctuation',
      intro: ['Modern editions use these marks; the ancient manuscripts had almost none.'],
      rows: [
        { sign: '.', name: 'full stop', translit: '.', sound: 'as in English' },
        { sign: ',', name: 'comma', translit: ',', sound: 'as in English' },
        { sign: '·', name: 'raised point (ἄνω τελεία)', translit: ';  :', sound: 'a semicolon or colon' },
        { sign: ';', name: 'Greek question mark', translit: '?', sound: 'a question: τί λέγεις; What are you saying?' },
      ],
    },
  ],
};

export const LATIN = {
  pronunciation: {
    note:
      'The sounds below follow the restored classical pronunciation of the late Republic and early Empire as reconstructed in W. Sidney Allen’s Vox Latina. The texts in this library print no macrons, so a vowel’s length (and with it the stress of a word) must be learned from the dictionary; the word cards show the dictionary headword where it marks length. The Church’s Italianate pronunciation, used for Boethius, Augustine and Aquinas in many classrooms, is given second where it differs.',
    sources: ['W. Sidney Allen, Vox Latina: A Guide to the Pronunciation of Classical Latin, 2nd ed., Cambridge 1978'],
  },
  sections: [
    {
      id: 'alphabet',
      title: 'The letters',
      intro: [
        'The classical alphabet has twenty-three letters: A B C D E F G H I K L M N O P Q R S T V X Y Z. J, U and W are later additions; many editions, including several in this library, print u for the vowel and v for the consonant, and i for both the vowel and the consonant.',
        'Every letter is pronounced; there are no silent letters except that h is light.',
      ],
      rows: [
        { sign: 'A a', name: '', translit: 'a', sound: 'short: as in cup; long: as in father' },
        { sign: 'B b', name: '', translit: 'b', sound: 'b as in bed; before s or t it is p (urbs “urps”)' },
        { sign: 'C c', name: '', translit: 'c', sound: 'always k as in cat, even before e and i (Cicero “Kikero”); Church: ch before e, i, ae, oe' },
        { sign: 'D d', name: '', translit: 'd', sound: 'd as in dog' },
        { sign: 'E e', name: '', translit: 'e', sound: 'short: as in pet; long: as in French été' },
        { sign: 'F f', name: '', translit: 'f', sound: 'f as in fat' },
        { sign: 'G g', name: '', translit: 'g', sound: 'always g as in go; gn is ngn (magnus “mang-nus”); Church: j before e and i, gn as ny' },
        { sign: 'H h', name: '', translit: 'h', sound: 'a light h as in hat; Church: silent' },
        { sign: 'I i', name: '', translit: 'i', sound: 'vowel: as in bit (short) or machine (long); consonant before a vowel: y as in yes (iam, maior)' },
        { sign: 'K k', name: '', translit: 'k', sound: 'k; rare (Kalendae)' },
        { sign: 'L l', name: '', translit: 'l', sound: 'l as in lamp' },
        { sign: 'M m', name: '', translit: 'm', sound: 'm as in man; at the end of a word it nasalised the vowel and was barely sounded' },
        { sign: 'N n', name: '', translit: 'n', sound: 'n as in net; before c, g, q it is ng as in sing' },
        { sign: 'O o', name: '', translit: 'o', sound: 'short: as in British pot; long: as in French eau' },
        { sign: 'P p', name: '', translit: 'p', sound: 'p as in spin' },
        { sign: 'Q q', name: '', translit: 'qu', sound: 'always with u: kw as in queen' },
        { sign: 'R r', name: '', translit: 'r', sound: 'a trilled r, as in Italian' },
        { sign: 'S s', name: '', translit: 's', sound: 's as in hiss, never z' },
        { sign: 'T t', name: '', translit: 't', sound: 't as in stop, never sh (natio “na-ti-o”); Church: ti before a vowel is tsi' },
        { sign: 'V v / U u', name: '', translit: 'u / v', sound: 'vowel: as in put (short) or food (long); consonant: w as in wine (uenio = “wenio”); Church: v as in vine' },
        { sign: 'X x', name: '', translit: 'x', sound: 'ks as in box' },
        { sign: 'Y y', name: '', translit: 'y', sound: 'in Greek loan-words: French u, German ü' },
        { sign: 'Z z', name: '', translit: 'z', sound: 'in Greek loan-words: dz as in adze' },
      ],
    },
    {
      id: 'diphthongs',
      title: 'Two vowels, one sound',
      rows: [
        { sign: 'ae', name: '', translit: 'ae', sound: 'as in aisle; Church: e as in pet' },
        { sign: 'au', name: '', translit: 'au', sound: 'as in house' },
        { sign: 'oe', name: '', translit: 'oe', sound: 'as in boy; Church: e as in pet' },
        { sign: 'ei', name: '', translit: 'ei', sound: 'as in vein; rare' },
        { sign: 'eu', name: '', translit: 'eu', sound: 'e gliding to u; rare (heu, neuter)' },
        { sign: 'ui', name: '', translit: 'ui', sound: 'u gliding to i; only in cui, huic, cuius' },
      ],
    },
    {
      id: 'greek-letters',
      title: 'Sounds from Greek',
      intro: ['Words borrowed from Greek keep spellings that mark the Greek aspirates.'],
      rows: [
        { sign: 'ch', name: '', translit: 'ch', sound: 'an aspirated k (Church: k)' },
        { sign: 'ph', name: '', translit: 'ph', sound: 'an aspirated p (Church: f)' },
        { sign: 'th', name: '', translit: 'th', sound: 'an aspirated t (Church: t)' },
        { sign: 'rh', name: '', translit: 'rh', sound: 'a breathed r' },
      ],
    },
    {
      id: 'stress',
      title: 'Where the stress falls',
      intro: [
        'A word of two syllables is stressed on the first. A longer word is stressed on the second-last syllable when that syllable is long (a long vowel, a diphthong, or a vowel followed by two consonants); otherwise on the third-last.',
        'Because this library prints no macrons, the length of a vowel is not visible in the text: when in doubt, the dictionary entry on the word card shows the headword with its length marked.',
      ],
      rows: [
        { sign: 'a-mō', name: 'two syllables', translit: 'Á-mo', sound: 'stress on the first syllable' },
        { sign: 'Ro-mā-nus', name: 'long second-last', translit: 'Ro-MĀ-nus', sound: 'the ā is long: stress on it' },
        { sign: 'ma-gis-ter', name: 'closed second-last', translit: 'ma-GIS-ter', sound: 'gis ends in a consonant: stress on it' },
        { sign: 'do-mi-nus', name: 'short second-last', translit: 'DÓ-mi-nus', sound: 'mi is short and open: stress moves back' },
      ],
    },
  ],
};

export const ITALIAN = {
  pronunciation: {
    note:
      'Modern standard Italian pronunciation. Dante’s fourteenth-century Florentine keeps forms and spellings that differ from the modern language (elisions such as ch’i’, older verb endings, Latinisms); they are read with the same sounds.',
    sources: [],
  },
  sections: [
    {
      id: 'alphabet',
      title: 'The letters',
      intro: ['Twenty-one letters; j, k, w, x and y appear only in foreign words. Every vowel is pronounced fully and never reduced.'],
      rows: [
        { sign: 'a', name: '', translit: 'a', sound: 'as in father' },
        { sign: 'e', name: '', translit: 'e', sound: 'close as in they (without the glide) or open as in pet' },
        { sign: 'i', name: '', translit: 'i', sound: 'as in machine' },
        { sign: 'o', name: '', translit: 'o', sound: 'close as in French eau or open as in British pot' },
        { sign: 'u', name: '', translit: 'u', sound: 'as in food' },
        { sign: 'c + a, o, u', name: '', translit: 'k', sound: 'k as in cat (casa)' },
        { sign: 'c + e, i', name: '', translit: 'ch', sound: 'ch as in church (cena, cielo)' },
        { sign: 'ch', name: '', translit: 'k', sound: 'k before e and i (che, chi)' },
        { sign: 'g + a, o, u', name: '', translit: 'g', sound: 'g as in go (gatto)' },
        { sign: 'g + e, i', name: '', translit: 'j', sound: 'j as in jet (gente, giro)' },
        { sign: 'gh', name: '', translit: 'g', sound: 'g before e and i (ghiro)' },
        { sign: 'gli', name: '', translit: 'ly', sound: 'as in million (figlio)' },
        { sign: 'gn', name: '', translit: 'ny', sound: 'as in canyon (ogni, signore)' },
        { sign: 'h', name: '', translit: '–', sound: 'silent (ho, hanno)' },
        { sign: 'r', name: '', translit: 'r', sound: 'trilled' },
        { sign: 's', name: '', translit: 's / z', sound: 's as in hiss, or z between vowels (casa, rosa)' },
        { sign: 'sc + e, i', name: '', translit: 'sh', sound: 'sh as in ship (scena, uscire)' },
        { sign: 'sch', name: '', translit: 'sk', sound: 'sk before e and i (schiera)' },
        { sign: 'z', name: '', translit: 'ts / dz', sound: 'ts as in cats (grazia) or dz as in adze (mezzo)' },
        { sign: 'bb cc dd ll mm nn pp rr ss tt zz', name: 'double consonants', translit: '', sound: 'held longer than a single consonant: fato / fatto' },
      ],
    },
    {
      id: 'stress',
      title: 'Where the stress falls',
      intro: [
        'Most words are stressed on the second-last syllable (amore, donna). A written accent on the last vowel marks a final stress (virtù, perché). Some words are stressed on the third-last (anima, giovane); the dictionary shows which.',
      ],
      rows: [
        { sign: 'a-mo-re', name: '', translit: 'a-MÓ-re', sound: 'second-last syllable' },
        { sign: 'vir-tù', name: '', translit: 'vir-TÙ', sound: 'written accent: last syllable' },
        { sign: 'a-ni-ma', name: '', translit: 'Á-ni-ma', sound: 'third-last syllable' },
      ],
    },
  ],
};

export const SCRIPT_CONTENT = { grc: GREEK, la: LATIN, it: ITALIAN };
