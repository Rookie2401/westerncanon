/**
 * The path bar at the end of a reader section (docs/COURSE-PLAN.md §1):
 * where this section sits on the path, "Finished this unit" (the only way a
 * unit is ever completed), the comprehension report, and the English rescue
 * link when the sibling edition has the same section. Sits AFTER the
 * passages: nothing is ever inserted into a text.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EDITION, SIBLING_EDITION } from '../../library/edition.ts';
import type { LexLang } from '../../lexis/types.ts';
import { recordEvent, unitProgress } from '../evidence.ts';
import type { Evidence } from '../evidence.ts';
import { stageName, unitOfStop } from '../index.ts';
import type { CourseLadder, Degree } from '../types.ts';
import { DEGREES } from '../types.ts';

const DEGREE_LABEL: Record<Degree, string> = { all: 'All', most: 'Most', some: 'Some', little: 'Little' };

export interface PathBarProps {
  ladder: CourseLadder;
  evidence: Evidence | undefined;
  lang: LexLang;
  workId: string;
  divId: string;
}

export function PathBar({ ladder, evidence, lang, workId, divId }: PathBarProps) {
  const hit = unitOfStop(ladder, workId, divId);
  const work = ladder.works[workId];
  const en = work?.en && work.en.aligned ? work.en.workId : null;
  const [busy, setBusy] = useState(false);

  const rescueHref = en
    ? EDITION === 'all'
      ? `#/read/${en}/${divId}`
      : `${SIBLING_EDITION?.href ?? '../'}#/read/${en}/${divId}`
    : null;

  const onRescue = () => {
    recordEvent({ type: 'RescueOpened', lang, workId, divId }).catch(() => {});
  };

  if (!hit && !rescueHref) return null;

  const progress = hit && evidence ? unitProgress(hit.unit, evidence) : null;
  const finished = progress?.finishedAt !== null && progress?.finishedAt !== undefined;
  const stopNo = hit ? hit.unit.divs.indexOf(divId) + 1 : 0;

  const finish = async () => {
    if (!hit || busy) return;
    setBusy(true);
    await recordEvent({ type: 'UnitCompleted', lang, unitId: hit.unit.id, workId }).catch(() => {});
    setBusy(false);
  };
  const report = async (degree: Degree) => {
    if (!hit || busy) return;
    setBusy(true);
    await recordEvent({ type: 'ComprehensionReported', lang, unitId: hit.unit.id, workId, degree }).catch(() => {});
    setBusy(false);
  };

  return (
    <aside className="co-bar" lang="en" aria-label="Your path" data-testid="path-bar">
      {hit ? (
        <>
          <p className="co-bar__where">
            <Link to="/path">On your path</Link> · {stageName(hit.unit.stage)} · unit {hit.index + 1} of {ladder.units.length}
            {hit.unit.divs.length > 1 ? ` · section ${stopNo} of ${hit.unit.divs.length}` : ''}
            {progress ? ` · ${progress.seenDivs} of ${progress.totalDivs} seen` : ''}
          </p>
          <div className="co-bar__row">
            {finished ? (
              <span className="co-chip co-chip--done">Finished</span>
            ) : (
              <button className="btn" onClick={finish} disabled={busy} data-testid="path-finish">
                Finished this unit
              </button>
            )}
            <span className="co-bar__ask">How much did you understand?</span>
            <span className="segmented co-bar__degrees" role="group" aria-label="How much did you understand">
              {DEGREES.map((d) => (
                <button key={d} aria-pressed={progress?.reported === d} onClick={() => report(d)} disabled={busy}>
                  {DEGREE_LABEL[d]}
                </button>
              ))}
            </span>
          </div>
        </>
      ) : null}
      {rescueHref ? (
        <p className="co-bar__rescue">
          {EDITION === 'all' ? (
            <Link to={rescueHref.slice(1)} onClick={onRescue}>
              English translation of this section →
            </Link>
          ) : (
            <a href={rescueHref} onClick={onRescue} target="_blank" rel="noopener">
              English translation of this section →
            </a>
          )}{' '}
          <span className="muted">(opening it is recorded as a rescue)</span>
        </p>
      ) : null}
    </aside>
  );
}
