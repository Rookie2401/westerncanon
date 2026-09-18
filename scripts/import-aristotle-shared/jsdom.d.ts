/**
 * Minimal local ambient declaration for the `jsdom` package, scoped to the
 * surface scripts/import-aristotle-shared/englishWikisource.ts actually uses.
 *
 * jsdom ships no TypeScript types of its own and @types/jsdom is not a
 * dependency of this repo; this project's tsconfig.scripts.json also has no
 * "dom" lib, so the global DOM types (Element, Document, ...) are not
 * available either. Mirrors scripts/import-isagoge-en/jsdom.d.ts's own local
 * shim (same rationale), extended with the handful of extra members this
 * importer's HTML-marker walking needs: `closest`, `getAttribute` and
 * `classList.contains`.
 *
 * querySelectorAll here is typed to return a plain array (not a NodeList),
 * since every call site only ever needs `.length`, indexing, `.forEach`,
 * `.map`/`.filter` and spreading - real jsdom returns a NodeList at runtime,
 * which supports all of those too (NodeList is iterable and array-like).
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    tagName: string;
    id: string;
    className: string;
    textContent: string | null;
    children: JSDOMElement[];
    classList: { contains(name: string): boolean };
    getAttribute(name: string): string | null;
    closest(selector: string): JSDOMElement | null;
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
