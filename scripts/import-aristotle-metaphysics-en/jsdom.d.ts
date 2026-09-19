/**
 * Additive local ambient declaration for the `jsdom` package, augmenting the
 * `JSDOMElement` interface already declared by
 * scripts/import-aristotle-shared/jsdom.d.ts with the handful of extra
 * members parseRoss1908.ts needs (`childNodes`, `nodeType`, `removeChild`)
 * to walk and selectively truncate a paragraph's mixed text/element
 * children - not needed by any existing importer's shim, so not added
 * there. This is pure TypeScript declaration merging (this file adds NEW
 * members only; it never redeclares an existing member with a different
 * type), which is safe and standard for ambient module augmentation, unlike
 * redefining a shared method with an incompatible signature would be.
 *
 * `childNodes` is loosely typed as `JSDOMElement[]` even though DOM text
 * nodes don't really have `tagName`/`children`/etc - callers here always
 * check `nodeType === 1` before treating an entry as a real element, so
 * this is a pragmatic simplification scoped to what this one file actually
 * does, not a claim that every childNodes entry is a full element at
 * runtime.
 */
declare module 'jsdom' {
  export interface JSDOMElement {
    nodeType: number;
    childNodes: JSDOMElement[];
    removeChild(child: JSDOMElement): void;
  }
}
