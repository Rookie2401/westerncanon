/**
 * Local ambient declaration for the `jsdom` package, scoped to what
 * pagescanPlay.ts needs to walk the two page-scan-transcluded plays' rendered
 * HTML (Peace, Lysistrata). Mirrors the same per-importer local-shim pattern
 * used throughout this repo (e.g. scripts/import-aristotle-shared/jsdom.d.ts) -
 * jsdom ships no types of its own and this project's tsconfig.scripts.json
 * has no "dom" lib, so nothing here can be inherited from a shared shim
 * outside this file plus whatever else the whole scripts/ program merges in.
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
    remove(): void;
  }

  export interface JSDOMDocument {
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
