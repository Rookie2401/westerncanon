/**
 * Minimal local ambient declaration for the `jsdom` package, scoped to the
 * surface scripts/import-greek-drama-shared/validate.ts actually uses (the
 * raw-vs-work text accounting check). jsdom ships no TypeScript types of its
 * own and @types/jsdom is not a dependency of this repo; this project's
 * tsconfig.scripts.json also has no "dom" lib, so the global DOM types
 * (Element, Document, ...) are not available either. Mirrors the same
 * per-importer local-shim pattern already used by scripts/import-isagoge-en/
 * jsdom.d.ts and its siblings (each importer keeps its own copy, scoped to
 * only what it needs) - not shared with those files.
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    tagName: string;
    textContent: string | null;
    remove(): void;
    querySelector(selector: string): JSDOMElement | null;
    querySelectorAll(selector: string): JSDOMElement[];
  }

  export interface JSDOMDocument {
    // Document.textContent is always null per the DOM spec (unlike
    // Element.textContent) - documentElement is the actual root <TEI>
    // element and is what callers must read text from.
    documentElement: JSDOMElement;
    querySelector(selector: string): JSDOMElement | null;
    querySelectorAll(selector: string): JSDOMElement[];
  }

  export interface JSDOMWindow {
    document: JSDOMDocument;
  }

  export class JSDOM {
    constructor(xml: string, options?: Record<string, unknown>);
    window: JSDOMWindow;
  }
}
