/**
 * The status dots (Sefer/Slovo/Vetus pattern, ported): one small button per
 * WordStatus, the current one filled in, a plain-English name beside them.
 * Deliberately dot-shaped rather than colour-filled text — status is shown by
 * fill/outline, never by recolouring the word itself (see TokenizedText's
 * highlight rule).
 */
import clsx from 'clsx';
import type { WordStatus } from '../types.ts';
import { WORD_STATUSES } from '../types.ts';

const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'New',
  seen: 'Seen',
  recognizing: 'Recognizing',
  known: 'Known',
  mastered: 'Mastered',
  ignored: 'Ignored',
};

export function StatusPicker({
  value,
  onChange,
}: {
  value: WordStatus;
  onChange: (status: WordStatus) => void;
}) {
  return (
    <div className="lx-status" role="group" aria-label="Word status">
      {WORD_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          className="lx-status__dot"
          aria-pressed={value === s}
          aria-label={STATUS_LABEL[s]}
          title={STATUS_LABEL[s]}
          onClick={() => onChange(s)}
        >
          <span className={clsx('lx-status__mark', value === s && 'lx-status__mark--on')} aria-hidden="true" />
        </button>
      ))}
      <span className="lx-status__name">{STATUS_LABEL[value]}</span>
    </div>
  );
}
