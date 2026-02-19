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
  if (!isOpen) return null;
  const { room: t } = useLabels(locale);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80">
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          {t.room.confirmTitle}
        </h3>
        <p className="mb-6 text-gray-700">{t.room.confirmMessage}</p>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
          >
            {t.room.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white transition hover:from-blue-700 hover:to-purple-700"
          >
            {t.room.confirmSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
