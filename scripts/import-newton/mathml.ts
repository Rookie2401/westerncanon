/**
 * MathML -> plain text converter for the Newton importer.
 *
 * This library's Passage.text is plain text with no rich-notation field, and
 * the source page-scans render every in-line formula as real MathML
 * (`<math>...<mfrac>/<msup>/<msub>/<msqrt>...</math>`), not as an image or a
 * plain-text approximation. Per the import brief, mathematical notation is
 * kept "as the transcription prints it (superscripts/fractions as text)":
 * this module converts each MathML subtree to a readable plain-text run
 * using a small, fixed set of ASCII conventions, disclosed in about.json:
 *   - <msup>base exp</msup>  -> "base^exp"
 *   - <msub>base sub</msub>  -> "base_sub"
 *   - <mfrac>num den</mfrac> -> "(num/den)"
 *   - <msqrt>x</msqrt>       -> "sqrt(x)"
 *   - <mroot>x n</mroot>     -> "root(x,n)"
 *   - <mrow>/<mstyle>/<mtable>/<mtr>/<mtd>  -> children concatenated
 *   - <mi>/<mn>/<mo>/<mtext> -> their own text, verbatim
 * Nothing is evaluated, simplified, or corrected; this is a typographic
 * flattening of exactly what the page prints, never a re-derivation.
 */
import type { JSDOMElement } from 'jsdom';

function textOf(el: JSDOMElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Converts one <math>...</math> element to a flat text run. */
export function mathToText(math: JSDOMElement): string {
  const walk = (node: JSDOMElement): string => {
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    const children = () => [...node.children].map((c) => walk(c as JSDOMElement));
    switch (tag) {
      case 'math':
      case 'mrow':
      case 'mstyle':
      case 'mtable':
      case 'mtr':
      case 'mpadded':
      case 'mphantom':
        return children().join('');
      case 'mtd':
        return children().join('');
      case 'msup': {
        const [base, exp] = children();
        return `${base ?? ''}^${exp ?? ''}`;
      }
      case 'msub': {
        const [base, sub] = children();
        return `${base ?? ''}_${sub ?? ''}`;
      }
      case 'msubsup': {
        const [base, sub, sup] = children();
        return `${base ?? ''}_${sub ?? ''}^${sup ?? ''}`;
      }
      case 'mfrac': {
        const [num, den] = children();
        return `(${num ?? ''}/${den ?? ''})`;
      }
      case 'msqrt':
        return `sqrt(${children().join('')})`;
      case 'mroot': {
        const [x, n] = children();
        return `root(${x ?? ''},${n ?? ''})`;
      }
      case 'mi':
      case 'mn':
      case 'mo':
      case 'mtext':
      case 'ms':
        return textOf(node);
      default:
        return children().length > 0 ? children().join('') : textOf(node);
    }
  };
  return walk(math);
}
