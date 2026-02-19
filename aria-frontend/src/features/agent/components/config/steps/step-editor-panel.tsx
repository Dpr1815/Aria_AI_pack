import { useCallback, useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Loader2,
  Save,
  Layers,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { DynamicField } from "./input-fields/dynamic-field";
import { useAgentEditorStore } from "../../../stores/agent-editor.store";
import type { Agent, StepConfig } from "../../../types";
import { useAgentMutations } from "../../../hooks";
import { PanelError } from "@/components/ui/panel-error";
/* ── Accent palette (matches step-node.tsx) ──────────────── */

const ACCENT_PALETTE = [
  "#f97316",
  "#8b5cf6",
  "#38bdf8",
  "#4ade80",
  "#fbbf24",
  "#f87171",
  "#e879f9",
  "#60a5fa",
] as const;

function getAccentColor(index: number): string {
  return ACCENT_PALETTE[index % ACCENT_PALETTE.length]!;
}

/* ── Component ───────────────────────────────────────────── */

interface StepEditorPanelProps {
  agent: Agent;
  stepKey: string;
}

export function StepEditorPanel({ agent, stepKey }: StepEditorPanelProps) {
  const { agent: { steps: l }, common: c } = useLabels();
  const steps = agent.steps ?? {};
  const step: StepConfig | undefined = steps[stepKey];
  const { updateStep, reorderSteps, removeStep } = useAgentMutations(agent._id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const showSettings = useAgentEditorStore((s) => s.showSettings);
  const stepOrder = agent.stepOrder ?? [];

  const stepIndex = stepOrder.indexOf(stepKey);
  const canMoveUp = stepIndex > 0;
  const canMoveDown = stepIndex >= 0 && stepIndex < stepOrder.length - 1;
  const accentColor = getAccentColor(stepIndex);

  const [localInputs, setLocalInputs] = useState<Record<string, unknown>>(
    () => step?.inputs ?? {},
  );

  const currentInputsJson = JSON.stringify(step?.inputs ?? {});
  useMemo(() => {
    setLocalInputs(JSON.parse(currentInputsJson) as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInputsJson]);

  const isDirty = JSON.stringify(localInputs) !== currentInputsJson;

  const handleSave = useCallback(() => {
    updateStep.mutate({ key: stepKey, payload: { inputs: localInputs } });
  }, [updateStep, stepKey, localInputs]);

  const handleMoveUp = useCallback(() => {
    if (!canMoveUp) return;
    const next = [...stepOrder];
    const a = next[stepIndex - 1]!;
    const b = next[stepIndex]!;
    next[stepIndex - 1] = b;
    next[stepIndex] = a;
    reorderSteps.mutate(next);
  }, [canMoveUp, stepOrder, stepIndex, reorderSteps]);

  const handleMoveDown = useCallback(() => {
    if (!canMoveDown) return;
    const next = [...stepOrder];
    const a = next[stepIndex]!;
    const b = next[stepIndex + 1]!;
    next[stepIndex] = b;
    next[stepIndex + 1] = a;
    reorderSteps.mutate(next);
  }, [canMoveDown, stepOrder, stepIndex, reorderSteps]);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted" style={{ fontSize: "var(--pt-base)" }}>
          {l.stepNotFound}
        </p>
      </div>
    );
  }

  return (
    <div className="panel-root">
      {/* ── Back bar (pinned) ── */}
      <div className="shrink-0 border-b border-border px-[var(--panel-px)] py-2">
        <button
          type="button"
          onClick={showSettings}
          className="panel-back-button"
        >
          <ChevronLeft size={14} />
          {l.generalSettings}
        </button>
      </div>

      {/* ── Header (pinned) ── */}
      <div className="shrink-0 panel-header-gradient relative z-[1] flex items-center gap-3 border-b border-border px-[var(--panel-px)] py-[var(--panel-py)]">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accentColor}18`, color: accentColor }}
        >
          <Layers size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="panel-title truncate">{step.label}</h3>
          <p className="panel-subtitle truncate">{stepKey}</p>
        </div>

        {/* Delete button — adjacent to label, before arrows */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={removeStep.isPending}
          className={cn(
            "group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
            "text-red-400/60 hover:bg-red-500/10 hover:text-red-500",
            "disabled:pointer-events-none disabled:opacity-30",
          )}
          aria-label={l.removeStep}
        >
          <Trash2 className="size-[18px] transition-transform group-hover:scale-110" />
        </button>

        {/* Reorder arrows — separated with a subtle divider */}
        <div className="flex flex-col gap-0.5 border-l border-border pl-3">
          <button
            type="button"
            disabled={!canMoveUp || reorderSteps.isPending}
            onClick={handleMoveUp}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            style={{ color: accentColor }}
            aria-label="Move step up"
          >
            <ArrowUp className="size-4 sm:size-5" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown || reorderSteps.isPending}
            onClick={handleMoveDown}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            style={{ color: accentColor }}
            aria-label="Move step down"
          >
            <ArrowDown className="size-4 sm:size-5" />
          </button>
        </div>
      </div>
      <PanelError
        errors={[updateStep.error, reorderSteps.error, removeStep.error]}
      />
      {/* ── Body (scrollable) ── */}
      <div className="panel-body panel-scroll px-[var(--panel-px)] py-[var(--panel-py)]">
        <div
          className="panel-section flex flex-col"
          style={{ gap: "var(--panel-gap)" }}
        >
          <DynamicField
            fieldKey="inputs"
            value={localInputs}
            onChange={(v) => setLocalInputs(v as Record<string, unknown>)}
          />
        </div>
      </div>

      {/* ── Footer (pinned bottom) ── */}
      <div className="panel-footer">
        <Button
          size="sm"
          disabled={!isDirty || updateStep.isPending}
          onClick={handleSave}
          className="w-full"
        >
          {updateStep.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={14} className="mr-2" />
              {l.saveChanges}
            </>
          )}
        </Button>
      </div>
      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fade-in_150ms_ease-out]">
          <div
            className={cn(
              "w-[clamp(20rem,30vw,26rem)] rounded-card border border-border",
              "bg-surface-raised p-6 shadow-card",
              "animate-[scale-fade-in_200ms_ease-out]",
            )}
          >
            <h3
              className="font-display font-semibold text-text"
              style={{ fontSize: "var(--pt-lg)" }}
            >
              {l.removeStepConfirm}
            </h3>
            <p
              className="mt-2 text-text-secondary"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              {l.removeStepPrefix}<strong>{step.label}</strong>{l.removeStepSuffix}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={cn(
                  "flex-1 rounded-button border border-border py-2",
                  "font-medium text-text-secondary",
                  "transition-colors hover:bg-surface",
                )}
                style={{ fontSize: "var(--pt-sm)" }}
              >
                {c.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeStep.mutate(stepKey);
                  setConfirmDelete(false);
                }}
                disabled={removeStep.isPending}
                className={cn(
                  "flex-1 rounded-button py-2",
                  "bg-error font-medium text-white",
                  "transition-colors hover:bg-error/80",
                  "disabled:opacity-50",
                )}
                style={{ fontSize: "var(--pt-sm)" }}
              >
                {removeStep.isPending ? (
                  <Loader2 size={14} className="mx-auto animate-spin" />
                ) : (
                  c.remove
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
