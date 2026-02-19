/* ─────────────────────────────────────────────────────────
 * MarkdownTextField — textarea with edit/preview toggle
 *
 * Detects or accepts markdown content. Shows a toggle
 * between raw editing and rendered preview using the
 * existing MarkdownViewer component.
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { Pencil, Eye } from "lucide-react";
import { cn } from "@/utils";
import { MarkdownViewer } from "@/features/room/components/modals/test-modal/markdown-viewer";

type Mode = "edit" | "preview";

interface MarkdownTextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

/** Heuristic: does this string look like it contains markdown? */
export function looksLikeMarkdown(value: string): boolean {
  if (value.length < 30) return false;
  return /(?:^#{1,4}\s|\*\*|__|\n-\s|\n\d+\.\s|```|^\|.+\|$|\[.+\]\(.+\))/m.test(
    value,
  );
}

export function MarkdownTextField({
  label,
  value,
  onChange,
  rows = 12,
  placeholder,
  className,
}: MarkdownTextFieldProps) {
  const [mode, setMode] = useState<Mode>("edit");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* ── Label + toggle row ── */}
      <div className="flex items-center justify-between">
        {label && <label className="panel-field-label">{label}</label>}

        <div className="flex rounded-button bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn(
              "flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-2.5 py-1",
              "transition-all duration-150",
              mode === "edit"
                ? "bg-primary/90 text-text-inverse shadow-sm"
                : "text-text-muted hover:text-text",
            )}
            style={{ fontSize: "var(--pt-xs)" }}
          >
            <Pencil size={11} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-2.5 py-1",
              "transition-all duration-150",
              mode === "preview"
                ? "bg-primary/90 text-text-inverse shadow-sm"
                : "text-text-muted hover:text-text",
            )}
            style={{ fontSize: "var(--pt-xs)" }}
          >
            <Eye size={11} />
            Preview
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            "w-full resize-y rounded-input border border-border bg-surface px-3 py-2.5",
            "panel-field-mono text-text placeholder:text-text-muted",
            "outline-none transition-[border-color,box-shadow] duration-200 ease-out",
            "focus:border-primary focus:ring-1 focus:ring-primary/40",
          )}
        />
      ) : (
        <div
          className={cn(
            "overflow-y-auto rounded-input border border-border bg-surface",
          )}
          style={{ minHeight: `${rows * 1.5}rem`, maxHeight: `${rows * 2}rem` }}
        >
          {value.trim() ? (
            <MarkdownViewer content={value} />
          ) : (
            <p
              className="p-4 italic text-text-muted"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              Nothing to preview
            </p>
          )}
        </div>
      )}
    </div>
  );
}
