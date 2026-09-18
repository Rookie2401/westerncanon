/**
 * Minimal local ambient declaration for the `jsdom` package (mirrors
 * scripts/import-isagoge-en/jsdom.d.ts and scripts/import-aristotle-shared/jsdom.d.ts
 * — copied rather than shared since each importer's tsconfig program only
 * needs its own surface; see those files for the general rationale).
 *
 * jsdom ships no TypeScript types of its own and @types/jsdom is not a
 * dependency of this repo; this project's tsconfig.scripts.json also has no
 * "dom" lib, so the global DOM types (Element, Document, ...) are not
 * available either. This importer additionally needs `id` (to find
 * `<h2 id="articleN">`) and `getAttribute`, beyond what the sibling shims
 * declare.
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    tagName: string;
    id: string;
    className: string;
    textContent: string | null;
    children: JSDOMElement[];
    getAttribute(name: string): string | null;
    querySelector(selector: string): JSDOMElement | null;
    querySelectorAll(selector: string): JSDOMElement[];
    cloneNode(deep?: boolean): JSDOMElement;
    remove(): void;
  }

  export interface JSDOMDocument {
    getElementById(id: string): JSDOMElement | null;
    querySelector(selector: string): JSDOMElement | null;
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
