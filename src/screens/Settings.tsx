import {
  FONT_SIZES,
  LINE_HEIGHTS,
  setPrefs,
  usePrefs,
} from '../state/storage.ts';
import type { ThemeChoice } from '../state/storage.ts';
import { TopBar } from '../components/TopBar.tsx';

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

        <div className="setting__preview" lang="la">
          Respondeo dicendum quod Deum esse quinque viis probari potest. Prima
          autem et manifestior via est, quae sumitur ex parte motus.
        </div>
      </main>
    </>
  );
}
