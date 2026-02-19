/* ─────────────────────────────────────────────────────────
 * AddStepModal — picker for available step types
 *
 * Fetches the step catalog, filters out steps already in
 * the pipeline, and lets the user add one with a click.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import { Loader2, Plus, X, Lock } from "lucide-react";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useStepTypes } from "../../hooks";
import { useAgentMutations } from "../../hooks";
import type { Agent, StepType } from "../../types";

interface AddStepModalProps {
  agent: Agent;
  onClose: () => void;
}

export function AddStepModal({ agent, onClose }: AddStepModalProps) {
  const { agent: { steps: l } } = useLabels();
  const categoryId = agent.conversationTypeId;
  const { data: stepTypes, isLoading } = useStepTypes(categoryId);
  const { addStep } = useAgentMutations(agent._id);
  const backdropRef = useRef<HTMLDivElement>(null);

  const stepOrder = agent.stepOrder ?? [];
  const existingKeys = new Set(stepOrder);

  /* Resolve label from agent's language */
  const lang = agent.voice.languageCode; // e.g. "it-IT"

  function getLabel(st: StepType): string {
    return st.labels[lang] ?? st.labels["en-US"] ?? st.id;
  }

  /* Compute order: insert before the last step (conclusion) */
  function computeOrder(): number {
    if (stepOrder.length === 0) return 0;
    return Math.max(0, stepOrder.length - 1);
  }

  function handleAdd(stepType: StepType) {
    addStep.mutate(
      { key: stepType.id, order: computeOrder(), draft: true },
      { onSuccess: () => onClose() },
    );
  }

  /* Close on backdrop click */
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* Filter available types: exclude already-used step IDs */
  const available = stepTypes?.filter((st) => !existingKeys.has(st.id)) ?? [];
  const unavailable = stepTypes?.filter((st) => existingKeys.has(st.id)) ?? [];

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fade-in_150ms_ease-out]"
    >
      <div
        className={cn(
          "w-[clamp(24rem,40vw,36rem)] max-h-[70vh] flex flex-col",
          "rounded-card border border-border bg-surface-raised shadow-card",
          "animate-[scale-fade-in_200ms_ease-out]",
        )}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="panel-title">{l.addStep}</h2>
            <p className="panel-subtitle mt-0.5">{l.addStepSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-button p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : !categoryId ? (
            <p
              className="py-8 text-center text-text-muted"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              {l.setCategoryHint}
            </p>
          ) : available.length === 0 && unavailable.length === 0 ? (
            <p
              className="py-8 text-center text-text-muted"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              {l.noStepTypes}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Available steps */}
              {available.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleAdd(st)}
                  disabled={addStep.isPending}
                  className={cn(
                    "group flex items-center gap-3 rounded-card px-4 py-3",
                    "border border-border bg-surface/50 text-left",
                    "transition-all duration-200",
                    "hover:border-primary/40 hover:bg-primary-light",
                    "disabled:opacity-50 disabled:pointer-events-none",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      "bg-primary-light text-primary",
                      "transition-colors group-hover:bg-primary group-hover:text-text-inverse",
                    )}
                  >
                    <Plus size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium text-text"
                      style={{ fontSize: "var(--pt-base)" }}
                    >
                      {getLabel(st)}
                    </p>
                    <p className="panel-subtitle">{st.id}</p>
                  </div>
                  {st.position !== "flexible" && (
                    <span
                      className="shrink-0 rounded-button bg-surface-overlay px-2 py-0.5 text-text-muted"
                      style={{ fontSize: "var(--pt-xs)" }}
                    >
                      {st.position}
                    </span>
                  )}
                </button>
              ))}

              {/* Already-used steps (shown greyed out) */}
              {unavailable.map((st) => (
                <div
                  key={st.id}
                  className={cn(
                    "flex items-center gap-3 rounded-card px-4 py-3",
                    "border border-border/50 bg-surface/20 opacity-40",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-overlay text-text-muted">
                    <Lock size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium text-text-muted"
                      style={{ fontSize: "var(--pt-base)" }}
                    >
                      {getLabel(st)}
                    </p>
                    <p className="panel-subtitle">{l.alreadyInPipeline}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer hint ── */}
        {addStep.isPending && (
          <div className="shrink-0 flex items-center justify-center gap-2 border-t border-border px-4 py-3">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span
              className="text-text-muted"
              style={{ fontSize: "var(--pt-sm)" }}
            >
              {l.addingStep}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
