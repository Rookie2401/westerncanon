/** Latin-style formatting helpers for headers and labels. */

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function roman(n: number): string {
  if (!Number.isInteger(n) || n <= 0) return String(n);
  let out = '';
  let rem = n;
  for (const [v, s] of ROMAN) {
    while (rem >= v) {
      out += s;
      rem -= v;
    }
  }
  return out;
}

export function articulusLabel(aParam: string): string {
  return aParam === 'u' ? 'Articulus' : `Articulus ${roman(Number(aParam))}`;
}

/** e.g. "PRIMA PARS · QUAESTIO II · ARTICULUS III" */
export function readerCrumb(partHeader: string, qNum: number, aParam: string): string {
  const art = aParam === 'u' ? 'ARTICULUS' : `ARTICULUS ${roman(Number(aParam))}`;
  return `${partHeader.toUpperCase()} · QUAESTIO ${roman(qNum)} · ${art}`;
}

/** e.g. "Prima Pars · Quaestio II · Articulus III" */
export function continueLabel(partLabel: string, qNum: number, aParam: string): string {
  return `${partLabel} · Quaestio ${roman(qNum)} · ${articulusLabel(aParam)}`;
}
