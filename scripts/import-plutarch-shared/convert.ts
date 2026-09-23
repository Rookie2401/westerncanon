/**
 * Converts a walked TEI tree (scripts/import-plutarch-shared/teiWalker.ts)
 * into this app's Division/Passage tree for one Plutarch work + language, per
 * scripts/import-plutarch-shared/workTable.ts.
 *
 * Output shape (per the importer brief): a flat sequence of chapter
 * Divisions (id `ch-N`, number `"N"`, ref null, one Passage per chapter with
 * its sections joined by "\n\n", Passage.n = '', Passage.ref = null) - EXCEPT
 * tlg051 and tlg052, whose two named parts (see workTable.ts `parts`) get an
 * extra book-level Division wrapping their own `book-<slug>-ch-N` chapters,
 * because the source itself restarts chapter numbering at 1 per part (a
 * flat `ch-N` id scheme would collide).
 *
 * Throws StopError (caught by the driver, which exits non-zero) whenever the
 * actually-parsed structure disagrees with the ground truth (chapter/book
 * sequence, count) or a chapter would otherwise be empty - never force-fits
 * or silently renumbers.
 */

import type { WalkDiv } from './teiWalker.ts';
import { collectParagraphs, directChildDivs } from './teiWalker.ts';
import type { PlutarchWorkEntry } from './workTable.ts';
import type { Division, Passage } from './genericTypes.ts';
import { hasCombining } from './text.ts';

export class StopError extends Error {}

export interface Anomaly {
  where: string;
  note: string;
}

export interface ConvertStats {
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  gapCount: number;
  addCount: number;
  sicCorrCount: number;
}

export interface ConvertResult {
  divisions: Division[];
  anomalies: Anomaly[];
  stats: ConvertStats;
}

/**
 * Chapters must be a clean run of consecutive integers with no gaps or
 * duplicates - starting at 1 for 65 of the 66 works, but Timoleon (tlg018)
 * genuinely starts at 0 (a numbered proem chapter, confirmed in both the
 * Greek and English witnesses) - so the starting point is read from the data
 * itself rather than assumed, and only the "consecutive, no gaps" property is
 * enforced.
 */
function checkSequential(workId: string, label: string, actual: readonly string[]): void {
  const start = Number(actual[0]);
  const ok =
    actual.length > 0 &&
    Number.isInteger(start) &&
    actual.every((v, i) => v === String(start + i));
  if (!ok) {
    throw new StopError(
      `${workId}: ${label} is not a clean consecutive-integer sequence.\n` +
        `  got (${actual.length}): ${actual.join(', ')}`,
    );
  }
}

function gapAnomalyNote(count: number): string {
  return count > 1
    ? `${count} lacunae (editorial gaps, reason "lost") occur in this chapter; no text is supplied for the gaps.`
    : 'A lacuna (editorial gap, reason "lost") occurs in this chapter; no text is supplied for the gap.';
}

function buildChapterDivision(
  workId: string,
  idPrefix: string,
  chapterDiv: WalkDiv,
  anomalies: Anomaly[],
  stats: ConvertStats,
): Division {
  const n = chapterDiv.n as string;
  const id = `${idPrefix}${n}`;
  const where = `${workId} / ${id}`;

  const paragraphs = collectParagraphs(chapterDiv);
  const nonEmpty = paragraphs.filter((p) => p.text.length > 0);
  if (nonEmpty.length === 0) {
    throw new StopError(`${workId}: ${id} has no surviving paragraph text`);
  }
  if (nonEmpty.length !== paragraphs.length) {
    anomalies.push({
      where,
      note: `${paragraphs.length - nonEmpty.length} paragraph(s) cleaned to empty text (no surviving content after markup removal); dropped from the joined passage rather than emitted empty.`,
    });
  }

  let gapCount = 0;
  let addCount = 0;
  let sicCorrCount = 0;
  for (const p of nonEmpty) {
    gapCount += p.gapCount;
    addCount += p.addCount;
    sicCorrCount += p.corrExcerpts.length;
    for (const excerpt of p.addExcerpts) {
      anomalies.push({ where, note: `<add> editorial supplement included in reading text: "${excerpt}"` });
    }
    for (let i = 0; i < p.corrExcerpts.length; i++) {
      const sic = p.sicExcerpts[i];
      const corr = p.corrExcerpts[i];
      anomalies.push({
        where,
        note:
          sic !== undefined
            ? `<choice><sic>/<corr> pair: edition prints the corrected reading "${corr}" (kept); the manuscript's unemended reading "${sic}" is excluded from the reading text.`
            : `<corr> editorial correction included in reading text: "${corr}"`,
      });
    }
  }

  stats.gapCount += gapCount;
  stats.addCount += addCount;
  stats.sicCorrCount += sicCorrCount;

  const text = nonEmpty.map((p) => p.text).join('\n\n');
  const passage: Passage = { n: '', text, ref: null };
  if (gapCount > 0) {
    passage.anomaly = gapAnomalyNote(gapCount);
    anomalies.push({ where, note: `<gap reason="lost"/> x${gapCount}: a lacuna in the source; no text supplied.` });
  }
  // A handful of Greek witnesses carry a genuine dangling combining
  // diacritic already present in the SOURCE XML itself (a stray
  // elision/breathing mark, or - once - a misplaced mid-word accent), not an
  // importer artifact. Preserved verbatim per the faithfulness rule; logged
  // here rather than silently corrected.
  if (hasCombining(text)) {
    anomalies.push({
      where,
      note: 'This chapter\'s text contains a standalone combining diacritic already present in the source XML (a dangling elision/breathing mark or misplaced accent) - preserved verbatim, not corrected.',
    });
  }

  stats.passageCount += 1;
  stats.totalChars += text.length;
  stats.chapterCount += 1;

  return {
    id,
    number: n,
    ref: null,
    sourceHeading: null,
    editorialTitle: null,
    children: [],
    passages: [passage],
  };
}

export function convertWork(
  entry: PlutarchWorkEntry,
  lang: 'grc' | 'en',
  root: WalkDiv,
): ConvertResult {
  const workId = `plutarch-${entry.slug}-${lang}`;
  const anomalies: Anomaly[] = [];
  const stats: ConvertStats = { chapterCount: 0, passageCount: 0, totalChars: 0, gapCount: 0, addCount: 0, sicCorrCount: 0 };

  let divisions: Division[];

  if (entry.parts === null) {
    const chapters = directChildDivs(root, 'chapter');
    checkSequential(workId, 'top-level chapter sequence', chapters.map((c) => c.n as string));
    divisions = chapters.map((ch) => buildChapterDivision(workId, 'ch-', ch, anomalies, stats));
  } else {
    const books = directChildDivs(root, 'book');
    if (books.length !== entry.parts.length) {
      throw new StopError(`${workId}: expected ${entry.parts.length} book-level part(s), got ${books.length}`);
    }
    divisions = books.map((bookDiv, i) => {
      const part = entry.parts![i];
      if (bookDiv.n !== part.n) {
        throw new StopError(`${workId}: book[${i}] n=${JSON.stringify(bookDiv.n)}, expected ${JSON.stringify(part.n)}`);
      }
      const expectedHead = lang === 'grc' ? part.headGrc : part.headEng;
      if (bookDiv.head !== null && bookDiv.head !== expectedHead) {
        anomalies.push({
          where: `${workId} / book-${part.slug}`,
          note: `Source <head> for this part is ${JSON.stringify(bookDiv.head)}, differing from workTable.ts's recorded ${JSON.stringify(expectedHead)}; the source's own value is used as sourceHeading.`,
        });
      }
      const sourceHeading = bookDiv.head ?? expectedHead;

      const chapters = directChildDivs(bookDiv, 'chapter');
      checkSequential(workId, `book-${part.slug} chapter sequence`, chapters.map((c) => c.n as string));
      const children = chapters.map((ch) => buildChapterDivision(workId, `book-${part.slug}-ch-`, ch, anomalies, stats));

      return {
        id: `book-${part.slug}`,
        number: null,
        ref: null,
        sourceHeading,
        editorialTitle: null,
        children,
        passages: [],
      };
    });
  }

  return { divisions, anomalies, stats };
}
