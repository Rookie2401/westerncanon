import {
  FONT_SIZES,
  LINE_HEIGHTS,
  setPrefs,
  usePrefs,
} from '../state/storage.ts';
import type { ThemeChoice } from '../state/storage.ts';
import { TopBar } from '../components/TopBar.tsx';
import { EDITION, EDITION_NAME, SIBLING_EDITION } from '../library/edition.ts';

const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL'];
const SPACING_LABELS = ['Tight', 'Normal', 'Loose'];
const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function SettingsScreen() {
  const prefs = usePrefs();

  return (
    <>
      <TopBar back="/" title="Reading settings" />
      <main className="page page--narrow">
        <div className="setting">
          <div className="setting__label">Text size</div>
          <div className="segmented">
            {FONT_SIZES.map((_, i) => (
              <button
                key={i}
                aria-pressed={prefs.fontSize === i}
                onClick={() => setPrefs({ fontSize: i })}
              >
                {SIZE_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting__label">Line spacing</div>
          <div className="segmented">
            {LINE_HEIGHTS.map((_, i) => (
              <button
                key={i}
                aria-pressed={prefs.lineSpacing === i}
                onClick={() => setPrefs({ lineSpacing: i })}
              >
                {SPACING_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting__label">Theme</div>
          <div className="segmented">
            {THEMES.map((t) => (
              <button
                key={t.value}
                aria-pressed={prefs.theme === t.value}
                onClick={() => setPrefs({ theme: t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting__label">Library edition</div>
          <p className="setting__note">
            This is the {EDITION_NAME[EDITION].toLowerCase()}
            {EDITION === 'en'
              ? ': every text in English, whether a translation or an English original.'
              : EDITION === 'original'
                ? ': every text in the language it was written in (Greek, Latin, Italian), with works written in English kept as written.'
                : ': every text in every language.'}
            {SIBLING_EDITION ? (
              <>
                {' '}
                <a href={SIBLING_EDITION.href}>Open the {SIBLING_EDITION.name.toLowerCase()} →</a>
              </>
            ) : null}
          </p>
        </div>

        <div className="setting__preview">
          Respondeo dicendum quod Deum esse quinque viis probari potest. Prima
          autem et manifestior via est, quae sumitur ex parte motus.
        </div>
      </main>
    </>
  );
}
