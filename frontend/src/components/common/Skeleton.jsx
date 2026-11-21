/**
 * Mad Max Gym — Metallic Silver-Gray Shimmer Skeleton Loaders
 * Replaces raw "Loading..." text across tables, cards, and KPI grids.
 */

export function Skeleton({ className = 'h-4 w-full rounded-md' }) {
  return <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />;
}

export function KpiSkeleton({ count = 4, className = '' }) {
  return (
    <div
      aria-busy="true"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      <span className="sr-only">Loading metrics</span>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="card-metallic rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3, className = '' }) {
  return (
    <div
      aria-busy="true"
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
    >
      <span className="sr-only">Loading cards</span>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="card-metallic rounded-xl p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-1/2 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
          <div className="pt-3 border-t border-silver-border/60 flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5, className = '' }) {
  return (
    <div
      aria-busy="true"
      className={`card-metallic rounded-xl overflow-hidden ${className}`}
    >
      <span className="sr-only">Loading table rows</span>
      {/* Header bar */}
      <div className="border-b border-silver-border bg-silver-canvas/70 px-5 py-3.5 grid gap-4"
           style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, cIdx) => (
          <Skeleton key={cIdx} className="h-3 w-20 rounded" />
        ))}
      </div>

      {/* Body rows */}
      <div className="divide-y divide-silver-border/70">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="px-5 py-4 grid gap-4 items-center"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-4 rounded ${
                  cIdx === 0
                    ? 'w-4/5'
                    : cIdx === columns - 1
                    ? 'w-16 ml-auto'
                    : 'w-3/5'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
