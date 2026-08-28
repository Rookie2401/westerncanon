/**
 * Read the source XML and yield a flat, typed list of lemmas.
 *
 * Source shape (verified):
 *   <summa>
 *     <liber title="..." index="1..4|''">
 *       <quaestio title="<dutch>" index="N">
 *         <articulus index="N|''">
 *           <lemma>
 *             <liber/> <quaestio/> <articulus/>   (integers; may be empty)
 *             <reference>Ia q. 1 a. 1 arg. 1</reference>
 *             <type>pr|arg|sc|co|ad</type>
 *             <index>1</index>
 *             <latin>...</latin>
 *             <nl>... DISCARDED ...</nl>
 *           </lemma>
 */

import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { cleanText } from './normalize.ts';

export type LemmaType = 'pr' | 'arg' | 'sc' | 'co' | 'ad';

export interface RawLemma {
  /** integer <liber> inside the lemma, or null when empty (work-level prooemium) */
  liber: number | null;
  /** integer <quaestio> inside the lemma, or null when empty */
  quaestio: number | null;
  /** integer <articulus> inside the lemma, or null when empty (prooemium / unnumbered article) */
  articulus: number | null;
  reference: string;
  type: LemmaType;
  index: number;
  /** cleaned Latin text (entities decoded by the parser, whitespace collapsed) */
  latin: string;
  /** the enclosing <liber index> (1..4) or null for the Proœmium liber */
  liberIndex: number | null;
  /** the enclosing <liber title> attribute */
  liberTitle: string;
}

export interface ParsedSource {
  lemmas: RawLemma[];
  /** raw type counts, for validation cross-checks */
  typeCounts: Record<string, number>;
  totalLemmas: number;
}

function toInt(v: unknown): number | null {
  const s = textOf(v).trim();
  if (s === '') return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function textOf(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && v !== null && '#text' in v) {
    return String((v as { '#text': unknown })['#text']);
  }
  return '';
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const VALID_TYPES = new Set<LemmaType>(['pr', 'arg', 'sc', 'co', 'ad']);

export function parseSource(xmlPath: string): ParsedSource {
  const xml = readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
    // Force arrays ONLY for the structural containers, keyed by full path so the
    // same-named integer children inside <lemma> (<liber>/<quaestio>/<articulus>)
    // stay scalars.
    isArray: (_name, jpath) =>
      jpath === 'summa.liber' ||
      jpath === 'summa.liber.quaestio' ||
      jpath === 'summa.liber.quaestio.articulus' ||
      jpath === 'summa.liber.quaestio.articulus.lemma',
  });

  const doc = parser.parse(xml) as {
    summa: { liber: Array<Record<string, unknown>> };
  };

  const lemmas: RawLemma[] = [];
  const typeCounts: Record<string, number> = {};

  for (const liber of asArray(doc.summa.liber)) {
    const liberIndex = toInt(liber['@_index']);
    const liberTitle = textOf(liber['@_title']).trim();
    for (const quaestio of asArray(liber['quaestio'] as unknown[])) {
      const q = quaestio as Record<string, unknown>;
      for (const articulus of asArray(q['articulus'] as unknown[])) {
        const a = articulus as Record<string, unknown>;
        for (const lemma of asArray(a['lemma'] as unknown[])) {
          const l = lemma as Record<string, unknown>;
          const type = textOf(l['type']).trim() as LemmaType;
          if (!VALID_TYPES.has(type)) {
            throw new Error(`Unexpected lemma <type>: ${JSON.stringify(textOf(l['type']))} at ${textOf(l['reference'])}`);
          }
          const latin = cleanText(textOf(l['latin']));
          const index = toInt(l['index']) ?? 0;
          lemmas.push({
            liber: toInt(l['liber']),
            quaestio: toInt(l['quaestio']),
            articulus: toInt(l['articulus']),
            reference: textOf(l['reference']).trim(),
            type,
            index,
            latin,
            liberIndex,
            liberTitle,
          });
          typeCounts[type] = (typeCounts[type] ?? 0) + 1;
        }
      }
    }
  }

  return { lemmas, typeCounts, totalLemmas: lemmas.length };
}
