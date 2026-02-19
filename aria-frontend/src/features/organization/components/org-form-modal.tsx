/* ─────────────────────────────────────────────────────────
 * OrgFormModal — Create / Edit organization
 * ───────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels } from "@/i18n";
import { cn } from "@/utils";
import type { Organization } from "../types";

interface OrgFormModalProps {
  /** If provided, modal is in "edit" mode with pre-filled values. */
  organization?: Organization;
  isPending: boolean;
  error?: string | null;
  onSubmit: (data: { name: string; logoUrl?: string }) => void;
  onClose: () => void;
}

export function OrgFormModal({
  organization,
  isPending,
  error,
  onSubmit,
  onClose,
}: OrgFormModalProps) {
  const { organization: l, common: c } = useLabels();
  const isEdit = !!organization;

  const [name, setName] = useState(organization?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(organization?.logoUrl ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const nameRef = useRef<HTMLInputElement>(null);

  /* Focus first input on mount */
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function validate(): boolean {
    const errors: Record<string, string | undefined> = {};
    if (!name.trim()) errors.name = l.validation.nameRequired;
    if (logoUrl.trim() && !/^https?:\/\/.+/.test(logoUrl.trim())) {
      errors.logoUrl = "Invalid URL format";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      logoUrl: logoUrl.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-[min(28rem,90vw)]",
          "rounded-card border border-border bg-surface-modal shadow-card",
          "animate-[scale-fade-in_250ms_ease-out]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text">
            {isEdit ? l.form.editTitle : l.form.createTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-button p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <Input
            ref={nameRef}
            label={l.form.name}
            placeholder={l.form.namePlaceholder}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            error={fieldErrors.name}
          />

          <Input
            label={l.form.logoUrl}
            placeholder={l.form.logoUrlPlaceholder}
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setFieldErrors((p) => ({ ...p, logoUrl: undefined }));
            }}
            error={fieldErrors.logoUrl}
          />

          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {c.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? l.form.saving : c.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
