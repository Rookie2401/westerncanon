/**
 * Tiny attribute helpers shared by the six Cicero importers
 * (import-in-catilinam-la/en, import-philippics-la/en, import-in-verrem-la/en).
 *
 * The Perseus/OpenGreekAndLatin canonical-latinLit TEI for these three works
 * does NOT print a stable attribute order on its `<div>`/`<milestone>` tags -
 * e.g. some print `<div type="textpart" subtype="speech" n="1">`, others
 * `<div type="textpart" n="1" subtype="speech">` - so every attribute lookup
 * here is a standalone regex over the raw opening-tag string, independent of
 * where in the tag it appears (mirrors scripts/import-virgil-aeneid-la's
 * hasAttrValue/attrValue helpers).
 */

/** True if `tag` (a raw `<div ...>`/`<milestone .../>` opening-tag string) carries `name="value"`. */
export function hasAttrValue(tag: string, name: string, value: string): boolean {
  return new RegExp(`\\s${name}="${value}"`).test(tag);
}

/** The value of `name="..."` on `tag`, or null if absent. */
export function attrValue(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1]! : null;
}

/** True if `tag` is a `<div type="textpart" subtype="X">` opening tag (any attribute order). */
export function isTextpartDiv(tag: string, subtype: string): boolean {
  return hasAttrValue(tag, 'type', 'textpart') && hasAttrValue(tag, 'subtype', subtype);
}

/** True if `tag` is a `<milestone .../>` with unit="X" (any attribute order). */
export function isMilestoneUnit(tag: string, unit: string): boolean {
  return hasAttrValue(tag, 'unit', unit);
}
