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
  return aParam === 'u' ? 'Articulus unicus' : `Articulus ${roman(Number(aParam))}`;
}

/** Optional appendix context for a Supplementum question. */
export interface AppendixInfo {
  appendix: 'I' | 'II';
  appendixNumber: number;
}

/**
 * e.g. "PRIMA PARS · QUAESTIO II · ARTICULUS III"
 *      "SUPPLEMENTUM TERTIAE PARTIS · APPENDIX I · QUAESTIO I · ARTICULUS UNICUS"
 */
export function readerCrumb(
  partHeader: string,
  qNum: number,
  aParam: string,
  appx?: AppendixInfo | null,
): string {
  const art = aParam === 'u' ? 'ARTICULUS UNICUS' : `ARTICULUS ${roman(Number(aParam))}`;
  const q = appx
    ? `APPENDIX ${appx.appendix} · QUAESTIO ${roman(appx.appendixNumber)}`
    : `QUAESTIO ${roman(qNum)}`;
  return `${partHeader.toUpperCase()} · ${q} · ${art}`;
}

/** e.g. "Prima Pars · Quaestio II · Articulus III" */
export function continueLabel(partLabel: string, qNum: number, aParam: string): string {
  return `${partLabel} · Quaestio ${roman(qNum)} · ${articulusLabel(aParam)}`;
}

/** Human question label, appendix-aware: "Quaestio VII" / "Appendix I · Quaestio II". */
export function questionHeading(qNum: number, appx?: AppendixInfo | null): string {
  return appx
    ? `Appendix ${appx.appendix} · Quaestio ${roman(appx.appendixNumber)}`
    : `Quaestio ${roman(qNum)}`;
}
