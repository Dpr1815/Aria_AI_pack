/* ─────────────────────────────────────────────────────────
 * TableSkeleton — loading state for tables/lists
 * ───────────────────────────────────────────────────────── */

interface Props {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: Props) {
  return (
    <div className="panel-section !p-0 overflow-hidden">
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-[rgba(255,255,255,0.03)]"
          >
            <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div
                className="h-3 rounded bg-[rgba(255,255,255,0.05)] animate-pulse"
                style={{ width: `${55 + Math.random() * 25}%` }}
              />
              <div
                className="h-2.5 rounded bg-[rgba(255,255,255,0.03)] animate-pulse"
                style={{ width: `${30 + Math.random() * 20}%` }}
              />
            </div>
            <div className="w-16 h-5 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
