/**
 * Lexis — shared types for the original-language edition's language help.
 * Authoritative contract: docs/LEXIS-PLAN.md. Build scripts (scripts/lexis/*)
 * emit exactly these shapes; the runtime (src/lexis/index.ts) reads them.
 */

export type LexLang = 'grc' | 'la' | 'it';

export type Pos =
  | 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'prep' | 'conj' | 'part' | 'num'
  | 'interj' | 'art' | 'name' | 'other';

/** [lexeme id, morph tags (space-separated; see plan §3), confidence 0..1] */
export type Reading = [string, string, number?];

export interface CoreLexeme {
  /** `<lang>:<pos>:<lemma>`, homographs `#2`… */
  id: string;
  lemma: string;
  pos: Pos;
  /** short English gloss (one line) */
  gloss: string;
  /** where the gloss comes from, e.g. "lsj" | "middle-liddell" | "lewis-short" | "whitaker" | "wiktionary" */
  src?: string;
}

export interface LexEntry extends CoreLexeme {
  /** all short senses, in dictionary order */
  senses?: string[];
  /** the full dictionary article as SANITISED trusted HTML (b/i/em/span/div/p/br/sup only) */
  html?: string;
  /** principal parts / genitive+gender / inflection note as the dictionary prints it */
  inflection?: string;
  /** dictionary of the article: "lsj" | "middle-liddell" | "lewis-short" | "wiktionary" */
  dict?: string;
  /** corpus frequency rank within the language, if computed */
  rank?: number;
}

export type LexShard = Record<string, LexEntry>;

export interface WorkLexis {
  workId: string;
  lang: LexLang;
  /** running word tokens in the work (tokenizer word tokens) */
  tokens: number;
  /** running word tokens whose loose key has at least one reading */
  recognized: number;
  /** loose form key -> readings, best first */
  forms: Record<string, Reading[]>;
  /** every lexeme referenced by `forms` */
  lexemes: Record<string, CoreLexeme>;
  /** how the readings were produced, e.g. "celano-lemmatised + morpheus", "whitakers-words 0.1.1", "kaikki it 2026-09" */
  analysis: string;
}

export interface LexisSource {
  name: string;
  license: string;
  url: string;
}

export interface LexisManifest {
  version: number;
  built_at: string;
  languages: Partial<Record<LexLang, {
    lexemes: number;
    works: number;
    /** running-token recognition rate across the language's works (0..1) */
    coverage: number;
    sources: LexisSource[];
    /** lemma-key prefix -> shard file name (under lex/<lang>/) */
    lex_shards: Record<string, string>;
  }>>;
  /** workId -> bundle file name (under works/) with its size counts */
  works: Record<string, { file: string; lang: LexLang; tokens: number; recognized: number; forms: number }>;
}

export type WordStatus = 'new' | 'seen' | 'recognizing' | 'known' | 'mastered' | 'ignored';

export interface KnownWord {
  id?: number;
  /** lexeme id */
  key: string;
  lang: LexLang;
  status: WordStatus;
  /** 'lookup' | 'encounter' | 'manual' | 'bulk' | 'import' */
  reason: string;
  lookups: number;
  encounters: number;
  first_seen: number;
  last_seen: number;
  updated_at: number;
}

export interface LexisSettings {
  /** master switch; true by default in the original-language edition */
  enabled: boolean;
  highlight: 'none' | 'new' | 'all';
  /** unaided encounters before a word is promoted to known (0 = never) */
  autoKnownAfter: number;
  /** show the morphology phrase on the card's first level */
  morphOnFirstLevel: boolean;
}

export const DEFAULT_LEXIS_SETTINGS: LexisSettings = {
  enabled: true,
  highlight: 'new',
  autoKnownAfter: 6,
  morphOnFirstLevel: true,
};

export const WORD_STATUSES: WordStatus[] = ['new', 'seen', 'recognizing', 'known', 'mastered', 'ignored'];
