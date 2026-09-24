/**
 * Additive local ambient declaration for the `jsdom` package (see
 * scripts/import-aristotle-shared/jsdom.d.ts for the base shape this merges
 * with, and scripts/import-aristotle-rest-en-shared/jsdom.d.ts for the same
 * declaration-merging pattern), adding the members domText.ts needs to
 * splice `<math>`/`<sup>`/`<sub>` subtrees out of a cloned element and
 * replace them with a single flattened text node: `replaceWith`,
 * `ownerDocument`, and `Document.createTextNode`.
 */
declare module 'jsdom' {
  export interface JSDOMTextNode {
    nodeType: number;
  }

  export interface JSDOMElement {
    ownerDocument: JSDOMDocument | null;
    replaceWith(...nodes: Array<JSDOMElement | JSDOMTextNode | string>): void;
  }

  export interface JSDOMDocument {
    createTextNode(text: string): JSDOMTextNode;
  }
}
