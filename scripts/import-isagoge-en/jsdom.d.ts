/**
 * Minimal local ambient declaration for the `jsdom` package.
 *
 * jsdom ships no TypeScript types of its own and @types/jsdom is not a
 * dependency of this repo; this project's tsconfig.scripts.json also has no
 * "dom" lib, so the global DOM types (Element, Document, ...) are not
 * available either. Rather than add a dependency or a repo-wide lib change
 * outside this importer's scope, this file declares only the small surface
 * of the jsdom API that scripts/import-isagoge-en/index.ts actually uses.
 *
 * querySelectorAll here is typed to return a plain array (not a NodeList),
 * since every call site in this importer only ever needs `.length`,
 * indexing, `.forEach` and `Array.from` - real jsdom returns a NodeList at
 * runtime, which supports all of those too.
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    tagName: string;
    className: string;
    textContent: string | null;
    children: JSDOMElement[];
    querySelector(selector: string): JSDOMElement | null;
    querySelectorAll(selector: string): JSDOMElement[];
    cloneNode(deep?: boolean): JSDOMElement;
    remove(): void;
  }

  export interface JSDOMDocument {
    getElementById(id: string): JSDOMElement | null;
    querySelectorAll(selector: string): JSDOMElement[];
  }

  export interface JSDOMWindow {
    document: JSDOMDocument;
  }

  export class JSDOM {
    constructor(html: string, options?: Record<string, unknown>);
    window: JSDOMWindow;
  }
}
