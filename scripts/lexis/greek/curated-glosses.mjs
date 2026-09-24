// Curated short glosses for the highest-frequency Greek function words, per coordinator
// direction (fix batch 1, item a). These words are so common that LSJ's "first <tr>" heuristic
// regularly surfaces something unusable for them specifically (etymological Latin/Sanskrit
// cross-references, cross-reference labels like "the following", citation fragments) even after
// the isCitationLike/LATIN_ECHO filters in lsj.mjs — a small hand-curated textbook gloss is more
// reliable than any general heuristic for this closed, short list. Keyed by lemma only (applies
// to every pos variant of that lemma referenced by the corpus); `src: 'curated'` in the built
// lexicon marks it honestly as a hand-authored override, not a dictionary extraction.
export const CURATED_GLOSSES = new Map(
  Object.entries({
    // articles / demonstratives / pronouns
    ὁ: 'the',
    ὅδε: 'this (here)',
    οὗτος: 'this',
    ἐκεῖνος: 'that',
    αὐτός: 'self; he, she, it',
    ὅς: 'who, which',
    ὅστις: 'whoever, whatever',
    τις: 'someone, something; a certain',
    τίς: 'who? what? which?',
    ἐγώ: 'I',
    σύ: 'you (sg.)',
    ἡμεῖς: 'we',
    ὑμεῖς: 'you (pl.)',
    ἕ: 'him, her, it (reflexive)',
    ἀλλήλων: 'one another',
    ἑαυτοῦ: 'himself, herself, itself',
    πᾶς: 'all, every, whole',
    ἄλλος: 'other, another',
    // conjunctions / particles
    καί: 'and, also, even',
    δέ: 'but, and',
    μέν: 'on the one hand (answered by δέ)',
    γάρ: 'for',
    τε: 'and (enclitic)',
    ἀλλά: 'but',
    ἤ: 'or, than',
    οὐδέ: 'and not, nor, not even',
    μηδέ: 'and not, nor (with μή-negation)',
    οὔτε: 'neither, nor',
    μήτε: 'neither, nor (with μή-negation)',
    ὡς: 'as, that, how, since',
    ὥστε: 'so that, with the result that',
    ὅτι: 'that, because',
    εἰ: 'if',
    ἐάν: 'if (+ subjunctive)',
    ἵνα: 'in order that, so that',
    ὅπως: 'so that, how',
    ἐπεί: 'when, since',
    ὅτε: 'when',
    ἕως: 'until, while',
    πρίν: 'before',
    ἄν: '(particle marking contingency; no single English equivalent)',
    οὖν: 'therefore, then, so',
    δή: 'indeed, in fact',
    γε: 'at least, indeed (enclitic, limiting)',
    δαί: 'then, pray (colloquial)',
    // negatives
    οὐ: 'not',
    μή: 'not',
    οὐδείς: 'no one, nothing',
    μηδείς: 'no one, nothing (with μή-negation)',
    οὐδέν: 'nothing',
    // prepositions
    εἰς: 'into, to',
    ἐν: 'in, on, among',
    ἐπί: 'on, upon, at, for',
    πρός: 'to, towards, against',
    ὑπό: 'under, by (agent)',
    διά: 'through, on account of',
    κατά: 'down, according to, against',
    περί: 'around, concerning, about',
    μετά: 'with, after',
    ἀπό: 'from, away from',
    ἐκ: 'out of, from',
    ἐξ: 'out of, from',
    παρά: 'beside, from, contrary to',
    σύν: 'with, together with',
    ἄνευ: 'without',
    ἀντί: 'instead of, against',
    // very high-frequency verbs (per coordinator: prefer kaikki, but curate the top two)
    εἰμί: 'to be',
    φημί: 'to say, assert',
  }),
);

/** Lexeme classes for which kaikki's gloss is preferred over LSJ's outright (per coordinator:
 * "for high-frequency function words prefer kaikki over LSJ" — kaikki's short glosses are
 * consistently cleaner for closed-class words, where LSJ's first sense is often an etymological
 * or cross-reference aside rather than the plain meaning). Curated lemmas above still win first. */
export const PREFER_KAIKKI_POS = new Set(['art', 'part', 'prep', 'conj', 'pron']);

/** A handful of extremely common verbs where LSJ's giant, citation-heavy entries make the "first
 * <tr>" heuristic unreliable even after filtering; kaikki's dictionary-style short gloss wins. */
export const HIGH_FREQ_VERBS = new Set(['εἰμί', 'φημί', 'λέγω', 'γίγνομαι', 'ἔχω']);
