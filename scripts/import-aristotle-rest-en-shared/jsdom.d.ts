/**
 * Additive local ambient declaration for the `jsdom` package, augmenting the
 * `JSDOMElement`/`JSDOMDocument` interfaces already declared by
 * scripts/import-aristotle-shared/jsdom.d.ts (and further augmented by
 * scripts/import-aristotle-metaphysics-en/jsdom.d.ts, which adds `nodeType`,
 * `childNodes` and `removeChild`) with the two members ./pagescan.ts needs in
 * order to rebuild a SYNTHETIC paragraph out of loose sibling nodes.
 *
 * Why that is needed at all: English Wikisource's page-scan rendering does
 * NOT wrap every run of reading text in a `<p>`. Where a printed paragraph
 * straddles a scanned page boundary, the transclusion closes the `</p>` at
 * the break and then emits the continuation as bare text and inline elements
 * sitting directly under `div.prp-pages-output`, until the next `<p>` opens.
 * Those runs are real translation text, so the parser gathers them and builds
 * a paragraph element of its own to hand to the same cleaning code every
 * other paragraph goes through — which takes `createElement` and
 * `appendChild`.
 *
 * This is pure TypeScript declaration merging: this file adds NEW members
 * only and never redeclares an existing one, which is the safe and standard
 * form of ambient module augmentation.
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    appendChild(child: JSDOMElement): JSDOMElement;
  }

  export interface JSDOMDocument {
    createElement(tagName: string): JSDOMElement;
  }
}
