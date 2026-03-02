import { useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  XCircle,
  Loader,
  MessageCircle,
} from "lucide-react";
import { joinSession, testJoinSession } from "../../api";
import { useLabels } from "@/i18n";
import type { Agent, SessionAuth } from "../../types";

/* ─────────────────────────────────────────────
 * JoinModal
 * ─────────────────────────────────────────────
 * Pre-session form: collects name + email.
 * Public: calls POST /sessions/join.
 * Test mode: calls POST /sessions/test (authenticated).
 * ───────────────────────────────────────────── */

interface JoinModalProps {
  agent: Agent;
  roomId: string;
  isTestMode?: boolean;
  onJoinSuccess: (auth: SessionAuth) => void;
}

export function JoinModal({ agent, roomId, isTestMode = false, onJoinSuccess }: JoinModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locale = agent.voice.languageCode ?? "en-US";
  const { common: c, room: { interviewModal: t } } = useLabels(locale);
  const isInactive = agent.status === "inactive";
  const isDisabled = isInactive && !isTestMode;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t.invalidEmail);
      return;
    }

    setIsSubmitting(true);

    const join = isTestMode ? testJoinSession : joinSession;

    try {
      const auth = await join({
        agentId: roomId,
        email: trimmedEmail,
        name: trimmedName || undefined,
      });
      onJoinSuccess(auth);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : c.errorGeneric;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-background/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[95%] sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex-shrink-0 rounded-button bg-primary-light p-3 sm:p-3.5">
              <MessageCircle className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-text sm:text-xl lg:text-2xl">
                {agent.label}
              </h2>
            </div>
          </div>

          {isInactive && (
            <span className="flex-shrink-0 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
              {t.draftMode}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="rounded-b-2xl border border-t-0 border-border-strong bg-surface-modal">
          {/* Inactive warning — test mode shows draft notice, public shows disabled notice */}
          {isInactive && (
            <div className="flex items-center gap-3 border-b border-warning/20 bg-warning/8 px-6 py-3 text-sm text-warning sm:px-8">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p>{isTestMode ? t.draftModeMessage : t.agentNotActive}</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 border-b border-error/20 bg-error/8 px-6 py-3 text-sm text-error sm:px-8">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mx-auto max-w-lg space-y-7"
            >
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary sm:text-base">
                  {t.fullName}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-input border border-border-strong bg-surface px-4 py-2.5 text-sm text-text transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none sm:px-5 sm:py-3 sm:text-base"
                  placeholder={t.fullNamePlaceholder}
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary sm:text-base">
                  {t.emailAddress}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-input border border-border-strong bg-surface px-4 py-2.5 text-sm text-text transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none sm:px-5 sm:py-3 sm:text-base"
                  placeholder={t.emailPlaceholder}
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || isDisabled}
                className={`flex w-full items-center justify-center gap-2 rounded-button bg-primary px-6 py-3 font-semibold text-text-inverse shadow-glow transition-all sm:py-3.5 sm:text-lg ${
                  isSubmitting || isDisabled
                    ? "cursor-not-allowed opacity-70"
                    : "hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    {t.creatingInterview}
                  </>
                ) : (
                  <>
                    {t.startInterview}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Legal */}
            <p className="mx-auto mt-6 max-w-lg text-center text-xs text-text-muted sm:text-sm">
              {t.termsText}{" "}
              <a
                href="#/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary transition hover:text-primary-hover"
              >
                {t.termsLink}
              </a>{" "}
              {t.and}{" "}
              <a
                href="#/policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary transition hover:text-primary-hover"
              >
                {t.privacyLink}
              </a>
              . {t.webcamNotice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
