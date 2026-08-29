import { Link } from 'react-router-dom';
import { PARTS } from '../corpus/corpus.ts';
import { useLast } from '../state/storage.ts';
import { continueLabel } from '../ui/format.ts';
import { SearchIcon, GearIcon, BookmarkIcon } from '../components/icons.tsx';

export function Home() {
  const last = useLast();

  return (
    <main className="page home">
      <div className="topbar" style={{ background: 'transparent', borderBottom: 'none' }}>
        <span className="topbar__spacer" />
        <Link to="/search" className="iconbtn" aria-label="Search">
          <SearchIcon />
        </Link>
        <Link to="/bookmarks" className="iconbtn" aria-label="Bookmarks">
          <BookmarkIcon />
        </Link>
        <Link to="/settings" className="iconbtn" aria-label="Reading settings">
          <GearIcon />
        </Link>
      </div>

      <h1 className="home__title">Summa Theologiae</h1>
      <p className="home__subtitle">Sancti Thomae Aquinatis</p>
      <div className="home__rule" />

      {last ? (
        <Link
          to={`/read/${last.partId}/${last.qNum}/${last.aParam}`}
          className="home__continue"
        >
          <div className="home__continue-label">Continue</div>
          <div className="home__continue-ref">
            {continueLabel(
              PARTS.find((p) => p.id === last.partId)?.label ?? last.partId,
              last.qNum,
              last.aParam,
            )}
          </div>
          {last.title ? (
            <div className="home__continue-utrum">{last.title}</div>
          ) : null}
        </Link>
      ) : null}

      <nav className="home__list">
        <Link to="/prooemium" className="home__entry">
          <span className="home__entry-name">Proœmium</span>
        </Link>
        {PARTS.map((p) => (
          <Link key={p.id} to={`/part/${p.id}`} className="home__entry">
            <span className="home__entry-name">{p.label}</span>
            <span className="home__entry-index">{p.code}</span>
          </Link>
        ))}
      </nav>

      <p className="home__about">
        <Link to="/about" className="muted">
          About &amp; text source
        </Link>
      </p>
    </main>
  );
}
