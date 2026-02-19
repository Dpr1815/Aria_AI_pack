import { useState, useCallback, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  HelpCircle,
  MessageCircle,
  Mic,
  Shield,
  X,
} from "lucide-react";
import { useRoomStore } from "../../stores/room.store";
import { useLabels } from "@/i18n";
import type { RoomLabels } from "@/i18n";

/* ─────────────────────────────────────────────
 * TutorialModal
 * ─────────────────────────────────────────────
 * Multi-step onboarding:
 *  Step -1: Device permissions (camera + mic)
 *  Step  0: Voice interaction guide
 *  Step  1: Chat history guide
 *  Step  2: Report explanation
 * ───────────────────────────────────────────── */

interface TutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function TutorialModal({ isOpen, onComplete }: TutorialModalProps) {
  const [step, setStep] = useState(-1);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const agent = useRoomStore((s) => s.agent);
  const locale = agent?.voice.languageCode ?? "en-US";
  const { common: c, room: { tutorial: t } } = useLabels(locale);

  useEffect(() => {
    if (isOpen) setStep(-1);
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (!isOpen) return null;

  const TOTAL_STEPS = 3;
  const stepDots = [-1, 0, 1, 2];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl p-4">
        <div className="w-full overflow-hidden rounded-card border border-border-strong bg-surface-modal shadow-card">
          {/* ── Header ── */}
          <div className="relative flex items-center justify-between border-b border-border bg-surface-overlay/60 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-lg font-semibold text-text">
                  {t.header.welcome}
                </h1>
                <p className="text-sm text-text-muted">{t.header.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-full p-2 text-text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-text"
              aria-label={c.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-8">
            {/* Step heading */}
            <div className="mb-8 text-center">
              <h2 className="font-display text-xl font-semibold text-text">
                {step === -1 ? t.deviceSetup.title : getStepTitle(step, t)}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                {step === -1
                  ? t.deviceSetup.subtitle
                  : getStepDescription(step, t)}
              </p>
            </div>

            {/* Step body */}
            <div className="mx-auto flex w-full max-w-2xl items-center justify-center">
              {step === -1 ? (
                <PermissionsStep
                  labels={t.permissions}
                  errorFallback={t.deviceSetup.subtitle}
                  onGranted={() => setPermissionsGranted(true)}
                />
              ) : (
                <StepContent step={step} t={t} />
              )}
            </div>
          </div>

          {/* ── Footer navigation ── */}
          <div className="flex items-center justify-between border-t border-border bg-surface/60 px-6 py-4">
            <div className="w-28">
              {step > -1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 rounded-button px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-overlay hover:text-text"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t.buttons.back}
                </button>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {stepDots.map((i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? "h-2.5 w-6 bg-primary"
                      : i < step
                        ? "h-2.5 w-2.5 bg-primary/40"
                        : "h-2.5 w-2.5 bg-border-strong"
                  }`}
                />
              ))}
            </div>

            <div className="flex w-28 justify-end">
              {step === -1 && permissionsGranted && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
                >
                  {t.buttons.tutorial}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {step >= 0 && step < TOTAL_STEPS - 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="flex items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
                >
                  {t.buttons.next}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {step === TOTAL_STEPS - 1 && (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-glow transition-colors duration-200 hover:bg-primary-hover"
                >
                  {t.buttons.startInterview}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Permissions step ── */

function PermissionsStep({
  labels,
  errorFallback,
  onGranted,
}: {
  labels: RoomLabels["tutorial"]["permissions"];
  errorFallback: string;
  onGranted: () => void;
}) {
  const [micOk, setMicOk] = useState(false);
  const [camOk, setCamOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMicOk(true);
      setCamOk(true);
      stream.getTracks().forEach((tr) => tr.stop());
      onGranted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errorFallback,
      );
    }
  }, [onGranted, errorFallback]);

  const allGranted = micOk && camOk;

  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-surface-raised p-6">
      <div className="mb-5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
          <Shield className="h-7 w-7 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <PermissionRow label={labels.microphone} granted={micOk} />
        <PermissionRow label={labels.camera} granted={camOk} />

        {error && (
          <p className="rounded-button bg-error/10 px-3 py-2 text-center text-sm text-error">
            {error}
          </p>
        )}

        {!allGranted && (
          <button
            type="button"
            onClick={() => void requestPermissions()}
            className="mt-2 w-full rounded-button bg-primary py-2.5 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover"
          >
            {labels.grantAccess}
          </button>
        )}
      </div>
    </div>
  );
}

function PermissionRow({
  label,
  granted,
}: {
  label: string;
  granted: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-button bg-surface-overlay/60 px-4 py-3">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-300 ${
          granted ? "bg-primary text-text-inverse" : "bg-border-strong"
        }`}
      >
        {granted && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </div>
  );
}

/* ── Step content ── */

function getStepTitle(step: number, t: RoomLabels["tutorial"]): string {
  switch (step) {
    case 0:
      return t.recording.title;
    case 1:
      return t.chat.title;
    case 2:
      return t.reports.title;
    default:
      return "";
  }
}

function getStepDescription(step: number, t: RoomLabels["tutorial"]): string {
  switch (step) {
    case 0:
      return t.recording.description;
    case 1:
      return t.chat.description;
    case 2:
      return t.reports.description;
    default:
      return "";
  }
}

function StepBadge({ label }: { label: string }) {
  return (
    <span className="absolute right-3 top-3 rounded-button bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-text-inverse">
      {n}
    </span>
  );
}

function StepContent({ step, t }: { step: number; t: RoomLabels["tutorial"] }) {
  switch (step) {
    case 0:
      return (
        <div className="relative w-full rounded-card border border-border bg-surface-raised p-8">
          <StepBadge label={t.card.howToUse} />
          <div className="flex items-center">
            <div className="flex-1 border-r border-border pr-6 text-center">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow">
                <Mic className="h-8 w-8 text-text-inverse" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-secondary">
                <StepNumber n={1} />
                {t.card.pressHoldToSpeak}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center pl-6">
              <div className="rounded-card border border-border bg-surface-overlay p-4 shadow-card">
                <p className="text-sm text-text-secondary">
                  {t.card.voiceTranscribed}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="relative w-full rounded-card border border-border bg-surface-raised p-8">
          <StepBadge label={t.card.howToUse} />
          <div className="flex items-center gap-6">
            <div className="flex flex-1 flex-col items-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-glow">
                <MessageCircle className="h-8 w-8 text-text-inverse" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-text-inverse">
                  1
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-text-secondary">
                <StepNumber n={2} />
                {t.card.clickViewChat}
              </p>
            </div>
            <div className="flex-1">
              <div className="space-y-3 rounded-card border border-border bg-surface-overlay p-4 shadow-card">
                <div className="rounded-button bg-primary-light p-2.5 text-sm text-text-secondary">
                  {t.chatExample1}
                </div>
                <div className="ml-4 rounded-button bg-secondary/10 p-2.5 text-sm text-text-secondary">
                  {t.chatExample2}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="relative w-full rounded-card border border-border bg-surface-raised p-8">
          <StepBadge label={t.card.finalStep} />
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md rounded-card border border-border bg-surface-overlay p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-button bg-primary-light">
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
                <h3 className="font-display font-semibold text-text">
                  {t.interviewReport}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-surface-raised" />
                <div className="h-2.5 w-5/6 rounded-full bg-surface-raised" />
                <div className="h-2.5 w-4/5 rounded-full bg-surface-raised" />
                <div className="pt-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-xs font-medium text-text-muted">
                      {t.strengths}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-raised" />
                  <div className="mt-1 h-2 w-5/6 rounded-full bg-surface-raised" />
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-sm font-medium text-text-secondary">
              <StepNumber n={3} />
              {t.reports.footer}
            </p>
          </div>
        </div>
      );
    default:
      return null;
  }
}
