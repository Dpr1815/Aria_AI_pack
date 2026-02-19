import { X, Plus } from "lucide-react";
import { cn } from "@/utils";
import {
  MarkdownTextField,
  looksLikeMarkdown,
} from "@/components/ui/markdown-text-field";

/* ── Helpers ─────────────────────────────────────────────── */

/** Heuristic: strings >120 chars or containing newlines → textarea. */
function isLongText(value: string): boolean {
  return value.length > 120 || value.includes("\n");
}

/** Convert a camelCase / snake_case key to a readable label. */
function toLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Props ───────────────────────────────────────────────── */

interface DynamicFieldProps {
  fieldKey: string;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
  hideLabel?: boolean;
}

/* ── Component ───────────────────────────────────────────── */

export function DynamicField({
  fieldKey,
  value,
  onChange,
  depth = 0,
  hideLabel = false,
}: DynamicFieldProps) {
  const label = toLabel(fieldKey);

  /* ── String ─────────────────────────────────────────────── */
  if (typeof value === "string") {
    const long = isLongText(value);
    const markdown = long && looksLikeMarkdown(value);

    /* Markdown string → edit/preview toggle */
    if (markdown) {
      return (
        <MarkdownTextField
          label={hideLabel ? undefined : label}
          value={value}
          onChange={(v) => onChange(v)}
          rows={8}
        />
      );
    }

    /* Long text → plain textarea */
    if (long) {
      return (
        <div className="flex flex-col gap-1.5">
          {!hideLabel && <label className="panel-field-label">{label}</label>}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className={cn(
              "w-full resize-y rounded-input border border-border bg-surface px-3 py-2",
              "panel-field-mono text-text placeholder:text-text-muted",
              "outline-none transition-[border-color,box-shadow] duration-200 ease-out",
              "focus:border-primary focus:ring-1 focus:ring-primary/40",
            )}
          />
        </div>
      );
    }

    /* Short string → single-line input */
    return (
      <div className="flex flex-col gap-1.5">
        {!hideLabel && <label className="panel-field-label">{label}</label>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-input border border-border bg-surface px-3 py-2",
            "panel-field-input text-text placeholder:text-text-muted",
            "outline-none transition-[border-color,box-shadow] duration-200 ease-out",
            "focus:border-primary focus:ring-1 focus:ring-primary/40",
          )}
        />
      </div>
    );
  }

  /* ── Number ─────────────────────────────────────────────── */
  if (typeof value === "number") {
    return (
      <div className="flex flex-col gap-1.5">
        {!hideLabel && <label className="panel-field-label">{label}</label>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "w-full rounded-input border border-border bg-surface px-3 py-2",
            "panel-field-input text-text",
            "outline-none transition-[border-color,box-shadow] duration-200 ease-out",
            "focus:border-primary focus:ring-1 focus:ring-primary/40",
          )}
        />
      </div>
    );
  }

  /* ── Boolean ────────────────────────────────────────────── */
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 py-1">
        {!hideLabel && <span className="panel-toggle-label">{label}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
            "transition-colors duration-200",
            value ? "bg-primary" : "bg-surface-overlay",
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm",
              "transition-transform duration-200",
              value ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
    );
  }

  /* ── Array ──────────────────────────────────────────────── */
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-2">
        {!hideLabel && <span className="panel-field-label">{label}</span>}
        <div className="flex flex-col gap-2">
          {value.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                <DynamicField
                  fieldKey={`${fieldKey}_${idx}`}
                  value={item}
                  onChange={(v) => {
                    const next = [...value];
                    next[idx] = v;
                    onChange(next);
                  }}
                  depth={depth + 1}
                  hideLabel
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className={cn(
                  "mt-1.5 rounded-button p-1.5",
                  "text-text-muted transition-colors",
                  "hover:bg-surface hover:text-error",
                )}
                aria-label="Remove item"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className={cn(
            "flex items-center gap-1.5 self-start rounded-button px-3 py-1.5",
            "font-medium text-text-secondary",
            "border border-dashed border-border-strong",
            "transition-colors hover:border-primary hover:text-primary",
          )}
          style={{ fontSize: "var(--pt-xs)" }}
        >
          <Plus size={12} />
          Add item
        </button>
      </div>
    );
  }

  /* ── Object (recursive) ────────────────────────────────── */
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);

    return (
      <div
        className={cn(
          "flex flex-col gap-4",
          depth > 0 && "rounded-card border border-border bg-surface/50 p-4",
        )}
      >
        {depth > 0 && !hideLabel && <p className="panel-label">{label}</p>}
        {entries.map(([k, v]) => (
          <DynamicField
            key={k}
            fieldKey={k}
            value={v}
            onChange={(newV) => {
              onChange({ ...(value as Record<string, unknown>), [k]: newV });
            }}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  /* ── Fallback ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-1.5">
      {!hideLabel && <label className="panel-field-label">{label}</label>}
      <p
        className="italic text-text-muted"
        style={{ fontSize: "var(--pt-xs)" }}
      >
        Unsupported type
      </p>
    </div>
  );
}
