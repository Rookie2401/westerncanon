import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { applyPrefs } from './state/applyPrefs.ts';
import { getPrefs, usePrefs } from './state/storage.ts';
import { Library } from './screens/Library.tsx';
import { WorkScreen } from './screens/Work.tsx';
import { PartScreen } from './screens/Part.tsx';
import { QuestionScreen } from './screens/Question.tsx';
import { Reader } from './screens/Reader.tsx';
import { GenericReader } from './screens/GenericReader.tsx';
import { WorkAboutScreen } from './screens/WorkAbout.tsx';
import { SearchScreen } from './screens/Search.tsx';
import { BookmarksScreen } from './screens/Bookmarks.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
import { VocabularyScreen } from './screens/Vocabulary.tsx';
import { AboutScreen } from './screens/About.tsx';
import { ProoemiumScreen } from './screens/Prooemium.tsx';

/** Keeps <html> in sync with stored prefs and the OS theme (when theme=system). */
function PrefsEffect() {
  const prefs = usePrefs();
  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getPrefs().theme === 'system') applyPrefs();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return null;
}

/**
 * Routes wrapped in a keyed element so each screen gets a short fade-in on
 * entry. The key collapses every `/read/...` path to one value, so moving
 * article-to-article does NOT re-fade the whole reader (its chrome stays put);
 * the prose itself fades separately, keyed in Reader. Opacity only — a
 * transform here would reparent the reader's position:fixed chrome.
 */
function AnimatedRoutes() {
  const location = useLocation();
  const screenKey = location.pathname.startsWith('/read/')
    ? 'read'
    : location.pathname;
  return (
    <div className="route-fade" key={screenKey}>
      <Routes location={location}>
        <Route path="/" element={<Library />} />
        <Route path="/work/:workId" element={<WorkScreen />} />
        <Route path="/work/:workId/about" element={<WorkAboutScreen />} />
        <Route path="/prooemium" element={<ProoemiumScreen />} />
        <Route path="/part/:partId" element={<PartScreen />} />
        <Route path="/part/:partId/q/:qNum" element={<QuestionScreen />} />
        {/* 3-segment Summa reader; ranks ahead of the 2-segment generic route
            for a 3-segment path, so Summa deep links still resolve. */}
        <Route path="/read/:partId/:qNum/:aParam" element={<Reader />} />
        <Route path="/read/:workId/:divId" element={<GenericReader />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/bookmarks" element={<BookmarksScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/vocabulary" element={<VocabularyScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="*" element={<Library />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <PrefsEffect />
      <div className="shell">
        <AnimatedRoutes />
      </div>
    </HashRouter>
  );
}
