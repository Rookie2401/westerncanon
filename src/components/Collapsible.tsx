import type { ReactNode } from 'react';

/**
 * Height-animated disclosure. Content stays mounted so it can animate both
 * ways; the `grid-template-rows: 0fr <-> 1fr` transition is the reliable
 * declarative way to animate to/from auto height (Chrome 107+, Safari 16+,
 * Firefox 66+) and composes cleanly when nested. `inert` keeps a collapsed
 * panel out of tab/AT reach. Under prefers-reduced-motion the global duration
 * override collapses it to an instant cut.
 *
 * Shared by the Library's author/work-family accordions and the generic
 * Work screen's nested Division groups (e.g. Euclid Book -> section -> "n").
 */
export function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div className="collapsible" data-open={open ? 'true' : 'false'}>
      <div className="collapsible__inner" inert={!open}>
        {children}
      </div>
    </div>
  );
}
