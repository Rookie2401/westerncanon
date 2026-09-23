/**
 * Recursive, rule-driven text extraction from one XNode subtree (an <l>,
 * <speaker>, <stage> or <p>), implementing the drama importer's faithfulness
 * rules (see the importer spec / project module docs):
 *
 *   <del> - policy as of the 2026-09-22 "keep in brackets" revision: an
 *   editor's deletion is NEVER dropped from the reading text. Its content is
 *   KEPT, wrapped in square brackets exactly as a critical edition prints
 *   editor-bracketed text: `[` + text + `]`, recursing normally through any
 *   further nested markup inside it (so a <gap>/<add>/<note> etc. nested
 *   inside a <del> is still handled by its own rule). Every occurrence is
 *   logged with its FULL, untruncated text (never "..."-truncated, unlike
 *   every other logged excerpt in this file). Perseus's own TEI re-opens and
 *   re-closes a single logical multi-line deletion inside EACH <l> it spans
 *   (verified: no <del> in this corpus ever contains a nested <l> as a
 *   child - deletions never structurally cross a line boundary in the XML
 *   itself), so a deletion spanning several lines would otherwise print as
 *   "...found,] [and if bereft..." at every line join. The caller
 *   (teiConvert.ts's joinWithBracketMerge) detects that exact adjacency -
 *   one line's text ending in "]" immediately followed by the next line's
 *   text starting with "[" - and merges the pair into one continuous
 *   bracket spanning both lines, per the disclosed heuristic documented
 *   there. Verified corpus-wide: no <del> anywhere already contains a
 *   literal "[" or "]" in its own text, so this convention is never
 *   ambiguous with source punctuation.
 *
 *   <sic> - policy as of the 2026-09-22 "bare <sic> is a crux" fix: a BARE
 *   <sic> (not paired with a rejecting <corr>/<reg>/<add>) marks text the
 *   edition itself PRINTS as transmitted - a crux the editor flags as
 *   suspect but still reads (e.g. Aeschylus' Suppliants 362
 *   "αἰδόμενος <sic>οὖνπερ</sic>", 444 "<sic>ἄτην γε μείζω...γόμου</sic>").
 *   It is the reading text and is KEPT verbatim, logged as `<sic>
 *   transmitted reading printed as-is (crux), kept: "..."`. Only a PAIRED
 *   <sic> - inside <choice> alongside a <corr>/<reg>/<add> alternative
 *   (<choice><sic>X</sic><corr>Y</corr></choice>, either child order), or,
 *   as Agamemnon 801 shows, directly inside a bare <corr> alongside an
 *   <add> (<corr><add>ἐν</add><sic>ἐς</sic></corr>) - is excluded in favour
 *   of the editor's preferred reading; both shapes are detected and handled
 *   specially by their own 'choice'/'corr' branches below, BEFORE the
 *   generic 'sic' branch ever sees them (so a paired <sic> never reaches the
 *   bare-<sic>-keeps-text rule).
 *
 *   DISCARD entirely (excluded from reading text, every occurrence logged
 *   with a (possibly truncated) excerpt): <note> (apparatus - the
 *   dramatis-personae note is handled separately, BEFORE this function ever
 *   sees it), and a PAIRED <sic> (see above).
 *
 *   INCLUDE, recurse, log: <add> (editorial restoration/interpolation -
 *   including the "Chorus"/"Χορός" editorially-supplied speaker names seen
 *   as <speaker><add>Chorus</add></speaker> in Aeschylus' Suppliants),
 *   <corr>, <reg>, <unclear> (uncertain but still the best-attested reading).
 *
 *   <gap/> - policy as of the 2026-09-22 fix: a gap whose `reason="lost"`
 *   (a true lacuna - manuscript/papyrus damage, missing text) renders as the
 *   conventional lacuna sigla "⟨…⟩" (U+27E8 U+2026 U+27E9) AT that position
 *   - whether the gap is the entire line (so the speech, and its speaker
 *   label, is no longer silently dropped - e.g. Aeschylus' Suppliants 211b,
 *   Sophocles' Oedipus Tyrannus 625a) or inline within a longer line (e.g.
 *   Suppliants 363 "ἱεροδόκα <gap reason="lost"/>"), each occurrence logged
 *   with its line number. NEVER square brackets (those mean editor-bracketed
 *   <del> text as of the prior policy change). A gap with any OTHER reason
 *   value is left exactly as before (no text contributed, logged) - this
 *   corpus's only other reason is "ellipsis" (29 occurrences), which is NOT
 *   lost text but the source's own rhetorical trailing-off/aposiopesis
 *   convention, so it does not qualify for the lacuna sigla.
 *
 *   Self-closing, no text, NOT logged (routine): <pb/>, <lb/> (contributes a
 *   single space so adjoining words don't collide), <milestone/> (only
 *   unit="card" milestones are structurally meaningful and those are
 *   consumed by the caller before reaching this function; any other unit
 *   found nested inside an <l> - e.g. Agamemnon's <milestone unit="para"/> -
 *   is simply inert here), <anchor/>.
 *
 *   Transparent (unwrap, recurse into children, no log): <q>, <quote>,
 *   <foreign>, <emph>, <hi>, <placeName>, <persName>, <name>, <ref>, <seg>,
 *   <gloss>, <date>, <bibl>, <title>, and any other tag not listed above
 *   (logged once as "unexpected tag" so nothing is silently mishandled
 *   without a trace). <choice> and <corr> are special-cased (see above) but
 *   fall back to plain transparent unwrapping when no paired <sic> is found
 *   inside them.
 *
 *   <addSpan>/<delSpan>/<anchor> (rare - 6 occurrences corpus-wide, each
 *   marking a large multi-line span some editor suspects as spurious/
 *   interpolated, crossing <l>/<sp> boundaries) are treated as transparent,
 *   contributing no text of their own and NOT excluding the text they
 *   bracket - see the module doc in teiConvert.ts for the full rationale;
 *   each occurrence is logged once by the caller when found, not here.
 */

import type { XNode } from './xml.ts';
import { rawInnerText } from './xml.ts';
import { cleanText, stripTagsForExcerpt } from './text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

const INCLUDE_LOGGED = new Set(['add', 'corr', 'reg', 'unclear']);
const SILENT_EMPTY = new Set(['pb', 'milestone']);
const SPAN_MARKERS = new Set(['anchor', 'addSpan', 'delSpan']);
const TRANSPARENT = new Set([
  // Entry-point container tags: extractText()/extractCleanText() is called
  // directly on an <l>, <speaker>, <stage> or <p> node as the root of a
  // walk, so the tag itself needs a (transparent) rule too, not just the
  // apparatus tags that can appear nested inside one.
  'l',
  'speaker',
  'stage',
  'p',
  // Inline apparatus/markup tags, transparently unwrapped wherever nested.
  'q',
  'quote',
  'foreign',
  'emph',
  'hi',
  'placeName',
  'persName',
  'person',
  'name',
  'ref',
  'seg',
  'gloss',
  'date',
  'bibl',
  'title',
  'w',
  'said',
]);

function excerpt(node: XNode): string {
  const s = stripTagsForExcerpt(rawInnerText(node));
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

/** Full, untruncated excerpt - used only for <del>'s own anomaly log entry
 *  per the 2026-09-22 policy change ("stop truncating the excerpt... log
 *  the full span verbatim"). */
function fullExcerpt(node: XNode): string {
  return stripTagsForExcerpt(rawInnerText(node));
}

/** `where` is a stable location label (e.g. "aeschylus-agamemnon-grc / card-1
 *  / sp[Φύλαξ] / l[7]") used verbatim as the anomaly's `where` field. */
export function extractText(node: XNode, where: string, anomalies: Anomaly[]): string {
  if (node.kind === 'text') return node.text ?? '';

  const tag = node.tag ?? '';

  if (tag === 'note') {
    // Apparatus note: discarded entirely. Aggregate counting is done by the
    // caller (teiConvert.ts increments a per-file counter); no per-note log
    // line here to avoid thousands of near-duplicate entries for a very
    // repetitive tag class (matches the importer spec's "aggregate counts OK
    // for very repetitive tag classes" allowance).
    return '';
  }

  if (tag === 'gap') {
    const reason = node.attrs?.reason ?? '(no reason given)';
    if (reason === 'lost') {
      anomalies.push({
        where,
        note: `<gap reason="lost"/>: a lacuna in the source; rendered as the conventional lacuna sigla "⟨…⟩".`,
      });
      return '⟨…⟩';
    }
    anomalies.push({ where, note: `<gap reason="${reason}"/>: a lacuna in the source; no text supplied.` });
    return '';
  }

  if (tag === 'del') {
    const inner = extractChildren(node, where, anomalies);
    anomalies.push({
      where,
      note: `<del> editor-bracketed text KEPT in the reading text (in square brackets): "${fullExcerpt(node)}"`,
    });
    return `[${inner}]`;
  }

  // <choice><sic>X</sic><corr>Y</corr></choice> (either child order, or
  // <reg>/<add> in place of <corr>) - the paired form. Handled explicitly,
  // BEFORE the generic transparent-unwrap rule, so its <sic> child never
  // reaches the bare-<sic>-keeps-text rule below.
  if (tag === 'choice') {
    const kids = (node.children ?? []).filter((c) => c.kind === 'el');
    const sicChild = kids.find((c) => c.tag === 'sic') ?? null;
    const altChild = kids.find((c) => c.tag === 'corr' || c.tag === 'reg' || c.tag === 'add') ?? null;
    if (sicChild && altChild) {
      anomalies.push({
        where,
        note: `<sic> excluded from reading text (rejected manuscript reading inside <choice>, editor prefers <${altChild.tag}>): "${fullExcerpt(sicChild)}"`,
      });
      const inner = extractChildren(altChild, where, anomalies);
      const ex = excerpt(altChild);
      anomalies.push({
        where,
        note: `<${altChild.tag}> included in reading text${ex ? `: "${ex}"` : ' (empty)'}`,
      });
      return inner;
    }
    // No sic/alternative pairing found (not observed anywhere in this
    // corpus, verified) - fall back to plain transparent unwrapping.
    return extractChildren(node, where, anomalies);
  }

  // Bare <corr> directly wrapping both the accepted reading and a rejected
  // <sic> sibling - Agamemnon 801's "<corr><add>ἐν</add><sic>ἐς</sic></corr>"
  // is the one verified instance of this shape. Handled explicitly for the
  // same reason as <choice> above; a <corr> with no nested <sic> falls
  // through unchanged to the ordinary INCLUDE_LOGGED handling further down.
  if (tag === 'corr') {
    const kids = (node.children ?? []).filter((c) => c.kind === 'el');
    const sicChild = kids.find((c) => c.tag === 'sic') ?? null;
    if (sicChild) {
      anomalies.push({
        where,
        note: `<sic> excluded from reading text (rejected manuscript reading inside <corr>): "${fullExcerpt(sicChild)}"`,
      });
      let inner = '';
      for (const c of node.children ?? []) {
        if (c === sicChild) continue;
        inner += extractText(c, where, anomalies);
      }
      const ex = stripTagsForExcerpt(inner);
      anomalies.push({
        where,
        note: `<corr> included in reading text${ex ? `: "${ex}"` : ' (empty)'}`,
      });
      return inner;
    }
    // falls through to INCLUDE_LOGGED below
  }

  // Bare <sic> (no paired <corr>/<reg>/<add> sibling caught above): the
  // edition itself PRINTS this as the transmitted reading (a crux) - kept
  // verbatim, never dropped. See the module doc's 2026-09-22 policy note.
  if (tag === 'sic') {
    const inner = extractChildren(node, where, anomalies);
    anomalies.push({
      where,
      note: `<sic> transmitted reading printed as-is (crux), kept: "${fullExcerpt(node)}"`,
    });
    return inner;
  }

  if (tag === 'lb') return ' ';
  if (SILENT_EMPTY.has(tag)) return '';

  if (SPAN_MARKERS.has(tag)) {
    const target = node.attrs?.spanTo ?? node.attrs?.['xml:id'];
    anomalies.push({
      where,
      note: `<${tag}${target ? ` ${node.attrs?.spanTo ? 'spanTo' : 'xml:id'}="${target}"` : ''}/> marker present (source-editor athetesis/interpolation bracketing a suspect multi-line span, often crossing <l>/<sp> boundaries). Judgment call: treated as transparent bookkeeping only - the text it brackets is NOT excluded from the reading text, since both Perseus's own edition and translation still print/display it as running text and it carries the play's standard line citation; excluding it would silently truncate the play. The marker itself contributes no text.`,
    });
    return '';
  }

  if (INCLUDE_LOGGED.has(tag)) {
    const inner = extractChildren(node, where, anomalies);
    const ex = excerpt(node);
    anomalies.push({
      where,
      note: `<${tag}> included in reading text${ex ? `: "${ex}"` : ' (empty)'}`,
    });
    return inner;
  }

  if (TRANSPARENT.has(tag)) {
    return extractChildren(node, where, anomalies);
  }

  // Unknown tag: unwrap transparently but leave a trace so nothing is
  // silently mishandled without a record.
  anomalies.push({ where, note: `unexpected tag <${tag}> encountered; text content kept, tag stripped.` });
  return extractChildren(node, where, anomalies);
}

function extractChildren(node: XNode, where: string, anomalies: Anomaly[]): string {
  let out = '';
  for (const c of node.children ?? []) out += extractText(c, where, anomalies);
  return out;
}

/** extractText() + cleanText() (entity-decode, NFC, whitespace-collapse) -
 *  the function callers actually use to get one line/paragraph's final
 *  reading-text string. */
export function extractCleanText(node: XNode, where: string, anomalies: Anomaly[]): string {
  return cleanText(extractText(node, where, anomalies));
}
