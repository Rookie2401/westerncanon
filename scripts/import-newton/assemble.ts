/**
 * Turns one page's token stream (walk.ts) into a leading heading/group-marker
 * catalogue plus a flat, document-order list of leaf items (Lemma/Proposition/
 * Definition/Law/Corollary/Rule/Phaenomenon/Hypothesis), each carrying its own
 * Passage[]. See classify.ts for the structural vocabulary this recognises.
 */
import type { Token } from './walk.ts';
import { classifyHeading, classifyParagraphStart, isFurniture, type StructKind } from './classify.ts';

export interface RawPassage {
  text: string;
  figureAlts: string[];
}

export interface LeafItem {
  kind: StructKind;
  roman: string | null;
  headingRaw: string;
  passages: RawPassage[];
}

export interface GroupMarker {
  /** index into `items` before which this unnumbered group heading (e.g. "HYPOTHESES.") appears */
  beforeIndex: number;
  label: string;
}

export interface AssembleResult {
  /** Non-furniture heading text seen before the first structural marker, joined with a single space - the page/section's own printed subtitle. */
  leadingHeading: string | null;
  items: LeafItem[];
  groupMarkers: GroupMarker[];
  /** Non-furniture, non-structural heading lines seen AFTER the first item opened but not attributable to any open passage (should be empty; logged if not). */
  strayHeadings: string[];
  caseMarkers: number;
  /**
   * CONTENT paragraphs (ordinary <p>s, not centred headings) that appear
   * before this page's first structural item opens - real reading text, not
   * furniture. Confirmed genuine in two forms: a Section's own un-centred
   * introductory remarks (e.g. Book I Section XI opens with a paragraph of
   * prose before its first Lemma), and - most notably - Book III's own
   * famous transitional paragraph ("In the preceding Books I have laid down
   * the principles of philosophy...") which precedes the "HYPOTHESES."/
   * "RULES OF REASONING" group heading entirely. Never discarded; the caller
   * turns this into a leading "-intro" leaf Division when non-empty.
   */
  preItemParagraphs: string[];
}

/**
 * Splits `text` at every place a new inline structural marker (Cor./Hypoth./
 * Cas.) begins, including mid-string (the source sometimes runs consecutive
 * items together in one physical <p>, e.g. Liber III's Hypoth. IV / V).
 *
 * A match is only treated as a genuine new item when it sits at a real
 * sentence boundary - the token's very start, or immediately after a
 * "<letter>. " sentence end. This is necessary because Newton's own proofs
 * constantly CITE an earlier hypothesis/corollary mid-sentence ("...per
 * Hypoth. V." / "ex Hypoth. VII. sequitur..."), which otherwise reads
 * identically to the marker that INTRODUCES one.
 */
function splitOnInlineMarkers(text: string): string[] {
  const re = /(?:Cor(?:\.|ol\.?|ollarium\.?)\s+[IVXLCDM0-9]+\.?\s|Hypoth\.?\s+[IVXLCDM]+\.?\s|Cas\.?\s+[IVXLCDM0-9]+\.?\s)/gi;
  const starts: number[] = [0];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index === 0) continue;
    const before = text.slice(0, m.index).trimEnd();
    if (before.endsWith('.')) starts.push(m.index);
  }
  if (starts.length === 1) return [text];
  const out: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]!;
    const e = i + 1 < starts.length ? starts[i + 1]! : text.length;
    out.push(text.slice(s, e).trim());
  }
  return out;
}

export function assemblePage(tokens: Token[]): AssembleResult {
  const leadingParts: string[] = [];
  const items: LeafItem[] = [];
  const groupMarkers: GroupMarker[] = [];
  const strayHeadings: string[] = [];
  const preItemParagraphs: string[] = [];
  let caseMarkers = 0;

  let current: LeafItem | null = null;
  let currentPassage: RawPassage | null = null;
  let pendingFigureAlts: string[] = [];

  function pushPassage(): void {
    if (current && currentPassage && currentPassage.text.trim().length > 0) {
      current.passages.push(currentPassage);
    }
    currentPassage = null;
  }

  function openPassage(seedText: string): void {
    pushPassage();
    currentPassage = { text: seedText, figureAlts: [...pendingFigureAlts] };
    pendingFigureAlts = [];
  }

  function appendToPassage(text: string): void {
    if (!currentPassage) {
      openPassage(text);
      return;
    }
    currentPassage.text = currentPassage.text.length > 0 ? `${currentPassage.text}\n\n${text}` : text;
    if (pendingFigureAlts.length > 0) {
      currentPassage.figureAlts.push(...pendingFigureAlts);
      pendingFigureAlts = [];
    }
  }

  function openItem(kind: StructKind, roman: string | null, headingRaw: string): void {
    pushPassage();
    current = { kind, roman, headingRaw, passages: [] };
    items.push(current);
  }

  for (const tok of tokens) {
    if (tok.kind === 'figure') {
      pendingFigureAlts.push(tok.alt || '(untitled figure)');
      continue;
    }
    if (tok.kind === 'heading') {
      if (isFurniture(tok.text)) continue;
      const m = classifyHeading(tok.text);
      if (m === null) {
        // Not structural, not furniture: either the page's own subtitle
        // (before the first item) or genuine reading text set centred in the
        // print (e.g. a Definition's italicised statement, a data-table
        // caption) once an item is already open.
        if (current === null) leadingParts.push(tok.text);
        else appendToPassage(tok.text);
        continue;
      }
      if (m.kind === 'hypotheses-group') {
        groupMarkers.push({ beforeIndex: items.length, label: tok.text });
        continue;
      }
      if (m.kind === 'scholium-like') {
        if (current === null) {
          strayHeadings.push(tok.text);
          continue;
        }
        openPassage(`${tok.text} `);
        continue;
      }
      openItem(m.kind, m.roman, tok.text);
      continue;
    }
    // content token: the source sometimes runs several "Hypoth. N." (or,
    // less often, "Cor. N.") items together inside ONE physical <p> with no
    // tag break between them (confirmed e.g. Liber III's Hypoth. IV / V
    // sharing a single paragraph) - so a boundary marker is searched for
    // anywhere in the text, not only at index 0.
    for (const segment of splitOnInlineMarkers(tok.text)) {
      if (segment.length === 0) continue;
      const inline = classifyParagraphStart(segment);
      if (inline?.action === 'corol') {
        if (current === null) {
          strayHeadings.push(`[inline Cor.] ${segment.slice(0, 60)}`);
          continue;
        }
        openPassage(segment);
        continue;
      }
      if (inline?.action === 'hypoth') {
        openItem('hypoth', inline.roman, segment.slice(0, 40));
        appendToPassage(segment);
        continue;
      }
      if (inline?.action === 'case') caseMarkers += 1;
      if (current === null) {
        preItemParagraphs.push(segment);
        continue;
      }
      appendToPassage(segment);
    }
  }
  pushPassage();

  return {
    leadingHeading: leadingParts.length > 0 ? leadingParts.join(' ') : null,
    items,
    groupMarkers,
    strayHeadings,
    caseMarkers,
    preItemParagraphs,
  };
}
