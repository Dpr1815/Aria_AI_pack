import { useCallback } from "react";
import { useRoomStore } from "../../stores/room.store";
import { useLabels } from "@/i18n";

/* ─────────────────────────────────────────────
 * ConclusionModal
 * ─────────────────────────────────────────────
 * Shown when the conversation is complete.
 * Offers a button to close the browser tab.
 *
 * Note: window.close() only works on tabs that
 * were opened via script (window.open). For tabs
 * opened by the user directly, browsers silently
 * ignore the call — the fallback message handles
 * that gracefully.
 * ───────────────────────────────────────────── */

interface ConclusionModalProps {
  isOpen: boolean;
}

export function ConclusionModal({ isOpen }: ConclusionModalProps) {
  const agent = useRoomStore((s) => s.agent);
  const locale = agent?.voice.languageCode ?? "en-US";
  const { room: l } = useLabels(locale);

  const handleClose = useCallback(() => {
    window.location.href = "/";
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-card border border-border-strong bg-surface-modal shadow-card">
        <div className="px-8 pb-8 pt-10 text-center">
          {/* Check icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light shadow-glow">
            <svg
              className="h-10 w-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="conclusion-check-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="font-display text-2xl font-bold text-text">
            {l.conclusionTitle}
          </h2>

          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-text-secondary">
            {l.conclusionMessage}
          </p>

          <div className="mx-auto my-6 h-px w-16 bg-border-strong" />

          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-button bg-primary px-6 py-3 font-semibold text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
          >
            {l.conclusion.closeWindow}
          </button>

          <p className="mt-3 text-xs text-text-muted">
            {l.conclusion.safeToClose}
          </p>
        </div>
      </div>
    </div>
  );
}
