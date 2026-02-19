/* ─────────────────────────────────────────────────────────
 * GeneratePage — multi-step wizard for agent generation
 *
 * 4 steps: Info → Config → Steps → Review & Generate
 * ───────────────────────────────────────────────────────── */

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useGenerateWizardStore } from "../../stores/generate-wizard.store";
import { AgentInfoStep } from "./steps/agent-info-step";
import { AgentConfigStep } from "./steps/agent-config-step";
import { PipelineStepsStep } from "./steps/pipeline-steps-step";
import { ReviewStep } from "./steps/review-step";

const STEPS = [
  { key: "info", Component: AgentInfoStep },
  { key: "config", Component: AgentConfigStep },
  { key: "pipeline", Component: PipelineStepsStep },
  { key: "review", Component: ReviewStep },
] as const;

function useStepLabels() {
  const {
    agent: { generate: l },
  } = useLabels();
  return [l.stepAgentInfo, l.stepAgentConfig, l.stepPipeline, l.stepReview];
}

/* ── Step Indicator ───────────────────────────────────── */

function StepIndicator({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5",
              "text-xs font-medium transition-colors",
              i === current
                ? "bg-primary text-text-inverse"
                : i < current
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-overlay text-text-muted",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                i === current
                  ? "bg-text-inverse/20 text-text-inverse"
                  : i < current
                    ? "bg-primary/20 text-primary"
                    : "bg-surface text-text-muted",
              )}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>

          {i < labels.length - 1 && (
            <div
              className={cn(
                "h-px w-4 transition-colors",
                i < current ? "bg-primary/40" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Validation ───────────────────────────────────────── */

function canProceed(
  step: number,
  state: ReturnType<typeof useGenerateWizardStore.getState>,
): boolean {
  switch (step) {
    case 0: // Info
      return (
        state.label.trim().length >= 1 && state.summary.trim().length >= 10
      );
    case 1: // Config
      return (
        state.voice.languageCode.length > 0 &&
        state.voice.name.length > 0 &&
        state.summaryTypeId.length > 0 &&
        state.statisticsTypeId.length > 0
      );
    case 2: // Pipeline
      return state.selectedSteps.length >= 1;
    case 3: // Review (generate button handles it)
      return true;
    default:
      return false;
  }
}

/* ── Component ────────────────────────────────────────── */

export function GeneratePage() {
  const {
    agent: { generate: l },
  } = useLabels();
  const store = useGenerateWizardStore();
  const stepLabels = useStepLabels();
  const reset = useGenerateWizardStore((s) => s.reset);

  // Reset wizard state on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const currentStep = store.step;
  const StepComponent = STEPS[currentStep as number]!.Component;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const valid = canProceed(currentStep, useGenerateWizardStore.getState());

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-border bg-surface-raised/60 backdrop-blur-sm">
        <div className="flex items-center justify-between px-[var(--spacing-page-x)] py-4">
          <StepIndicator current={currentStep} labels={stepLabels} />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-[var(--spacing-page-x)] py-[var(--spacing-page-y)]">
          {/* Step title */}
          <h2
            className="mb-6 font-display font-semibold text-text"
            style={{ fontSize: "var(--pt-lg)" }}
          >
            {stepLabels[currentStep]}
          </h2>

          <StepComponent />
        </div>
      </div>

      {/* ── Footer ── */}
      {!isLast && (
        <footer className="shrink-0 border-t border-border bg-surface-raised/60 backdrop-blur-sm">
          <div className="flex items-center justify-between px-[var(--spacing-page-x)] py-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={isFirst}
              onClick={() => store.prevStep()}
            >
              <ChevronLeft size={16} className="mr-1" />
              {l.back}
            </Button>

            <span
              className="text-text-muted"
              style={{ fontSize: "var(--pt-xs)" }}
            >
              {l.stepOf
                .replace("{current}", String(currentStep + 1))
                .replace("{total}", String(STEPS.length))}
            </span>

            <Button
              size="sm"
              disabled={!valid}
              onClick={() => store.nextStep()}
            >
              {l.next}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </footer>
      )}

      {/* Review step has its own generate button, so show simplified footer */}
      {isLast && (
        <footer className="shrink-0 border-t border-border bg-surface-raised/60 backdrop-blur-sm">
          <div className="flex items-center justify-between px-[var(--spacing-page-x)] py-4">
            <Button variant="ghost" size="sm" onClick={() => store.prevStep()}>
              <ChevronLeft size={16} className="mr-1" />
              {l.back}
            </Button>

            <span
              className="text-text-muted"
              style={{ fontSize: "var(--pt-xs)" }}
            >
              {l.stepOf
                .replace("{current}", String(currentStep + 1))
                .replace("{total}", String(STEPS.length))}
            </span>

            {/* Spacer for alignment */}
            <div className="w-20" />
          </div>
        </footer>
      )}
    </div>
  );
}
