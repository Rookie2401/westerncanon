import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackIcon } from './icons.tsx';

interface TopBarProps {
  /** Route to go back to; when omitted a browser back() is used. */
  back?: string;
  title?: string;
  right?: ReactNode;
}

export function TopBar({ back, title, right }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      {back !== undefined ? (
        <Link to={back} className="iconbtn" aria-label="Back">
          <BackIcon />
        </Link>
      ) : (
        <button className="iconbtn" aria-label="Back" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      )}
      {title ? <span className="topbar__title">{title}</span> : null}
      <span className="topbar__spacer" />
      {right}
    </header>
  );
}
