/* ─────────────────────────────────────────────────────────
 * EmptyState — centered placeholder for empty tabs
 * ───────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-3"
      style={{ animation: "scale-fade-in 0.3s var(--ease-out) both" }}
    >
      <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
        <Icon size={22} className="text-[var(--color-text-muted)]" />
      </div>
      <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
        {title}
      </p>
      <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] max-w-[280px] text-center leading-[var(--leading-normal)]">
        {description}
      </p>
    </div>
  );
}
