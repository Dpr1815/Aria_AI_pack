/* ─────────────────────────────────────────────────────────
 * Pagination — simple prev/next with page count
 * ───────────────────────────────────────────────────────── */

import type { PaginationMeta } from "../../types/analytics.types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <button
        onClick={() => onPageChange(meta.page - 1)}
        disabled={!meta.hasPrevPage}
        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <ChevronLeft size={15} />
      </button>

      <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] tabular-nums">
        {meta.page} / {meta.totalPages}
      </span>

      <button
        onClick={() => onPageChange(meta.page + 1)}
        disabled={!meta.hasNextPage}
        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
