/**
 * Mad Max Gym — Zero-Dependency Flat 1.8px-Stroke SVG Icon Library
 * Strictly replaces all emoji characters across the UI.
 */

const ICON_PATHS = {
  barbell: (
    <>
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3.5 8.5v7" />
      <path d="M20.5 8.5v7" />
      <path d="M6.5 12h11" />
      <path d="M2 12h1.5" />
      <path d="M20.5 12H22" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3.5 8.5v7" />
      <path d="M20.5 8.5v7" />
      <path d="M6.5 12h11" />
      <path d="M2 12h1.5" />
      <path d="M20.5 12H22" />
    </>
  ),
  shield: (
    <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
  ),
  qr: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 15h2v2h-2z" />
      <path d="M19 15h2v6h-6v-2" />
      <path d="M15 19h2" />
      <path d="M12 3v3" />
      <path d="M12 10v4" />
      <path d="M3 12h4" />
      <path d="M11 12h3" />
    </>
  ),
  'user-check': (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 20v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 11l2 2 4-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M16.5 14a4.5 4.5 0 0 1 5 4.5V20" />
    </>
  ),
  'user-plus': (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 20v-1a6 6 0 0 1 12 0v1" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </>
  ),
  'id-card': (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <circle cx="8.5" cy="10.5" r="2" />
      <path d="M5.5 16c.6-1.5 1.8-2.2 3-2.2s2.4.7 3 2.2" />
      <path d="M14 9.5h4.5" />
      <path d="M14 13h4.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M16 2.5v4" />
      <path d="M8 2.5v4" />
      <path d="M3 9.5h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9h.01" />
      <path d="M18 15h.01" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M16 12h5" />
      <circle cx="16.5" cy="12" r="0.75" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6.5 15h4" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V3.5h12V9" />
      <path d="M6 18H4.5A2 2 0 0 1 2.5 16v-5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H18" />
      <rect x="6" y="14" width="12" height="6.5" rx="1" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3z" />
      <path d="M8.5 9h7" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h4.5" />
    </>
  ),
  'chart-bar': (
    <>
      <path d="M3 20h18" />
      <rect x="5" y="12" width="3.5" height="8" rx="0.75" />
      <rect x="10.25" y="7" width="3.5" height="13" rx="0.75" />
      <rect x="15.5" y="4" width="3.5" height="16" rx="0.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 .92-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51.92H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  staff: (
    <>
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M3 20v-1a6 6 0 0 1 9.5-4.9" />
      <path d="M17.5 11.5l3.5 1.5v2.7c0 2.3-1.5 4.2-3.5 5.1-2-.9-3.5-2.8-3.5-5.1V13l3.5-1.5z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M17.94 17.94A10.4 10.4 0 0 1 12 19.5c-6.2 0-10-7.5-10-7.5a18.2 18.2 0 0 1 4.1-4.95" />
      <path d="M9.9 5.3A9.6 9.6 0 0 1 12 5c6.2 0 10 7 10 7a17.7 17.7 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
      <path d="M3 3l18 18" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15.5" r="1" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 7.6-1.7" />
      <circle cx="12" cy="15.5" r="1" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2.5v19" />
      <path d="M2.5 12h19" />
      <path d="M5.3 5.3l13.4 13.4" />
      <path d="M18.7 5.3L5.3 18.7" />
      <path d="M9.5 4.5L12 7l2.5-2.5" />
      <path d="M9.5 19.5L12 17l2.5 2.5" />
      <path d="M4.5 9.5L7 12l-2.5 2.5" />
      <path d="M19.5 9.5L17 12l2.5 2.5" />
    </>
  ),
  flame: (
    <path d="M12 2.5c1.8 3.2 5.5 5.4 5.5 10a5.5 5.5 0 1 1-11 0c0-2.4 1.2-4.6 2.8-6.2.2 1.6 1.2 2.5 2.2 2.7-.6-2.4-.2-4.7.5-6.5z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.8-3.8" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6h17" />
      <path d="M8.5 6V4a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 4v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-14" />
      <path d="M10 10.5v6.5" />
      <path d="M14 10.5v6.5" />
    </>
  ),
  x: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-10.5" />,
  'alert-triangle': (
    <>
      <path d="M10.3 3.8L2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  'refresh-cw': (
    <>
      <path d="M20 4v5h-5" />
      <path d="M4 20v-5h5" />
      <path d="M5.6 9A7.5 7.5 0 0 1 19 6.5L20 9" />
      <path d="M18.4 15A7.5 7.5 0 0 1 5 17.5L4 15" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  maximize: (
    <>
      <path d="M8 3H4a1 1 0 0 0-1 1v4" />
      <path d="M16 3h4a1 1 0 0 1 1 1v4" />
      <path d="M8 21H4a1 1 0 0 1-1-1v-4" />
      <path d="M16 21h4a1 1 0 0 0 1-1v-4" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  'more-vertical': (
    <>
      <circle cx="12" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
};

const ICON_ALIASES = {
  freeze: 'snowflake',
  kebab: 'more-vertical',
};

export default function SvgIcon({
  name,
  size = 18,
  className = '',
  strokeWidth = 1.8,
  title,
  ...rest
}) {
  const resolvedName = ICON_ALIASES[name] || name;
  const content = ICON_PATHS[resolvedName] || ICON_PATHS.info;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
