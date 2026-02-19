import { useCallback } from "react";
import type { SpeechControlsProps } from "../../types";
import { useLabels } from "@/i18n";
import { useRoomStore } from "../../stores/room.store";

/* ─────────────────────────────────────────────
 * SpeechControls
 * ─────────────────────────────────────────────
 * Toggle microphone button: tap to start, tap to stop.
 *
 * States:
 *  - idle:       primary bg, mic icon, ready
 *  - recording:  error bg + pulse, stop icon
 *  - processing: muted bg, spinner
 *  - aiPlaying:  primary bg dimmed, mic icon,
 *                disabled (wait for AI to finish)
 * ───────────────────────────────────────────── */

export function SpeechControls({
  isRecording,
  isProcessing,
  isLoading,
  isAiPlaying,
  disabled,
  onPressStart,
  onPressEnd,
}: SpeechControlsProps) {
  const locale = useRoomStore((s) => s.agent?.voice.languageCode);
  const { room: { speechControls: l } } = useLabels(locale);

  const isProcessingResponse = isLoading || isProcessing;
  const isBlocked = disabled || isProcessingResponse || isAiPlaying;

  const handleClick = useCallback(() => {
    if (isBlocked) return;

    if (isRecording) {
      onPressEnd();
    } else {
      onPressStart();
    }
  }, [isBlocked, isRecording, onPressStart, onPressEnd]);

  const getStatusLabel = () => {
    if (isRecording) return l.tapToStop;
    if (isProcessingResponse) return l.processing;
    if (isAiPlaying) return l.aiSpeaking;
    return l.tapToSpeak;
  };

  return (
    <div className="flex justify-center">
      <div
        className="relative select-none"
        style={{ WebkitTouchCallout: "none" }}
      >
        <div className="relative h-20 w-20">
          {/* Pulse ring — recording only */}
          {isRecording && (
            <div className="absolute inset-0 animate-ping rounded-full bg-error/30" />
          )}

          {/* Outer glow */}
          <div
            className={`absolute inset-0 rounded-full blur-sm transition-colors duration-300 ${
              isRecording
                ? "bg-error/20"
                : isProcessingResponse
                  ? "bg-text-muted/10"
                  : isAiPlaying
                    ? "bg-primary/10"
                    : "bg-primary/15"
            }`}
          />

          {/* Track circle */}
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle
              className={`stroke-current transition-colors duration-300 ${
                isRecording
                  ? "text-error/40"
                  : isProcessingResponse
                    ? "text-border"
                    : isAiPlaying
                      ? "text-primary/20"
                      : "text-primary/30"
              }`}
              strokeWidth="4"
              cx="50"
              cy="50"
              r="47"
              fill="none"
            />
          </svg>

          {/* Inner ring */}
          <div
            className={`absolute inset-1 rounded-full shadow-inner transition-colors duration-300 ${
              isRecording ? "bg-error/10" : "bg-surface-overlay/90"
            }`}
          />

          {/* Button */}
          <button
            type="button"
            disabled={isBlocked}
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute inset-2 z-10 flex items-center justify-center rounded-full shadow-card transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none ${
              isRecording
                ? "scale-95 bg-error shadow-glow"
                : isProcessingResponse
                  ? "bg-surface-overlay opacity-50"
                  : isAiPlaying
                    ? "bg-primary/40 opacity-60 cursor-not-allowed"
                    : "bg-primary hover:bg-primary-hover hover:shadow-glow"
            }`}
            style={{ WebkitTouchCallout: "none" }}
            aria-label={isRecording ? l.stopRecording : l.startRecording}
          >
            {isProcessingResponse ? (
              <SpinnerIcon />
            ) : isRecording ? (
              <StopIcon />
            ) : (
              <MicIcon />
            )}
          </button>
        </div>

        {/* Status label */}
        <p
          className={`mt-2 text-center text-xs font-medium transition-colors duration-300 ${
            isRecording
              ? "text-error"
              : isProcessingResponse
                ? "text-text-muted"
                : isAiPlaying
                  ? "text-primary/60"
                  : "text-text-secondary"
          }`}
        >
          {getStatusLabel()}
        </p>
      </div>
    </div>
  );
}

/* ── Icons ── */

function SpinnerIcon() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-text-muted"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-text-inverse"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100 2h-3v-2.07z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-text-inverse"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
