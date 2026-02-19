import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, GripVertical, Send, X } from "lucide-react";
import { useRoomStore } from "../../stores/room.store";
import { useLabels, t } from "@/i18n";
import { MarkdownViewer } from "./test-modal/markdown-viewer";
import { CodeEditor } from "./test-modal/code-editor";

/* ─────────────────────────────────────────────
 * TestModal
 * ─────────────────────────────────────────────
 * Timed assessment modal with a resizable
 * split-pane layout:
 *
 *   Left:  question (Markdown)
 *   Right: answer (Monaco editor or textarea)
 *
 * Editor mode is determined by the assessment
 * language field — known programming languages
 * render Monaco; everything else renders a
 * plain textarea.
 *
 * Auto-submits when the timer expires. Uses a
 * ref to track the latest answer so the timer
 * callback never reads a stale closure.
 * ───────────────────────────────────────────── */

interface TestModalProps {
  isOpen: boolean;
  question: string;
  timeLimit: number;
  language: string;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

/** Languages that should render the Monaco code editor. */
const CODE_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "python",
  "java",
  "cpp",
  "c++",
  "csharp",
  "c#",
  "go",
  "rust",
  "ruby",
  "php",
  "kotlin",
  "swift",
  "scala",
  "r",
  "sql",
  "html",
  "css",
]);

function isCodeLanguage(language: string): boolean {
  return CODE_LANGUAGES.has(language.toLowerCase().trim());
}

export function TestModal({
  isOpen,
  question,
  timeLimit,
  language,
  onSubmit,
  onClose,
}: TestModalProps) {
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [splitPercent, setSplitPercent] = useState(42);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerRef = useRef(answer);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const agent = useRoomStore((s) => s.agent);
  const locale = agent?.voice.languageCode ?? "en-US";
  const { room: { testModal: l }, common: c } = useLabels(locale);

  const useCodeEditor = isCodeLanguage(language);

  // Keep ref in sync
  answerRef.current = answer;

  /* ── Timer ── */

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    clearTimer();
    setShowConfirmation(false);
    onSubmit(answerRef.current);
    setAnswer("");
  }, [clearTimer, onSubmit]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(timeLimit);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isOpen, timeLimit, handleSubmit, clearTimer]);

  /* ── Resizable split pane ── */

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.min(Math.max(percent, 25), 75));
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft < 60;
  const timePercent = (timeLeft / timeLimit) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="mx-4 flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-card border border-border-strong bg-surface-modal shadow-card">
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface-overlay/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-button bg-primary-light">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-text">
                {l.assessment}
              </h2>
              <p className="text-xs text-text-muted">
                {useCodeEditor ? language : l.writtenResponse}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-sm font-semibold ${
                  isLow
                    ? "bg-error/15 text-error"
                    : "bg-primary-light text-primary"
                }`}
              >
                <Clock size={15} />
                <span>
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </span>
              </div>
              {/* Progress bar */}
              <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface sm:block">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    isLow ? "bg-error" : "bg-primary"
                  }`}
                  style={{ width: `${timePercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Split pane content ── */}
        <div
          ref={containerRef}
          className="flex min-h-0 flex-1"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Left: Question */}
          <div
            className="min-h-0 overflow-hidden border-r border-border bg-surface-raised"
            style={{ width: `${splitPercent}%` }}
          >
            <MarkdownViewer content={question} />
          </div>

          {/* Divider handle */}
          <div
            className="group flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center bg-surface transition-colors hover:bg-primary/10"
            onPointerDown={handlePointerDown}
          >
            <GripVertical
              size={14}
              className="text-text-muted transition-colors group-hover:text-primary"
            />
          </div>

          {/* Right: Editor */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {useCodeEditor ? (
              <CodeEditor
                value={answer}
                onChange={setAnswer}
                language={language}
              />
            ) : (
              <div className="flex h-full flex-col p-4">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={l.answerPlaceholder}
                  className="min-h-0 flex-1 resize-none rounded-input border border-border-strong bg-surface p-4 font-sans text-sm leading-relaxed text-text placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-surface/60 px-6 py-4">
          <p className="text-xs text-text-muted">
            {isLow
              ? l.lessThanMinute
              : t(l.minutesRemaining, { n: minutes })}
          </p>
          <button
            type="button"
            onClick={() => setShowConfirmation(true)}
            className="flex items-center gap-2 rounded-button bg-primary px-6 py-2.5 text-sm font-semibold text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
          >
            <Send size={16} />
            {c.submit}
          </button>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-strong bg-surface-modal p-6 shadow-card">
            <h3 className="font-display text-lg font-bold text-text">
              {l.confirmSubmission}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {l.confirmSubmissionMessage}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="rounded-button px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-overlay hover:text-text"
              >
                {c.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-button bg-primary px-5 py-2 text-sm font-semibold text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
              >
                {c.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
