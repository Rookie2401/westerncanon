/**
 * Structural walker + reducer: turns one Perseus canonical-greekLit drama TEI
 * witness (a single <div type="edition"|"translation"> inside <body>) into
 * this app's Division[]/Passage[] tree, per the importer's target schema
 * (see the project's importer spec / task doc for the design rationale -
 * summarised in scripts/import-greek-drama-shared/genericTypes.ts's field
 * comments).
 *
 * Top-level Divisions are Perseus CARDS (<milestone unit="card" n="N"/>,
 * Perseus's own ~50-line reading chunks), `id: "card-N"`. Passages within a
 * card are one per <sp> (speech) normally; a <stage> direction (whether a
 * direct sibling of <sp> elements or nested inside one, interrupting its
 * <l> run) becomes its own bracketed Passage with no speaker-name line. A
 * speech interrupted by EITHER a card boundary OR a nested <stage> is split
 * into multiple Passages; every Passage after the first for the same <sp>
 * repeats the speaker name followed by " (cont.)" - one disclosed
 * convention covering both interruption causes, rather than two different
 * ones (a card-boundary split and a stage-direction split are both "this
 * speech resumes after an interruption" from a reader's point of view).
 *
 * The dramatis-personae cast list, when present, is a <note> found before
 * any <sp> in the witness (Euripides only - neither Aeschylus nor Sophocles'
 * Greek editions carry one in this corpus, verified). It becomes the FIRST
 * Division (`id: "dramatis-personae"`), never a card, per the schema.
 *
 * addSpan/delSpan/anchor judgment call: see extractText.ts's module doc.
 */

import type { XNode } from './xml.ts';
import { parseXmlFragment, children, firstChild, rawInnerText } from './xml.ts';
import { extractCleanText } from './extractText.ts';
import type { Anomaly } from './extractText.ts';
import type { Division, Passage } from './genericTypes.ts';
import { stripTagsForExcerpt } from './text.ts';

export type DramaLang = 'grc' | 'en';

const HEADING_LABELS: Record<string, string> = {
  episode: 'Episode',
  choral: 'Choral ode',
  strophe: 'Strophe',
  antistrophe: 'Antistrophe',
  anapests: 'Anapests',
  lyric: 'Lyric',
  kommos: 'Kommos',
  epode: 'Epode',
  mesode: 'Mesode',
  ephymn: 'Ephymnion',
  ephymnion: 'Ephymnion',
  close: 'Close',
  dialogue: 'Dialogue',
  elegiacs: 'Elegiacs',
  hexameter: 'Hexameter',
  iambic: 'Iambics',
  iambics: 'Iambics',
  trochaic: 'Trochaics',
  trochees: 'Trochaics',
  // Not present in Aeschylus/Sophocles/Euripides but kept so the shared
  // importer is Aristophanes-ready without code changes (per the task brief).
  parabasis: 'Parabasis',
  parodos: 'Parodos',
  exodos: 'Exodos',
  prologue: 'Prologue',
  agon: 'Agon',
  // Aristophanes-specific structural subtypes (verified present across the
  // 11 comedies; the source itself is inconsistent about capitalisation AND
  // spelling for several of these - e.g. both "Epirrheme"/"epirrhema"/
  // "epirrheme" and "Antepirrheme"/"antepirrhema"/"antepirrheme" occur - so
  // each spelling variant is normalised here to one consistent label rather
  // than surfacing the source's own inconsistency to the reader).
  exodus: 'Exodus',
  proagon: 'Proagon',
  epirrheme: 'Epirrheme',
  epirrhema: 'Epirrheme',
  antepirrheme: 'Antepirrheme',
  antepirrhema: 'Antepirrheme',
  proepirrheme: 'Proepirrheme',
  antiproepirrheme: 'Antiproepirrheme',
  katakeleusmos: 'Katakeleusmos',
  katakeleusmenos: 'Katakeleusmos',
  antikatakeleusmos: 'Antikatakeleusmos',
  antikatakeleusmenos: 'Antikatakeleusmos',
  pnigos: 'Pnigos',
  antipnigos: 'Antipnigos',
  prelude: 'Prelude',
  antiprelude: 'Antiprelude',
  monody: 'Monody',
  sphragis: 'Sphragis',
  dactyls: 'Dactyls',
  tetrameters: 'Tetrameters',
  cast_list: 'Cast List',
};

function headingLabel(subtype: string): string {
  const known = HEADING_LABELS[subtype.toLowerCase()];
  if (known) return known;
  return subtype.length ? subtype[0].toUpperCase() + subtype.slice(1) : subtype;
}

/** Logs one per-occurrence anomaly for a Perseus display-only `<l n="0">`
 *  line, whichever of its two shapes this is: a self-closing empty
 *  placeholder (`<l n="0" style="hidden"/>`, used when a dramatis-personae
 *  note already names the cast) or the `<l n="0"><hi rend="strong">Name</hi>
 *  <!--...display purposes only--></l>` variant (used when there is no
 *  dramatis-personae note to name the first speaker - e.g. Aeschylus'
 *  Agamemnon, English translation). Either way this is Perseus's own
 *  editorial insertion, never source text, and is skipped by the caller
 *  without contributing to the reading text - logged individually here (in
 *  addition to the corpus-wide aggregate note in convertWitness) so every
 *  occurrence has its own traceable record. */
function logHiddenLine(node: XNode, where: string, anomalies: Anomaly[]): void {
  const raw = stripTagsForExcerpt(rawInnerText(node));
  anomalies.push({
    where,
    note: raw.length
      ? `<l n="0"> Perseus-added display-only duplicate speaker label (not source text, "for display purposes only" per the source's own comment) skipped: "${raw}"`
      : '<l n="0" style="hidden"/> Perseus-added empty display-only placeholder line (not source text) skipped.',
  });
}

interface DraftPassage {
  /** null = orphan/stage/para passage whose citation line number is
   *  back-filled from a neighbour after the whole witness has been walked */
  n: string | null;
  text: string;
}

interface WorkingCard {
  number: string;
  headingAtStart: string | null;
  passages: DraftPassage[];
  lineNs: string[];
}

export interface ConvertStats {
  cardCount: number;
  passageCount: number;
  totalChars: number;
  hiddenLineCount: number;
  emptyLineDropped: number;
  noteDiscardCount: number;
  hasDramatisPersonae: boolean;
  stageDirectionCount: number;
}

export interface ConvertResult {
  divisions: Division[];
  anomalies: Anomaly[];
  stats: ConvertStats;
}

class Ctx {
  readonly workId: string;
  readonly lang: DramaLang;
  readonly anomalies: Anomaly[] = [];
  headingStack: string[] = [];
  cards: WorkingCard[] = [];
  currentCard: WorkingCard | null = null;
  dramatisPersonae: Division | null = null;
  sawAnySp = false;
  hiddenLineCount = 0;
  emptyLineDropped = 0;
  noteDiscardCount = 0;
  stageDirectionCount = 0;
  /** the last non-empty speaker label seen, so an <sp> with no <speaker>
   *  child of its own (a continuous choral utterance split across a
   *  strophe/antistrophe structural boundary, where the source does not
   *  repeat a redundant <speaker> tag) can inherit it rather than going
   *  unattributed - see the 'sp' case in walkDivChildren. */
  lastSpeakerLabel: string | null = null;
  /** content (typically a scene-setting <stage> direction) encountered
   *  before the work's very first <milestone unit="card"/> - e.g. Aeschylus'
   *  Agamemnon (English translation) opens with a stage direction ahead of
   *  card 1. Buffered here and prepended into card 1 once it starts, rather
   *  than treated as an error - a play's opening stage direction has no
   *  card of its own to belong to otherwise. */
  private pendingPrelude: DraftPassage[] = [];

  constructor(workId: string, lang: DramaLang) {
    this.workId = workId;
    this.lang = lang;
  }

  startNewCard(n: string): void {
    if (this.currentCard) this.cards.push(this.currentCard);
    this.currentCard = {
      number: n,
      headingAtStart: this.headingStack[this.headingStack.length - 1] ?? null,
      passages: [...this.pendingPrelude],
      lineNs: [],
    };
    this.pendingPrelude = [];
  }

  pushPassage(p: DraftPassage): void {
    if (!this.currentCard) {
      this.pendingPrelude.push(p);
      return;
    }
    this.currentCard.passages.push(p);
  }

  pushLineN(n: string): void {
    if (!this.currentCard) return;
    this.currentCard.lineNs.push(n);
  }

  finish(): void {
    if (this.currentCard) this.cards.push(this.currentCard);
  }
}

function collectParagraphs(node: XNode, where: string, anomalies: Anomaly[], out: string[]): void {
  for (const child of children(node)) {
    if (child.kind !== 'el') continue;
    // Euripides/Aeschylus/Sophocles print the cast list as a flat run of
    // <p> entries; Aristophanes' Frogs (the one instance found so far)
    // instead prints a heading <p> followed by a <listPerson> of <person>
    // <persName> entries - both are folded into the same flat entry list
    // here, one per <p> OR <person>, in document order.
    if (child.tag === 'p' || child.tag === 'person') {
      out.push(extractCleanText(child, where, anomalies));
    } else {
      collectParagraphs(child, where, anomalies, out);
    }
  }
}

function buildDramatisPersonae(noteEl: XNode, ctx: Ctx): Division {
  const where = `${ctx.workId} / dramatis-personae`;
  const paras: string[] = [];
  collectParagraphs(noteEl, where, ctx.anomalies, paras);

  let heading: string | null = null;
  let persons = paras;
  if (paras.length > 0) {
    heading = paras[0];
    persons = paras.slice(1);
    if (persons.length > 0 && persons[0] === heading) {
      ctx.anomalies.push({
        where,
        note: `duplicate heading paragraph "${heading}" found immediately after the note's own heading (the source nests a second <note> with a repeated heading <p> inside the first - verified in Euripides' Hecuba); the duplicate is dropped, the heading kept once.`,
      });
      persons = persons.slice(1);
    }
  }
  const nonEmpty = persons.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) {
    ctx.anomalies.push({ where, note: 'dramatis-personae note contained no person entries after its heading.' });
  }

  return {
    id: 'dramatis-personae',
    number: null,
    ref: null,
    sourceHeading: heading,
    editorialTitle: null,
    children: [],
    passages: nonEmpty.length > 0 ? [{ n: '', text: nonEmpty.join('\n'), ref: null }] : [],
  };
}

/**
 * Joins consecutive line/paragraph texts with `sep`, merging an
 * editor-bracketed <del> span that Perseus's TEI re-opens/re-closes at every
 * <l> it spans (see extractText.ts's <del> rule) back into ONE continuous
 * bracket: whenever one part's text ends in "]" and the very next part's
 * text starts with "[", both are dropped at the seam (only at the seam -
 * every other bracket in either part is left untouched) rather than joined
 * as "...found,] [and if bereft...". Disclosed heuristic: this is a
 * positional adjacency check, not a structural link (no <del> in this
 * corpus ever spans multiple <l> via one open/close pair - verified - so
 * there is no id-based way to confirm two adjacent per-line <del>s are "the
 * same" editorial deletion); in the one corpus-wide case checked by hand
 * (Sophocles' Antigone 900-920) it reproduces exactly the single continuous
 * span every printed edition shows.
 */
function joinWithBracketMerge(parts: string[], sep: string): string {
  let out = parts[0] ?? '';
  for (let i = 1; i < parts.length; i++) {
    const cur = parts[i];
    if (out.endsWith(']') && cur.startsWith('[')) {
      out = out.slice(0, -1) + sep + cur.slice(1);
    } else {
      out = out + sep + cur;
    }
  }
  return out;
}

function walkSpChildren(spEl: XNode, speakerLabel: string, ctx: Ctx): void {
  let acc: { n: string; text: string }[] = [];
  let hasFlushedDialogue = false;
  const where = (suffix: string) => `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'} / sp[${speakerLabel}]${suffix}`;

  const flush = () => {
    if (acc.length === 0) return;
    const label = hasFlushedDialogue ? `${speakerLabel} (cont.)` : speakerLabel;
    const body = joinWithBracketMerge(
      acc.map((a) => a.text),
      ctx.lang === 'grc' ? '\n' : ' ',
    );
    ctx.pushPassage({ n: acc[0].n, text: `${label}\n${body}` });
    hasFlushedDialogue = true;
    acc = [];
  };

  for (const child of children(spEl)) {
    if (child.kind !== 'el') continue;
    const tag = child.tag ?? '';
    if (tag === 'speaker') continue;
    if (tag === 'l') {
      if (child.attrs?.n === '0') {
        ctx.hiddenLineCount += 1;
        logHiddenLine(child, where('/l[n=0]'), ctx.anomalies);
        continue;
      }
      const n = child.attrs?.n ?? '';
      const text = extractCleanText(child, where(`/l[n=${n}]`), ctx.anomalies);
      if (text.length === 0) {
        ctx.emptyLineDropped += 1;
        ctx.anomalies.push({
          where: where(`/l[n=${n}]`),
          note: 'line produced empty reading text after cleaning (its content was entirely apparatus/note material, e.g. "N lines missing here"); the line is omitted from the joined passage text rather than leaving a blank line, but is recorded here so nothing is silently lost.',
        });
        continue;
      }
      acc.push({ n, text });
      ctx.pushLineN(n);
      continue;
    }
    if (tag === 'stage') {
      flush();
      ctx.stageDirectionCount += 1;
      const stageText = extractCleanText(child, where('/stage'), ctx.anomalies);
      ctx.pushPassage({ n: null, text: `[${stageText}]` });
      continue;
    }
    if (tag === 'milestone' && child.attrs?.unit === 'card') {
      flush();
      ctx.startNewCard(child.attrs?.n ?? '');
      continue;
    }
    if (tag === 'milestone' || tag === 'pb' || tag === 'anchor' || tag === 'addSpan' || tag === 'delSpan') {
      extractCleanText(child, where(`/${tag}`), ctx.anomalies); // logs span markers; others are silently inert
      continue;
    }
    if (tag === 'note') {
      ctx.noteDiscardCount += 1;
      continue;
    }
    ctx.anomalies.push({ where: where(`/${tag}`), note: `unexpected direct child <${tag}> of <sp>; ignored at structural level.` });
  }
  flush();
}

function walkDivChildren(divEl: XNode, ctx: Ctx): void {
  for (const child of children(divEl)) {
    if (child.kind !== 'el') continue;
    const tag = child.tag ?? '';
    switch (tag) {
      case 'div': {
        if (child.attrs?.type === 'textpart') {
          ctx.headingStack.push(headingLabel(child.attrs?.subtype ?? ''));
          walkDivChildren(child, ctx);
          ctx.headingStack.pop();
        } else {
          ctx.anomalies.push({
            where: ctx.workId,
            note: `unexpected nested <div type="${child.attrs?.type ?? ''}"> inside the edition/translation div; walked transparently as if its contents were direct siblings.`,
          });
          walkDivChildren(child, ctx);
        }
        break;
      }
      case 'milestone': {
        if (child.attrs?.unit === 'card') ctx.startNewCard(child.attrs?.n ?? '');
        break;
      }
      case 'l': {
        if (child.attrs?.n === '0') {
          ctx.hiddenLineCount += 1;
          logHiddenLine(child, `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'} / l[n=0]`, ctx.anomalies);
          break;
        }
        // Orphan line: inside a card, outside any <sp> - rare, per the
        // importer spec ("text inside a card but outside any sp").
        const n = child.attrs?.n ?? '';
        const text = extractCleanText(child, `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'} / orphan-l[${n}]`, ctx.anomalies);
        if (text.length > 0) {
          ctx.pushPassage({ n, text });
          ctx.pushLineN(n);
        }
        break;
      }
      case 'note': {
        if (!ctx.sawAnySp && ctx.dramatisPersonae === null) {
          ctx.dramatisPersonae = buildDramatisPersonae(child, ctx);
        } else {
          ctx.noteDiscardCount += 1;
        }
        break;
      }
      case 'sp': {
        ctx.sawAnySp = true;
        const speakerEl = firstChild(child, 'speaker');
        let speakerLabel: string;
        if (!speakerEl) {
          speakerLabel = ctx.lastSpeakerLabel ?? '';
          ctx.anomalies.push({
            where: `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'}`,
            note: `<sp> with no <speaker> child; speaker label inherited from the previous speech ("${speakerLabel}") - the source omits a redundant repeated tag, typically a choral utterance sung continuously across a strophe/antistrophe structural boundary.`,
          });
        } else {
          speakerLabel = extractCleanText(speakerEl, `${ctx.workId} / speaker`, ctx.anomalies);
          // Note: a <speaker> whose ONLY content is an editorially-<del>-
          // marked attribution (e.g. <speaker><del>Χορός</del></speaker>,
          // with no <add> replacement supplied) no longer lands here since
          // the 2026-09-22 policy change - extractText's <del> rule now
          // brackets and keeps that name (e.g. "[Χορός]") rather than
          // discarding it, so speakerLabel is non-empty in that case. This
          // branch is now the rarer residual one: a <speaker> whose content
          // was excluded by some OTHER rule entirely (e.g. a bare <gap/>).
          if (speakerLabel.length === 0) {
            ctx.anomalies.push({
              where: `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'}`,
              note: '<speaker> element present but produced no text; left unattributed rather than guessing a name.',
            });
          }
        }
        if (speakerLabel.length > 0) ctx.lastSpeakerLabel = speakerLabel;
        walkSpChildren(child, speakerLabel, ctx);
        break;
      }
      case 'stage': {
        ctx.stageDirectionCount += 1;
        const stageText = extractCleanText(child, `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'} / stage`, ctx.anomalies);
        ctx.pushPassage({ n: null, text: `[${stageText}]` });
        break;
      }
      case 'p': {
        const text = extractCleanText(child, `${ctx.workId} / card-${ctx.currentCard?.number ?? '?'} / p`, ctx.anomalies);
        if (text.length > 0) ctx.pushPassage({ n: null, text });
        break;
      }
      case 'pb':
      case 'anchor':
      case 'addSpan':
      case 'delSpan': {
        extractCleanText(child, `${ctx.workId} / ${tag}`, ctx.anomalies);
        break;
      }
      default:
        ctx.anomalies.push({ where: ctx.workId, note: `unexpected top-level child <${tag}> of a structural div; ignored.` });
    }
  }
}

/** Back-fills every stage/para/orphan passage's `n: null` placeholder from
 *  the nearest real line number: the next numbered passage in the same
 *  card, else the first numbered passage of a later card, else the closest
 *  earlier numbered passage. Guarantees every Passage ends up with a
 *  non-null citation `n` if the witness has ANY numbered line at all. */
function backfillNumbers(cards: WorkingCard[]): void {
  const flat: DraftPassage[] = [];
  for (const c of cards) for (const p of c.passages) flat.push(p);

  for (let i = 0; i < flat.length; i++) {
    if (flat[i].n !== null) continue;
    let found: string | null = null;
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j].n !== null) {
        found = flat[j].n;
        break;
      }
    }
    if (found === null) {
      for (let j = i - 1; j >= 0; j--) {
        if (flat[j].n !== null) {
          found = flat[j].n;
          break;
        }
      }
    }
    flat[i].n = found ?? '';
  }
}

function cardRef(lineNs: string[]): string | null {
  if (lineNs.length === 0) return null;
  const first = lineNs[0];
  const last = lineNs[lineNs.length - 1];
  return first === last ? first : `${first}–${last}`;
}

export function convertWitness(xml: string, workId: string, lang: DramaLang): ConvertResult {
  const bodyStart = xml.indexOf('<body');
  const bodyOpenEnd = xml.indexOf('>', bodyStart);
  const bodyEnd = xml.lastIndexOf('</body>');
  if (bodyStart < 0 || bodyOpenEnd < 0 || bodyEnd < 0) {
    throw new Error(`${workId}: no <body>...</body> found`);
  }
  const bodyInner = xml.slice(bodyOpenEnd + 1, bodyEnd);
  const tree = parseXmlFragment(bodyInner, workId);

  const rootDiv = children(tree, 'div').find((d) => d.attrs?.type === 'edition' || d.attrs?.type === 'translation');
  if (!rootDiv) {
    throw new Error(`${workId}: no <div type="edition"|"translation"> found directly under <body>`);
  }

  const ctx = new Ctx(workId, lang);
  walkDivChildren(rootDiv, ctx);
  ctx.finish();

  if (ctx.cards.length === 0) {
    throw new Error(`${workId}: no card divisions produced (no <milestone unit="card"/> found?)`);
  }

  backfillNumbers(ctx.cards);

  const divisions: Division[] = [];
  if (ctx.dramatisPersonae) divisions.push(ctx.dramatisPersonae);

  let passageCount = 0;
  let totalChars = 0;
  let emittedCardCount = 0;
  for (const c of ctx.cards) {
    const passages: Passage[] = c.passages.map((p) => {
      passageCount += 1;
      totalChars += p.text.length;
      return { n: p.n ?? '', text: p.text, ref: null };
    });
    if (passages.length === 0) {
      // A card whose entire content was diverted elsewhere - so far seen
      // only in Aristophanes' Frogs, whose Cast_List div carries its own
      // <milestone unit="card" n="0"/> around nothing but the (specially
      // handled, non-card) dramatis-personae note and a hidden n="0" line.
      // Logged, but not emitted as a pointless empty "§ 0" division.
      ctx.anomalies.push({
        where: `${workId} / card-${c.number}`,
        note: 'this card produced zero passages (its entire content was diverted elsewhere, e.g. into the dramatis-personae division); omitted from the output rather than emitted as an empty division.',
      });
      continue;
    }
    emittedCardCount += 1;
    divisions.push({
      id: `card-${c.number}`,
      number: c.number,
      ref: cardRef(c.lineNs),
      sourceHeading: c.headingAtStart,
      editorialTitle: null,
      children: [],
      passages,
    });
  }

  const stats: ConvertStats = {
    cardCount: emittedCardCount,
    passageCount,
    totalChars,
    hiddenLineCount: ctx.hiddenLineCount,
    emptyLineDropped: ctx.emptyLineDropped,
    noteDiscardCount: ctx.noteDiscardCount,
    hasDramatisPersonae: ctx.dramatisPersonae !== null,
    stageDirectionCount: ctx.stageDirectionCount,
  };

  if (ctx.hiddenLineCount > 0 || ctx.noteDiscardCount > 0) {
    ctx.anomalies.unshift({
      where: `${workId} / transcription hygiene`,
      note: `${ctx.hiddenLineCount} Perseus display-only hidden line(s) (<l n="0" style="hidden"/>, or the <l n="0"><hi>Name</hi></l> variant used when there is no dramatis-personae note - both are Perseus's own editorial insertion "for display purposes only", not source text) skipped; ${ctx.noteDiscardCount} apparatus <note> element(s) (editorial commentary, not reading text - not counting the dramatis-personae note itself, handled separately) discarded entirely.`,
    });
  }

  return { divisions, anomalies: ctx.anomalies, stats };
}
