import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { applyPrefs } from './state/applyPrefs.ts';
import { getPrefs, usePrefs } from './state/storage.ts';
import { Home } from './screens/Home.tsx';
import { PartScreen } from './screens/Part.tsx';
import { QuestionScreen } from './screens/Question.tsx';
import { Reader } from './screens/Reader.tsx';
import { SearchScreen } from './screens/Search.tsx';
import { BookmarksScreen } from './screens/Bookmarks.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
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

export default function App() {
  return (
    <HashRouter>
      <PrefsEffect />
      <div className="shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prooemium" element={<ProoemiumScreen />} />
          <Route path="/part/:partId" element={<PartScreen />} />
          <Route path="/part/:partId/q/:qNum" element={<QuestionScreen />} />
          <Route path="/read/:partId/:qNum/:aParam" element={<Reader />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/bookmarks" element={<BookmarksScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
