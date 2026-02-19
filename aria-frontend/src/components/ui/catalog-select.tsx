/* ─────────────────────────────────────────────────────────
 * CatalogSelect — styled dropdown for catalog items
 *
 * Shows a custom dropdown with name + description for each
 * option. Designed for the panel design system.
 * ───────────────────────────────────────────────────────── */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Loader2, X } from "lucide-react";
import { cn } from "@/utils";

export interface CatalogOption {
  id: string;
  name: string;
  description: string;
}

interface CatalogSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: CatalogOption[] | undefined;
  isLoading?: boolean;
  placeholder?: string;
  clearable?: boolean;
}

export function CatalogSelect({
  label,
  value,
  onChange,
  options,
  isLoading,
  placeholder = "Select…",
  clearable,
}: CatalogSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options?.find((o) => o.id === value);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <span className="panel-field-label">{label}</span>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex w-full items-center gap-2 rounded-input border bg-surface px-3 py-2.5 text-left",
          "transition-[border-color,box-shadow] duration-200 ease-out",
          open
            ? "border-primary ring-1 ring-primary/40"
            : "border-border hover:border-border-strong",
        )}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin text-text-muted" />
        ) : selected ? (
          <div className="min-w-0 flex-1">
            <span
              className="block truncate text-text"
              style={{ fontSize: "var(--pt-base)" }}
            >
              {selected.name}
            </span>
          </div>
        ) : (
          <span
            className="flex-1 text-text-muted"
            style={{ fontSize: "var(--pt-base)" }}
          >
            {placeholder}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {clearable && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }
              }}
              className="rounded p-0.5 text-text-muted transition-colors hover:text-text"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={cn(
              "text-text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-30 mt-1",
            "max-h-[14rem] overflow-y-auto",
            "rounded-input border border-border bg-surface-overlay shadow-card",
            "animate-[scale-fade-in_150ms_ease-out]",
          )}
        >
          {!options || options.length === 0 ? (
            <p
              className="px-3 py-4 text-center text-text-muted"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              No options available
            </p>
          ) : (
            options.map((opt) => {
              const isActive = opt.id === value;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left",
                    "transition-colors duration-100",
                    isActive ? "bg-primary-light" : "hover:bg-surface-raised",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium",
                        isActive ? "text-primary" : "text-text",
                      )}
                      style={{ fontSize: "var(--pt-base)" }}
                    >
                      {opt.name}
                    </p>
                    <p
                      className="mt-0.5 text-text-muted"
                      style={{ fontSize: "var(--pt-xs)" }}
                    >
                      {opt.description}
                    </p>
                  </div>
                  {isActive && (
                    <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
