interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function BackIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function GearIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
    </svg>
  );
}

export function BookmarkIcon({ size = 20, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </svg>
  );
}

export function ListIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowLeft({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 5l-7 7 7 7" />
    </svg>
  );
}

export function ArrowRight({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M10 5l7 7-7 7" />
    </svg>
  );
}
