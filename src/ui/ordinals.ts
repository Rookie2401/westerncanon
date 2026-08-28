import { roman } from './format.ts';

/** Latin ordinal (accusative, as used in "ad primum ... dicendum"). */
const ORDINALS = [
  'primum',
  'secundum',
  'tertium',
  'quartum',
  'quintum',
  'sextum',
  'septimum',
  'octavum',
  'nonum',
  'decimum',
  'undecimum',
  'duodecimum',
  'tertium decimum',
  'quartum decimum',
  'quintum decimum',
  'sextum decimum',
  'septimum decimum',
  'duodevicesimum',
  'undevicesimum',
  'vicesimum',
];

/** Reply heading: "Ad primum", "Ad secundum", … or "Ad obiectiones" for a combined reply. */
export function replyLabel(objectionNumber: number | null): string {
  if (objectionNumber == null) return 'Ad obiectiones';
  const word = ORDINALS[objectionNumber - 1];
  return word ? `Ad ${word}` : `Ad ${roman(objectionNumber)}`;
}
