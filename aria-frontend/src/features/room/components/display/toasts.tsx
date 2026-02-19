import { useEffect } from "react";
import { AlertTriangle, XCircle, X } from "lucide-react";
import { useRoomStore } from "../../stores/room.store";
import { useLabels } from "@/i18n";
import { TOAST_DURATION_MS } from "../../constants";

/* ─────────────────────────────────────────────
 * ErrorToast / WarningToast
 * ─────────────────────────────────────────────
 * Auto-dismissing toast notifications.
 * Read locale from the store — no prop needed.
 * ───────────────────────────────────────────── */

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorToast({ isOpen, onClose }: ToastProps) {
  const agent = useRoomStore((s) => s.agent);
  const locale = agent?.voice.languageCode ?? "en-US";
  const { room: labels } = useLabels(locale);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[10000] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-card border border-error/20 bg-error/10 px-5 py-3 shadow-card backdrop-blur-sm">
        <XCircle className="h-5 w-5 flex-shrink-0 text-error" />
        <p className="text-sm font-medium text-error">{labels.errorGeneric}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-full p-1 text-error/60 transition hover:bg-error/10 hover:text-error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function WarningToast({ isOpen, onClose }: ToastProps) {
  const agent = useRoomStore((s) => s.agent);
  const locale = agent?.voice.languageCode ?? "en-US";
  const { room: labels } = useLabels(locale);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[10000] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-card border border-warning/20 bg-warning/10 px-5 py-3 shadow-card backdrop-blur-sm">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
        <p className="text-sm font-medium text-warning">{labels.warningWait}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-full p-1 text-warning/60 transition hover:bg-warning/10 hover:text-warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
