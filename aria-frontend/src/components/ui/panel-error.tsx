/* ─────────────────────────────────────────────────────────
 * PanelError — inline error banner for panel mutations
 *
 * Reads the error from a TanStack Query mutation result.
 * Auto-dismisses after 8s, or can be closed manually.
 * Renders nothing when there's no error.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/utils";
import { getErrorMessage } from "@/lib/api-error";

interface PanelErrorProps {
  /** Pass one or more mutation error values. First truthy one wins. */
  errors: (unknown | null | undefined)[];
  /** Optional className for outer wrapper. */
  className?: string;
}

export function PanelError({ errors, className }: PanelErrorProps) {
  const activeError = errors.find(Boolean) ?? null;
  const message = activeError ? getErrorMessage(activeError) : null;

  const [dismissed, setDismissed] = useState(false);

  /* Reset dismissed state when a new error arrives */
  useEffect(() => {
    if (message) setDismissed(false);
  }, [message]);

  /* Auto-dismiss after 8s */
  useEffect(() => {
    if (!message || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(timer);
  }, [message, dismissed]);

  if (!message || dismissed) return null;

  return (
    <div
      className={cn(
        "mx-[var(--panel-px)] mt-2 flex items-start gap-2.5",
        "rounded-input border border-error/30 bg-error/8 px-3 py-2.5",
        "animate-[scale-fade-in_200ms_ease-out]",
        className,
      )}
      role="alert"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-error" />
      <p
        className="min-w-0 flex-1 text-error"
        style={{ fontSize: "var(--pt-sm)" }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-lg p-0.5 text-error/60 transition-colors hover:text-error"
        aria-label="Dismiss error"
      >
        <X size={14} />
      </button>
    </div>
  );
}
