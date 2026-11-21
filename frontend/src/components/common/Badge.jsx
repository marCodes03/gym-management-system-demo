/**
 * Mad Max Gym — Semantic Status & Plan Type Pill Badge
 */

const VARIANT_STYLES = {
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  rose: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-600',
  },
  royal: {
    pill: 'bg-blue-50 text-royal-blue-dark border-blue-200',
    dot: 'bg-royal-blue',
  },
  gunmetal: {
    pill: 'bg-silver-canvas text-gunmetal-gray border-silver-border',
    dot: 'bg-gunmetal-gray',
  },
};

const STATUS_TO_VARIANT = {
  ACTIVE: 'emerald',
  GRANTED: 'emerald',
  COMPLETED: 'emerald',
  EXPIRING_SOON: 'amber',
  FROZEN: 'amber',
  WARNING: 'amber',
  EXPIRED: 'rose',
  DENIED: 'rose',
  DENIED_EXPIRED: 'rose',
  DENIED_FROZEN: 'rose',
  DENIED_NO_PLAN: 'rose',
  VOIDED: 'rose',
  CANCELLED: 'rose',
  INACTIVE: 'rose',
  RECURRING: 'royal',
  SESSION_PACK: 'royal',
  ADMIN: 'royal',
  DAY_PASS: 'gunmetal',
  FRONT_DESK: 'gunmetal',
  NONE: 'gunmetal',
};

const DEFAULT_LABELS = {
  ACTIVE: 'Active',
  GRANTED: 'Granted',
  COMPLETED: 'Completed',
  EXPIRING_SOON: 'Expiring Soon',
  FROZEN: 'Frozen',
  EXPIRED: 'Expired',
  DENIED: 'Denied',
  DENIED_EXPIRED: 'Expired',
  DENIED_FROZEN: 'Frozen',
  DENIED_NO_PLAN: 'No Plan',
  VOIDED: 'Voided',
  CANCELLED: 'Cancelled',
  INACTIVE: 'Inactive',
  RECURRING: 'Recurring',
  SESSION_PACK: 'Visit Pack',
  DAY_PASS: 'Day Pass',
  ADMIN: 'Owner / Admin',
  FRONT_DESK: 'Front Desk',
};

export default function Badge({
  status,
  variant,
  children,
  dot = false,
  mono = false,
  className = '',
}) {
  const normalizedStatus =
    typeof status === 'string' ? status.toUpperCase().replace(/\s+/g, '_') : '';
  const resolvedVariant =
    variant || STATUS_TO_VARIANT[normalizedStatus] || 'gunmetal';
  const style = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.gunmetal;

  const content =
    children !== undefined
      ? children
      : DEFAULT_LABELS[normalizedStatus] || status || '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap ${
        style.pill
      } ${mono ? 'font-mono tabular-nums' : ''} ${className}`}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
          aria-hidden="true"
        />
      ) : null}
      {content}
    </span>
  );
}
