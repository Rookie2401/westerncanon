/**
 * Vocabulary (plan §1/§5, R-UI-owned, route /vocabulary): counts per
 * status per language, a filterable list of every tracked lexeme, tap to
 * change status, export/import as JSON, and "mark all shown as known".
 *
 * NOTE (see final report): this screen needs one export vocab.ts's §6
 * surface doesn't list — `listKnownWords(): Promise<KnownWord[]>`, a
 * snapshot of the whole 'westerncanon-lexis' status table. §6 only exposes
 * `useStatuses(keys)` (keyed by a caller-supplied key list) and the
 * aggregate `vocabCounts()` (no per-language breakdown) — neither lets the
 * client enumerate "every word the reader has ever marked" to build this
 * list or its per-language-per-status counts, so per-language counts here
 * are derived client-side from `listKnownWords()`'s rows instead of calling
 * `vocabCounts()`.
 */
import { useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar.tsx';
import { useResource } from '../ui/useResource.ts';
import { exportVocab, importVocab, listKnownWords, markAllKnown, setStatus } from '../lexis/vocab.ts';
import type { KnownWord, LexLang, WordStatus } from '../lexis/types.ts';
import { WORD_STATUSES } from '../lexis/types.ts';
import { StatusPicker } from '../lexis/ui/StatusPicker.tsx';

const LANG_NAME: Record<LexLang, string> = { grc: 'Greek', la: 'Latin', it: 'Italian' };
const LANGS: LexLang[] = ['grc', 'la', 'it'];
const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'New',
  seen: 'Seen',
  recognizing: 'Recognizing',
  known: 'Known',
  mastered: 'Mastered',
  ignored: 'Ignored',
};

/** The lemma part of a lexeme id (`<lang>:<pos>:<lemma>` -> `<lemma>`), for
 *  display and for the search box — homograph suffixes (`#2`) kept as is. */
function lemmaOf(key: string): string {
  return key.split(':').slice(2).join(':');
}

export function VocabularyScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data } = useResource(() => listKnownWords(), `lexis-vocab:${refreshKey}`);
  const words = useMemo(() => data ?? [], [data]);

  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');
  const [langFilter, setLangFilter] = useState<LexLang | 'all'>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const w of words) {
      const k = `${w.lang}:${w.status}`;
      c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [words]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return words
      .filter((w) => statusFilter === 'all' || w.status === statusFilter)
      .filter((w) => langFilter === 'all' || w.lang === langFilter)
      .filter((w) => !needle || lemmaOf(w.key).toLowerCase().includes(needle))
      .sort((a, b) => lemmaOf(a.key).localeCompare(lemmaOf(b.key)));
  }, [words, statusFilter, langFilter, q]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function onStatusChange(w: KnownWord, s: WordStatus) {
    await setStatus(w.key, s, 'manual').catch(() => {});
    refresh();
  }

  async function onMarkAllShown() {
    if (filtered.length === 0) return;
    setBusy(true);
    try {
      await markAllKnown(filtered.map((w) => w.key));
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    const json = await exportVocab();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    setImportError(null);
    try {
      const text = await file.text();
      await importVocab(text);
      refresh();
    } catch {
      setImportError('Could not read that file — it may not be a vocabulary export.');
    }
  }

  return (
    <>
      <TopBar back="/" title="Vocabulary" />
      <main className="page">
        <div className="lx-vocab-counts">
          {LANGS.map((lang) => (
            <div key={lang} className="lx-vocab-counts__lang">
              <span className="lx-vocab-counts__lang-name">{LANG_NAME[lang]}</span>
              <div className="lx-vocab-counts__row">
                {WORD_STATUSES.map((s) => (
                  <span key={s} className="lx-vocab-counts__stat">
                    <b>{counts.get(`${lang}:${s}`) ?? 0}</b> {STATUS_LABEL[s].toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <input
          className="filter"
          placeholder="Search by lemma…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search vocabulary by lemma"
        />

        <div className="segmented" role="group" aria-label="Filter by language">
          <button aria-pressed={langFilter === 'all'} onClick={() => setLangFilter('all')}>
            All languages
          </button>
          {LANGS.map((lang) => (
            <button key={lang} aria-pressed={langFilter === lang} onClick={() => setLangFilter(lang)}>
              {LANG_NAME[lang]}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Filter by status">
          <button aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All statuses
          </button>
          {WORD_STATUSES.map((s) => (
            <button key={s} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="lx-vocab-actions">
          <button className="btn" onClick={onMarkAllShown} disabled={busy || filtered.length === 0}>
            Mark all shown as known
          </button>
          <button className="btn" onClick={onExport} disabled={words.length === 0}>
            Export JSON
          </button>
          <label className="btn lx-vocab-actions__import">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="lx-vocab-actions__file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) onImportFile(f);
              }}
            />
          </label>
        </div>
        {importError ? (
          <p className="lx-card__unknown" role="alert">
            {importError}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <p className="empty">No words match.</p>
        ) : (
          <div className="entrylist">
            {filtered.map((w) => (
              <div key={w.key} className="entry lx-vocab-row">
                <span className="entry__num lx-vocab-row__lemma">{lemmaOf(w.key)}</span>
                <span className="lx-vocab-row__lang">{LANG_NAME[w.lang]}</span>
                <StatusPicker value={w.status} onChange={(s) => onStatusChange(w, s)} />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
