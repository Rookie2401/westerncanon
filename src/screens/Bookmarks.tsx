import { Link } from 'react-router-dom';
import { removeBookmark, useBookmarks } from '../state/storage.ts';
import { CloseIcon } from '../components/icons.tsx';
import { TopBar } from '../components/TopBar.tsx';

export function BookmarksScreen() {
  const bookmarks = useBookmarks();
  const sorted = [...bookmarks].sort((a, b) => b.added - a.added);

  return (
    <>
      <TopBar back="/" title="Bookmarks" />
      <main className="page">
        {sorted.length === 0 ? (
          <p className="empty">
            No bookmarks yet. Open an article and tap the bookmark in the header.
          </p>
        ) : (
          <div className="entrylist">
            {sorted.map((b) => (
              <div key={b.citation} className="entry" style={{ paddingLeft: 0 }}>
                <Link
                  to={`/read/${b.partId}/${b.qNum}/${b.aParam}`}
                  style={{ flex: 1, minWidth: 0, color: 'inherit' }}
                >
                  <div className="result__cite">{b.citation}</div>
                  <div className="entry__preview">
                    {b.title ?? <span className="muted">—</span>}
                  </div>
                </Link>
                <button
                  className="iconbtn"
                  aria-label={`Remove bookmark ${b.citation}`}
                  onClick={() => removeBookmark(b.citation)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
