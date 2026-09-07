import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { authorById, workById } from '../library/registry.ts';
import { summaTopLevel } from '../library/summaAdapter.ts';
import { isConsolidatableGroup, loadGenericWork } from '../library/genericCorpus.ts';
import type { Division } from '../library/types.ts';
import { useResource } from '../ui/useResource.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { Collapsible } from '../components/Collapsible.tsx';
import { ChevronIcon } from '../components/icons.tsx';

function sectionNumber(d: Division): string {
  if (d.number === null) return d.sourceHeading ?? 'Praefatio';
  return `§ ${d.number}`;
}

export function WorkScreen() {
  const { workId = '' } = useParams();
  const work = workById(workId);
  const author = work ? authorById(work.authorId) : undefined;

  if (!work) {
    return (
      <>
        <TopBar back="/" title="Library" />
        <main className="page">
          <p className="empty">Unknown work.</p>
        </main>
      </>
    );
  }

  // Back always goes straight to the Library — the Author screen is not part of
  // the drill-down path (nothing links into it), so it must not sit on the way
  // out. The author still shows in the breadcrumb, as plain text.
  const crumbs = [
    ...(author ? [{ label: author.displayName }] : []),
    { label: work.title },
  ];

  return (
    <>
      <TopBar back="/" title="Library" />
      <main className="page">
        <Breadcrumbs items={crumbs} />
        <div className="screen-head">
          <h1 className="screen-head__title">{work.title}</h1>
          {work.commonTitle ? (
            <p className="home__subtitle" style={{ marginTop: '0.2rem' }}>
              {work.commonTitle}
            </p>
          ) : null}
          <p className="crumb" style={{ marginTop: '0.4rem' }}>
            {work.meta}
          </p>
        </div>

        {work.profile === 'summa' ? (
          <SummaWorkBody />
        ) : (
          <GenericWorkBody workId={work.id} />
        )}
      </main>
    </>
  );
}

/** The Prooemium link + 4 Partes, EXACTLY as the old Home rendered them, then
 *  this work's own "About the text" entry at the very bottom. */
function SummaWorkBody() {
  const entries = summaTopLevel();
  return (
    <nav className="home__list">
      {entries.map((e) => (
        <div key={e.id}>
          {e.compilation ? (
            <p className="home__list-divider">Appended after Tertia Pars</p>
          ) : null}
          <Link
            to={e.to}
            className={e.compilation ? 'home__entry home__entry--compilation' : 'home__entry'}
          >
            <span className="home__entry-name">
              {e.label}
              {e.compilation ? (
                <span className="home__entry-sub">posthumous compilation</span>
              ) : null}
            </span>
            {e.code ? <span className="home__entry-index">{e.code}</span> : null}
          </Link>
        </div>
      ))}
      <Link to="/work/summa-theologiae/about" className="home__entry work__about-entry">
        <span className="home__entry-name">About this text</span>
      </Link>
    </nav>
  );
}

/**
 * A leaf division (no children): the existing flat entry, unchanged — a
 * direct link to the Reader for its own passages.
 */
function DivisionLeaf({ workId, d }: { workId: string; d: Division }) {
  return (
    <Link to={`/read/${workId}/${d.id}`} className="entry">
      <span className="entry__num">{sectionNumber(d)}</span>
      <span className="work__preview">
        {d.ref ? <span className="work__ref">{d.ref}</span> : null}
        {d.editorialTitle ? (
          <span className="work__edtitle">
            <span className="work__edtag">ed.</span>
            {d.editorialTitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * A container division (has children, e.g. a Euclid Book): a collapsible
 * header — closed by default, same disclosure pattern as the Library's
 * work-family dropdown — that expands to its children, recursively. Never
 * itself a link: a container carries no passages of its own.
 */
function DivisionGroup({ workId, d, depth }: { workId: string; d: Division; depth: number }) {
  const [open, setOpen] = useState(false);
  // A group container (e.g. a Book, or - defensively - some future deeper
  // nesting) has number === null AND sourceHeading === null by design when
  // it's a bare container — that combination must NOT fall back to
  // sectionNumber's leaf-only 'Praefatio' default here.
  const label = d.editorialTitle
    ? (d.number !== null ? `§ ${d.number} · ${d.editorialTitle}` : d.editorialTitle)
    : (d.sourceHeading ?? (d.number !== null ? `§ ${d.number}` : ''));
  return (
    <div className="entrygroup">
      <button
        type="button"
        className="entrygroup__head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronIcon
          className={clsx('entrygroup__chev', open && 'entrygroup__chev--open')}
        />
        <span className="entrygroup__label">{label}</span>
      </button>
      <Collapsible open={open}>
        <div className="entrygroup__children">
          {d.children.map((c) => (
            <DivisionRow key={c.id} workId={workId} d={c} depth={depth + 1} />
          ))}
        </div>
      </Collapsible>
    </div>
  );
}

/**
 * A consolidatable section-type group (Euclid's Definitions / Postulates /
 * Common Notions, or a Book X repeat like Definitions II): rather than
 * expanding into N individually-clickable leaves, this links straight to one
 * reading page that carries all of them together (see GenericReader's
 * consolidated-group rendering) — one plain row, same as a leaf.
 */
function DivisionGroupLink({ workId, d }: { workId: string; d: Division }) {
  return (
    <Link to={`/read/${workId}/${d.id}`} className="entry">
      <span className="entry__num">{d.editorialTitle}</span>
    </Link>
  );
}

/**
 * A "section-type" group — has an editorial title of its own and only bare
 * leaves as children, e.g. Euclid's Definitions/Postulates/Common Notions/
 * Propositions groups, or a Book X repeat like Propositions II. Deliberately
 * narrower than "any flat group of leaves": a generic work can still nest a
 * plain (untitled, sourceHeading-only) group and get the ordinary disclosure
 * treatment below — see the "nested Division groups" render.test.tsx fixture,
 * which exercises exactly that path and must keep its own expand/collapse
 * button.
 */
function isSectionTypeGroup(d: Division): boolean {
  return (
    d.children.length > 0 &&
    d.editorialTitle !== null &&
    d.children.every((c) => c.children.length === 0)
  );
}

/**
 * Below the top level (depth > 0), a book's own section-type groups never
 * get an extra expand/collapse step of their own: a consolidatable one
 * (Definitions, Postulates, Common Notions, ...) is one link carrying all of
 * its entries, and any other one (Propositions, or Book X's Propositions
 * I/II/III) has its leaves spliced directly into the surrounding list — so a
 * book's whole contents (Definitions, Postulates, Common Notions, Prop. 1,
 * Prop. 2, ...) read as ONE flat list once expanded, not a list of lists.
 * Only the top-level Book (depth 0) — and any other, non-section-type group —
 * keeps the disclosure treatment.
 */
function DivisionRow({ workId, d, depth }: { workId: string; d: Division; depth: number }) {
  if (d.children.length === 0) return <DivisionLeaf workId={workId} d={d} />;
  if (depth > 0 && isSectionTypeGroup(d)) {
    if (isConsolidatableGroup(d)) return <DivisionGroupLink workId={workId} d={d} />;
    return (
      <>
        {d.children.map((c) => (
          <DivisionLeaf key={c.id} workId={workId} d={c} />
        ))}
      </>
    );
  }
  return <DivisionGroup workId={workId} d={d} depth={depth} />;
}

function GenericWorkBody({ workId }: { workId: string }) {
  const { data: work, loading } = useResource(
    () => loadGenericWork(workId),
    `generic:${workId}`,
  );

  if (loading) return <p className="loading">Loading…</p>;
  if (!work) {
    return (
      <p className="empty">
        This work is not available in this build yet.{' '}
        <Link to="/">Back to the Library</Link>.
      </p>
    );
  }

  return (
    <>
      <p className="work__legend">English section titles are editorial.</p>
      <div className="entrylist">
        {work.divisions.map((d) => (
          <DivisionRow key={d.id} workId={workId} d={d} depth={0} />
        ))}
        <Link
          to={`/work/${workId}/about`}
          className="entry work__about-entry"
        >
          <span className="entry__num">About this text</span>
        </Link>
      </div>
    </>
  );
}
