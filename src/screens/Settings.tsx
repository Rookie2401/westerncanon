import { Link } from 'react-router-dom';
import {
  FONT_SIZES,
  LINE_HEIGHTS,
  setPrefs,
  usePrefs,
} from '../state/storage.ts';
import type { ThemeChoice } from '../state/storage.ts';
import { TopBar } from '../components/TopBar.tsx';
import { EDITION, EDITION_NAME, SIBLING_EDITION } from '../library/edition.ts';
import { loadManifest } from '../lexis/index.ts';
import { setLexisSettings, useLexisSettings } from '../lexis/settings.ts';
import type { LexLang, LexisSettings } from '../lexis/types.ts';
import { useResource } from '../ui/useResource.ts';

const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL'];
const SPACING_LABELS = ['Tight', 'Normal', 'Loose'];
const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LEX_LANG_NAME: Record<LexLang, string> = {
  grc: 'Greek',
  la: 'Latin',
  it: 'Italian',
};
const HIGHLIGHT_OPTIONS: { value: LexisSettings['highlight']; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'new', label: 'New only' },
  { value: 'all', label: 'All' },
];
const AUTO_KNOWN_OPTIONS = [0, 4, 6, 10];

/**
 * "Language help" settings (plan §1/§5, R-UI-owned): only meaningful in the
 * original-language edition, so the whole section is absent (not merely
 * disabled) in the English edition — matching the "Library edition" note
 * above it, which already documents per-edition differences to the reader.
 */
function LanguageHelpSettings() {
  const settings = useLexisSettings();
  const { data: manifest } = useResource(() => loadManifest(), 'lexis-manifest');
  const languages = manifest
    ? (Object.keys(manifest.languages) as LexLang[]).filter((l) => manifest.languages[l])
    : [];

  return (
    <>
      <div className="setting">
        <div className="setting__label">Language help</div>
        <div className="segmented">
          <button aria-pressed={settings.enabled} onClick={() => setLexisSettings({ enabled: true })}>
            On
          </button>
          <button aria-pressed={!settings.enabled} onClick={() => setLexisSettings({ enabled: false })}>
            Off
          </button>
        </div>
        <p className="setting__note">
          Tap any word in a Greek, Latin or Italian text for its meaning, morphology and status.{' '}
          <Link to="/vocabulary">Vocabulary →</Link>
        </p>
      </div>

      <div className="setting">
        <div className="setting__label">Highlight words</div>
        <div className="segmented">
          {HIGHLIGHT_OPTIONS.map((o) => (
            <button
              key={o.value}
              aria-pressed={settings.highlight === o.value}
              onClick={() => setLexisSettings({ highlight: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <div className="setting__label">Mark known automatically after</div>
        <div className="segmented">
          {AUTO_KNOWN_OPTIONS.map((n) => (
            <button
              key={n}
              aria-pressed={settings.autoKnownAfter === n}
              onClick={() => setLexisSettings({ autoKnownAfter: n })}
            >
              {n === 0 ? 'Never' : `${n}×`}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <div className="setting__label">Morphology on first tap</div>
        <div className="segmented">
          <button
            aria-pressed={settings.morphOnFirstLevel}
            onClick={() => setLexisSettings({ morphOnFirstLevel: true })}
          >
            On
          </button>
          <button
            aria-pressed={!settings.morphOnFirstLevel}
            onClick={() => setLexisSettings({ morphOnFirstLevel: false })}
          >
            Off
          </button>
        </div>
      </div>

      <div className="setting">
        <div className="setting__label">Build coverage</div>
        <p className="setting__note">
          {manifest && languages.length > 0 ? (
            <>
              Words recognised by the analyser:{' '}
              {languages
                .map((l) => `${LEX_LANG_NAME[l]} ${Math.round((manifest.languages[l]?.coverage ?? 0) * 100)}%`)
                .join(', ')}
              .
            </>
          ) : (
            'Loading…'
          )}{' '}
          These are automated readings, not a scholar&rsquo;s — the lower the confidence shown on a word,
          the more likely it is a guess.
        </p>
      </div>
    </>
  );
}

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

        {EDITION !== 'en' ? <LanguageHelpSettings /> : null}

        <div className="setting__preview">
          Respondeo dicendum quod Deum esse quinque viis probari potest. Prima
          autem et manifestior via est, quae sumitur ex parte motus.
        </div>
      </main>
    </>
  );
}
