import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

/** Small, muted `A › B › C` trail. Last item is never a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {c.to && !last ? (
              <Link to={c.to} className="breadcrumbs__link">
                {c.label}
              </Link>
            ) : (
              <span className="breadcrumbs__current">{c.label}</span>
            )}
            {last ? null : (
              <span className="breadcrumbs__sep" aria-hidden="true">
                ›
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
