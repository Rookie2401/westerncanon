/** Display helpers shared by the course screens. */
import { authorById, workById } from '../../library/registry.ts';
import type { CourseLadder, LadderUnit } from '../types.ts';

/** "Author, Title" of a unit's work from the registry (the ladder's own strings as a fallback). */
export function workLine(unit: LadderUnit, ladder: CourseLadder): string {
  const w = workById(unit.work);
  const a = w ? authorById(w.authorId) : undefined;
  const title = w ? (w.commonTitle ?? w.title) : (ladder.works[unit.work]?.title ?? unit.work);
  const author = a?.displayName ?? ladder.works[unit.work]?.author ?? '';
  return author ? `${author}, ${title}` : title;
}
