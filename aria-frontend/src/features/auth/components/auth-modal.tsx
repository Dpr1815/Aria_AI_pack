/* ─────────────────────────────────────────────────────────
 * AuthModal — Login / Signup modal
 *
 * Design: frosted-glass card with a gradient border,
 * segmented tab control, and smooth backdrop blur.
 * Fully driven by the auth store.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import { X, Zap } from "lucide-react";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useAuth } from "../hooks";
import type { AuthModalView } from "../types";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

/* ── Component ───────────────────────────────────────────── */

export function AuthModal() {
  const { auth: a, common: c } = useLabels();
  const { isModalOpen, modalView, closeModal, switchView } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  const tabs: { value: AuthModalView; label: string }[] = [
    { value: "login", label: a.login },
    { value: "signup", label: a.signup },
  ];

  /* ── Keyboard: close on Escape ── */
  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, closeModal]);

  /* ── Lock body scroll while open ── */
  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  /* ── Auto-focus first input on view switch ── */
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setTimeout(() => {
      const firstInput = panelRef.current?.querySelector<HTMLInputElement>("input");
      firstInput?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [isModalOpen, modalView]);

  if (!isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="auth-modal-title"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "animate-[fade-in_200ms_ease-out]",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-md mx-4",
          "bg-surface-modal rounded-card shadow-card",
          "pack-border-gradient pack-noise",
          "animate-[scale-fade-in_250ms_ease-out]",
        )}
      >
        {/* ── Close button ── */}
        <button
          type="button"
          onClick={closeModal}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-full p-1.5",
            "text-text-muted transition-colors hover:bg-surface hover:text-text",
          )}
          aria-label={c.close}
        >
          <X size={18} />
        </button>

        {/* ── Content ── */}
        <div className="px-7 pb-8 pt-8">
          {/* Header */}
          <header className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light">
              <Zap size={22} className="text-primary" />
            </div>
            <h2
              id="auth-modal-title"
              className="font-display text-xl font-semibold tracking-tight text-text"
            >
              {modalView === "login" ? a.welcomeBack : a.createYourAccount}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {modalView === "login" ? a.signInSubtitle : a.signUpSubtitle}
            </p>
          </header>

          {/* Tab bar */}
          <div className="relative mb-6 flex rounded-button bg-surface p-1">
            {/* Sliding indicator */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-1 w-[calc(50%-4px)] rounded-[calc(var(--radius-button)-4px)]",
                "bg-primary/90 shadow-sm",
                "transition-transform duration-200 ease-out",
                modalView === "signup" && "translate-x-[calc(100%+4px)]",
              )}
            />

            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={modalView === tab.value}
                onClick={() => switchView(tab.value)}
                className={cn(
                  "relative z-[1] flex-1 py-2 text-center text-sm font-medium",
                  "transition-colors duration-200",
                  modalView === tab.value
                    ? "text-text-inverse"
                    : "text-text-secondary hover:text-text",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form */}
          {modalView === "login" ? <LoginForm /> : <SignupForm />}

          {/* Footer toggle */}
          <p className="mt-5 text-center text-sm text-text-secondary">
            {modalView === "login" ? a.dontHaveAccount : a.alreadyHaveAccount}{" "}
            <button
              type="button"
              onClick={() => switchView(modalView === "login" ? "signup" : "login")}
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {modalView === "login" ? a.signup : a.login}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
