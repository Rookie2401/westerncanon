import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  authorsSorted,
  groupedWorksByAuthor,
  workById,
} from '../library/registry.ts';
import type { Work } from '../library/types.ts';
import {
  expandedAuthorsInitialized,
  refHref,
  seedExpandedAuthors,
  toggleExpandedAuthor,
  toggleExpandedGroup,
  useExpandedAuthors,
  useExpandedGroups,
  useLast,
} from '../state/storage.ts';
import {
  SearchIcon,
  GearIcon,
  BookmarkIcon,
  ChevronIcon,
} from '../components/icons.tsx';
import { Collapsible } from '../components/Collapsible.tsx';

function WorkLink({ work }: { work: Work }) {
  return (
    <Link to={`/work/${work.id}`} className="home__entry">
      <span className="home__entry-name">{work.title}</span>
      <span className="library__work-meta">{work.meta}</span>
    </Link>
  );
}

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

  // Work-family dropdowns: default collapsed, so the open set is just whatever
  // the user has explicitly opened.
  const openGroups = useExpandedGroups();
  const isGroupOpen = (key: string) => openGroups.includes(key);

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
          const entries = groupedWorksByAuthor(a.id);
          return (
            <section key={a.id} className="library__author">
              <button
                type="button"
                className="library__author-head"
                aria-expanded={open}
                onClick={() => toggle(a.id)}
              >
                <ChevronIcon
                  className={clsx(
                    'library__chev',
                    open && 'library__chev--open',
                  )}
                />
                <span className="library__author-name">{a.displayName}</span>
                {a.datesLabel ? (
                  <span className="library__author-dates">{a.datesLabel}</span>
                ) : null}
              </button>
              <Collapsible open={open}>
                <nav className="home__list library__works">
                  {entries.map((e) =>
                    e.kind === 'single' ? (
                      <WorkLink key={e.work.id} work={e.work} />
                    ) : (
                      <div key={e.key} className="library__group">
                        <button
                          type="button"
                          className="library__group-head"
                          aria-expanded={isGroupOpen(e.key)}
                          onClick={() => toggleExpandedGroup(e.key)}
                        >
                          <ChevronIcon
                            className={clsx(
                              'library__chev',
                              isGroupOpen(e.key) && 'library__chev--open',
                            )}
                          />
                          <span className="library__group-name">{e.family}</span>
                        </button>
                        <Collapsible open={isGroupOpen(e.key)}>
                          <div className="library__group-works">
                            {e.works.map((w) => (
                              <WorkLink key={w.id} work={w} />
                            ))}
                          </div>
                        </Collapsible>
                      </div>
                    ),
                  )}
                </nav>
              </Collapsible>
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
