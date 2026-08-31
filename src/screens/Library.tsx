import { Link } from 'react-router-dom';
import {
  authorsSorted,
  workById,
  worksByAuthor,
} from '../library/registry.ts';
import {
  expandedAuthorsInitialized,
  refHref,
  seedExpandedAuthors,
  toggleExpandedAuthor,
  useExpandedAuthors,
  useLast,
} from '../state/storage.ts';
import {
  SearchIcon,
  GearIcon,
  BookmarkIcon,
  ChevronIcon,
} from '../components/icons.tsx';

export function Library() {
  const last = useLast();
  const authors = authorsSorted();

  const stored = useExpandedAuthors();
  const initialized = expandedAuthorsInitialized();
  const lastAuthorId = last ? workById(last.workId)?.authorId : undefined;
  // Default before any user toggle: open the last-read author, else open all.
  const effective = initialized
    ? stored
    : lastAuthorId
      ? [lastAuthorId]
      : authors.map((a) => a.id);

  const isOpen = (id: string) => effective.includes(id);
  const toggle = (id: string) => {
    if (!initialized) seedExpandedAuthors(effective);
    toggleExpandedAuthor(id);
  };

  return (
    <main className="page home library">
      <div
        className="topbar"
        style={{ background: 'transparent', borderBottom: 'none' }}
      >
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

      <h1 className="home__title">LIBRARY</h1>
      <div className="home__rule" />

      {last ? (
        <Link to={refHref(last)} className="home__continue">
          <div className="home__continue-label">Continue</div>
          <div className="home__continue-ref">
            {last.label ?? 'Resume reading'}
          </div>
          {last.title ? (
            <div className="home__continue-utrum">{last.title}</div>
          ) : null}
        </Link>
      ) : null}

      <div className="library__authors">
        {authors.map((a) => {
          const open = isOpen(a.id);
          const works = worksByAuthor(a.id);
          return (
            <section key={a.id} className="library__author">
              <button
                type="button"
                className="library__author-head"
                aria-expanded={open}
                onClick={() => toggle(a.id)}
              >
                <ChevronIcon
                  className={open ? 'library__chev library__chev--open' : 'library__chev'}
                />
                <span className="library__author-name">{a.displayName}</span>
                {a.datesLabel ? (
                  <span className="library__author-dates">{a.datesLabel}</span>
                ) : null}
              </button>
              {open ? (
                <nav className="home__list library__works">
                  {works.map((w) => (
                    <Link
                      key={w.id}
                      to={`/work/${w.id}`}
                      className="home__entry"
                    >
                      <span className="home__entry-name">{w.title}</span>
                      <span className="library__work-meta">{w.meta}</span>
                    </Link>
                  ))}
                </nav>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="home__about">
        <Link to="/about" className="muted">
          About this app
        </Link>
      </p>
    </main>
  );
}
