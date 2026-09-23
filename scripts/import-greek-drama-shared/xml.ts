/**
 * Minimal generic XML-fragment-to-tree parser, used instead of the flat
 * single-regex token approach in scripts/import-archimedes-shared/teiWalker.ts
 * because the drama TEI's apparatus (nested <note>, <choice><sic>/<corr>,
 * <corr><add>/<sic>, <del>, <add>, <unclear>, <gap>, <stage>, ...) is more
 * deeply and variably nested than Archimedes' - a real tree makes the
 * per-tag text-extraction rules in extractText.ts tractable to write
 * correctly, instead of hand-rolling a depth counter per tag name.
 *
 * Deliberately NOT a general XML parser: no DOCTYPE/entity-declaration
 * handling (the corpus has none, verified), no CDATA (none present),
 * attribute values assumed double- or single-quoted with no embedded quotes
 * of the same kind (true throughout this corpus). Comments are skipped.
 * Self-closing (`<tag/>`) and explicit-close (`<tag>...</tag>`) elements are
 * both supported. Malformed nesting (a close tag that doesn't match the
 * innermost open tag) throws - never silently patched, since that would risk
 * silently reshaping the reading text.
 */

export interface XNode {
  kind: 'el' | 'text';
  tag?: string;
  attrs?: Record<string, string>;
  children?: XNode[];
  text?: string;
}

function makeEl(tag: string, attrs: Record<string, string>): XNode {
  return { kind: 'el', tag, attrs, children: [] };
}

const ATTR_RE = /([:\w.-]+)\s*=\s*"([^"]*)"|([:\w.-]+)\s*=\s*'([^']*)'/g;

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(s))) {
    if (m[1] !== undefined) attrs[m[1]] = m[2];
    else if (m[3] !== undefined) attrs[m[3]] = m[4];
  }
  return attrs;
}

/** Parses `src` (an XML fragment - need not have a single root element) into
 *  a synthetic '#root' element wrapping every top-level node. `label` is
 *  used only in thrown error messages. */
export function parseXmlFragment(src: string, label: string): XNode {
  const root: XNode = { kind: 'el', tag: '#root', attrs: {}, children: [] };
  const stack: XNode[] = [root];
  const n = src.length;
  let i = 0;

  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      const text = src.slice(i);
      if (text) stack[stack.length - 1].children!.push({ kind: 'text', text });
      break;
    }
    if (lt > i) {
      stack[stack.length - 1].children!.push({ kind: 'text', text: src.slice(i, lt) });
    }
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      throw new Error(`${label}: unexpected CDATA at offset ${lt} (not handled by this parser)`);
    }
    if (src[lt + 1] === '/') {
      const gt = src.indexOf('>', lt);
      if (gt === -1) throw new Error(`${label}: unterminated close tag at offset ${lt}`);
      const tag = src.slice(lt + 2, gt).trim();
      if (stack.length <= 1) throw new Error(`${label}: stray close tag </${tag}> at offset ${lt}`);
      const top = stack[stack.length - 1];
      if (top.tag !== tag) {
        throw new Error(
          `${label}: mismatched close tag </${tag}> at offset ${lt}, expected </${top.tag}> (open tag stack: ${stack
            .slice(1)
            .map((e) => e.tag)
            .join(' > ')})`,
        );
      }
      stack.pop();
      i = gt + 1;
      continue;
    }
    const gt = src.indexOf('>', lt);
    if (gt === -1) throw new Error(`${label}: unterminated tag at offset ${lt}`);
    let inner = src.slice(lt + 1, gt);
    const selfClosing = inner.endsWith('/');
    if (selfClosing) inner = inner.slice(0, -1);
    const spaceIdx = inner.search(/\s/);
    const tag = (spaceIdx === -1 ? inner : inner.slice(0, spaceIdx)).trim();
    const attrs = spaceIdx === -1 ? {} : parseAttrs(inner.slice(spaceIdx));
    const el = makeEl(tag, attrs);
    stack[stack.length - 1].children!.push(el);
    if (!selfClosing) stack.push(el);
    i = gt + 1;
  }

  if (stack.length !== 1) {
    throw new Error(`${label}: unclosed tag(s) at end of fragment: ${stack.slice(1).map((e) => e.tag).join(' > ')}`);
  }
  return root;
}

export function children(node: XNode, tag?: string): XNode[] {
  const kids = node.children ?? [];
  return tag ? kids.filter((c) => c.kind === 'el' && c.tag === tag) : kids;
}

export function firstChild(node: XNode, tag: string): XNode | null {
  return children(node, tag)[0] ?? null;
}

/** Raw, rule-free inner text of a node (entity-decoded, tags stripped, no
 *  del/gap/note exclusion) - used ONLY to build short excerpts for anomaly
 *  log messages, never as reading text. */
export function rawInnerText(node: XNode): string {
  if (node.kind === 'text') return node.text ?? '';
  let out = '';
  for (const c of node.children ?? []) out += rawInnerText(c);
  return out;
}
