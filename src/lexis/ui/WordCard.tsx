/**
 * The tap-a-word bottom sheet, three levels deep (Sefer/Slovo/Vetus pattern,
 * ported — see docs/LEXIS-PLAN.md §1):
 *   1 (default) — surface as printed · lemma · morphology of the top reading ·
 *     short gloss · status picker · chips for alternative readings.
 *   2 "More"     — every reading with its morph + gloss, all senses, the
 *     dictionary's inflection note.
 *   3 "Deeper"   — the full dictionary article, occurrences in this work,
 *     this reader's own history, the provenance line.
 * An unrecognised word (no readings for its form key) gets a card that says
 * so plainly and still offers the status picker, keyed `<lang>:?:<formKey>`.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { LexEntry, LexLang, Reading, WorkLexis } from '../types.ts';
import { loadEntry } from '../index.ts';
import { describeMorph, morphShort, posLabel } from '../morph.ts';
import { recordLookup, setStatus, useStatuses } from '../vocab.ts';
import { StatusPicker } from './StatusPicker.tsx';

export interface WordCardProps {
  /** the word exactly as printed */
  surface: string;
  /** looseKey(surface, lang) — used as the unrecognised-word key's suffix */
  formKey: string;
  lang: LexLang;
  workId: string;
  divId: string;
  /** every reading for this form, best first (empty when unrecognised) */
  readings: Reading[];
  bundle: WorkLexis;
  morphOnFirstLevel: boolean;
  onClose: () => void;
}

export function WordCard({
  surface,
  formKey,
  lang,
  workId,
  divId,
  readings,
  bundle,
  morphOnFirstLevel,
  onClose,
}: WordCardProps) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [pick, setPick] = useState(0);
  const [entry, setEntry] = useState<LexEntry | null | undefined>(undefined);

  const reading: Reading | undefined = readings[pick];
  const lexemeId = reading ? reading[0] : `${lang}:?:${formKey}`;
  const lexeme = reading ? bundle.lexemes[reading[0]] : undefined;

  const statusKeys = useMemo(() => [lexemeId], [lexemeId]);
  const statuses = useStatuses(statusKeys);
  const known = statuses.get(lexemeId);

  useEffect(() => {
    setLevel(1);
    setPick(0);
  }, [formKey]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    recordLookup(lexemeId, { workId, divId }).catch(() => {
      // offline storage failure: the lookup simply isn't counted this time
    });
  }, [lexemeId, workId, divId]);

  useEffect(() => {
    if (!reading) {
      setEntry(null);
      return undefined;
    }
    let alive = true;
    setEntry(undefined);
    loadEntry(lang, reading[0])
      .then((e) => alive && setEntry(e))
      .catch(() => alive && setEntry(null));
    return () => {
      alive = false;
    };
  }, [lang, reading]);

  // "occurrences of the lemma in this work computed from the bundle's forms"
  // (plan owner brief): WorkLexis carries no per-form token frequency, only a
  // form-key -> readings map, so this counts distinct recognised FORMS whose
  // best reading is this lexeme — an honest proxy, not a raw token count; the
  // card's own wording says "forms", never "times".
  const formCount = useMemo(() => {
    if (!reading) return 0;
    let n = 0;
    for (const rs of Object.values(bundle.forms)) {
      if (rs[0]?.[0] === reading[0]) n++;
    }
    return n;
  }, [bundle, reading]);

  const onStatus = (s: Parameters<typeof setStatus>[1]) => {
    setStatus(lexemeId, s, 'manual').catch(() => {
      // offline storage failure: the picker will simply show the old status
    });
  };

  // Portaled to <body>: the reader's article animates with a transform, which
  // would otherwise make this fixed-position sheet position itself relative to
  // the article (and land far below the viewport) instead of the screen.
  return createPortal(
    <div
      className="lx-card-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Word"
      onClick={onClose}
    >
      <div className="lx-card" onClick={(e) => e.stopPropagation()}>
        <div className="lx-card__head">
          <span className="lx-card__head-label">Word</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div
          className={clsx('lx-card__surface', lang === 'grc' && 'lx-card__surface--grc')}
          lang={lang}
        >
          {surface}
        </div>

        {!reading ? (
          <>
            <p className="lx-card__unknown">
              The analyser has no reading for this word — it isn&rsquo;t in the
              build&rsquo;s recognised forms for this language.
            </p>
            <StatusPicker value={known?.status ?? 'new'} onChange={onStatus} />
          </>
        ) : (
          <>
            <div className="lx-card__lemma">
              <span className={clsx('lx-card__lemma-text', lang === 'grc' && 'lx-card__lemma-text--grc')} lang={lang}>
                {lexeme?.lemma ?? reading[0].split(':').slice(2).join(':')}
              </span>
              {lexeme ? <span className="lx-card__pos">{posLabel(lexeme.pos)}</span> : null}
            </div>

            <p className="lx-card__morph">
              {morphOnFirstLevel ? describeMorph(reading[1]) : morphShort(reading[1])}
            </p>

            {lexeme?.gloss ? <p className="lx-card__gloss">{lexeme.gloss}</p> : null}

            <StatusPicker value={known?.status ?? 'new'} onChange={onStatus} />

            {readings.length > 1 ? (
              <div className="lx-card__chips" role="group" aria-label="Alternative readings">
                {readings.map((r, i) => {
                  const lx = bundle.lexemes[r[0]];
                  return (
                    <button
                      key={i}
                      type="button"
                      className={clsx('lx-chip', i === pick && 'lx-chip--on')}
                      aria-pressed={i === pick}
                      onClick={() => setPick(i)}
                    >
                      <span lang={lang}>{lx?.lemma ?? r[0]}</span>
                      {r[1] ? ` · ${morphShort(r[1])}` : lx ? ` · ${posLabel(lx.pos)}` : ''}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="lx-card__actions">
              {level === 1 ? (
                <button type="button" className="btn" onClick={() => setLevel(2)}>
                  More
                </button>
              ) : null}
              {level === 2 ? (
                <button type="button" className="btn" onClick={() => setLevel(3)}>
                  Deeper
                </button>
              ) : null}
              {level > 1 ? (
                <button type="button" className="btn" onClick={() => setLevel(1)}>
                  Less
                </button>
              ) : null}
            </div>

            {level >= 2 ? (
              <div className="lx-card__section">
                <span className="lx-card__section-label">All readings</span>
                {readings.map((r, i) => {
                  const lx = bundle.lexemes[r[0]];
                  return (
                    <div key={i} className="lx-card__reading">
                      <span className="lx-card__reading-lemma" lang={lang}>
                        {lx?.lemma ?? r[0]}
                      </span>
                      <span className="lx-card__reading-morph">{describeMorph(r[1])}</span>
                      {lx?.gloss ? <span className="lx-card__reading-gloss">{lx.gloss}</span> : null}
                    </div>
                  );
                })}
                {entry?.senses && entry.senses.length > 0 ? (
                  <>
                    <span className="lx-card__section-label">Senses</span>
                    <ul className="lx-card__senses">
                      {entry.senses.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {entry?.inflection ? <p className="lx-card__inflection">{entry.inflection}</p> : null}
              </div>
            ) : null}

            {level >= 3 ? (
              <div className="lx-card__section">
                {entry === undefined ? (
                  <p className="lx-card__loading">Loading…</p>
                ) : entry?.html ? (
                  <div className="lx-article" dangerouslySetInnerHTML={{ __html: entry.html }} />
                ) : (
                  <p className="lx-card__note">No dictionary article bundled for this lemma.</p>
                )}
                <p className="lx-card__occurrences">
                  {formCount} recognised form{formCount === 1 ? '' : 's'} of this lemma in this work.
                </p>
                <p className="lx-card__history">
                  Looked up {known?.lookups ?? 0} time{(known?.lookups ?? 0) === 1 ? '' : 's'} · read past{' '}
                  {known?.encounters ?? 0} time{(known?.encounters ?? 0) === 1 ? '' : 's'} in this reader.
                </p>
                <p className="lx-card__prov">
                  analysis: {bundle.analysis} · dictionary: {entry?.dict ?? '—'} · confidence{' '}
                  {Math.round((reading[2] ?? 1) * 100)}%
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
