import { useLabels } from "@/i18n";
import type { Locale } from "../../types";

interface ConfirmationDialogProps {
  isOpen: boolean;
  locale: Locale;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  locale,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const { room: t } = useLabels(locale);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80">
      <div className="mx-4 w-full max-w-md rounded-card border border-border bg-surface-modal p-6 shadow-card">
        <h3 className="mb-4 text-xl font-bold text-text">
          {t.room.confirmTitle}
        </h3>
        <p className="mb-6 text-text-secondary">{t.room.confirmMessage}</p>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-button bg-surface-raised px-4 py-2 font-medium text-text-secondary transition hover:bg-surface-overlay"
          >
            {t.room.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-button bg-primary px-4 py-2 font-medium text-text-inverse shadow-glow transition hover:bg-primary-hover"
          >
            {t.room.confirmSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
