/* ─────────────────────────────────────────────────────────
 * SessionVideoPlayer — step-based video playback
 *
 * Renders a native <video> element with step navigation
 * chips. Steps are ordered by conversation sequence.
 * Auto-advances to the next step when a video ends.
 * ───────────────────────────────────────────────────────── */

import { useState, useRef, useCallback, useMemo } from "react";
import { Video, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  videoUrls: Record<string, string>;
  /** Ordered step keys from conversation (used to sort the chips) */
  orderedSteps: string[];
}

export function SessionVideoPlayer({ videoUrls, orderedSteps }: Props) {
  /* Only keep steps that have a video URL */
  const steps = useMemo(() => {
    const withVideo = orderedSteps.filter((s) => videoUrls[s]);
    /* If orderedSteps didn't cover every key, append the rest */
    const remaining = Object.keys(videoUrls).filter(
      (k) => !withVideo.includes(k),
    );
    return [...withVideo, ...remaining];
  }, [videoUrls, orderedSteps]);

  const [activeIdx, setActiveIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeStep = steps[activeIdx];
  const src = activeStep ? videoUrls[activeStep] : undefined;

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= steps.length) return;
      setActiveIdx(idx);
    },
    [steps.length],
  );

  const handleEnded = useCallback(() => {
    if (activeIdx < steps.length - 1) {
      goTo(activeIdx + 1);
    }
  }, [activeIdx, steps.length, goTo]);

  if (steps.length === 0) return null;

  return (
    <section
      className="panel-section !p-0 overflow-hidden"
      style={{ animation: "scale-fade-in 0.25s var(--ease-out) both" }}
    >
      {/* ── Header ── */}
      <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video size={14} className="text-[var(--color-primary)]" />
          <h3
            className="text-[length:var(--text-sm)] font-semibold tracking-[var(--tracking-tight)] text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Session Recording
          </h3>
        </div>

        {/* ── Prev / Next ── */}
        {steps.length > 1 && (
          <div className="flex items-center gap-1">
            <NavButton
              disabled={activeIdx === 0}
              onClick={() => goTo(activeIdx - 1)}
            >
              <ChevronLeft size={14} />
            </NavButton>
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] tabular-nums px-1">
              {activeIdx + 1} / {steps.length}
            </span>
            <NavButton
              disabled={activeIdx === steps.length - 1}
              onClick={() => goTo(activeIdx + 1)}
            >
              <ChevronRight size={14} />
            </NavButton>
          </div>
        )}
      </div>

      {/* ── Video ── */}
      <div className="relative bg-black aspect-video">
        {src ? (
          <video
            ref={videoRef}
            key={src}
            src={src}
            controls
            autoPlay
            onEnded={handleEnded}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Video
              size={36}
              className="text-[var(--color-text-muted)] opacity-40"
            />
          </div>
        )}
      </div>

      {/* ── Step chips ── */}
      {steps.length > 1 && (
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.04)] flex gap-2 overflow-x-auto">
          {steps.map((step, i) => (
            <button
              key={step}
              onClick={() => goTo(i)}
              className={`
                shrink-0 px-3 py-1.5 rounded-full text-[length:var(--text-xs)] font-medium
                transition-all duration-[var(--duration-fast)] capitalize
                ${
                  i === activeIdx
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[rgba(249,115,22,0.2)]"
                    : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-secondary)] border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text)]"
                }
              `}
            >
              {formatStepName(step)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Small nav button ──────────────────────────────────── */

function NavButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        flex items-center justify-center w-7 h-7 rounded-[var(--radius-input)]
        transition-all duration-[var(--duration-fast)]
        ${
          disabled
            ? "text-[var(--color-text-muted)] opacity-40 cursor-not-allowed"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)]"
        }
      `}
    >
      {children}
    </button>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function formatStepName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim();
}
