/* ─────────────────────────────────────────────────────────
 * Step 3: Pipeline Steps — select steps + additional data
 *
 * Shows available step types from the catalog. When a step
 * with additionalData requirements is selected, inline
 * fields appear below it.
 * ───────────────────────────────────────────────────────── */

import { Check, Layers, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useStepTypes } from "../../../hooks";
import { useGenerateWizardStore } from "../../../stores/generate-wizard.store";
import type { StepType } from "../../../types";

/* ── Additional data field renderers ─────────────────── */

const ADDITIONAL_DATA_FIELDS: Record<
  string,
  {
    render: (props: {
      value: unknown;
      onChange: (v: unknown) => void;
      label: string;
    }) => React.ReactNode;
  }
> = {
  assessment_type: {
    render: ({ value, onChange, label }) => (
      <div className="flex flex-col gap-1.5">
        <label className="panel-field-label">{label}</label>
        <div className="flex gap-2">
          {(["written", "coding"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex-1 rounded-button py-1.5 text-center capitalize",
                "border text-sm font-medium transition-colors",
                value === opt
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-border-strong",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    ),
  },
  time_minutes: {
    render: ({ value, onChange, label }) => (
      <Input
        label={label}
        type="number"
        min={5}
        max={120}
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder="e.g. 30"
      />
    ),
  },
  language_coding: {
    render: ({ value, onChange, label }) => (
      <Input
        label={label}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="e.g. TypeScript"
      />
    ),
  },
  target_language: {
    render: ({ value, onChange, label }) => (
      <Input
        label={label}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="e.g. English"
      />
    ),
  },
};

/* ── Field label map ─────────────────────────────────── */

function useFieldLabels() {
  const { agent: { generate: l } } = useLabels();
  return {
    assessment_type: l.assessmentType,
    time_minutes: l.timeMinutes,
    language_coding: l.languageCoding,
    target_language: l.targetLanguage,
  } as Record<string, string>;
}

/* ── Component ────────────────────────────────────────── */

export function PipelineStepsStep() {
  const { agent: { generate: l } } = useLabels();
  const conversationTypeId = useGenerateWizardStore((s) => s.conversationTypeId);
  const selectedSteps = useGenerateWizardStore((s) => s.selectedSteps);
  const additionalData = useGenerateWizardStore((s) => s.additionalData);
  const toggleStep = useGenerateWizardStore((s) => s.toggleStep);
  const setAdditionalDataField = useGenerateWizardStore((s) => s.setAdditionalDataField);

  const { data: stepTypes, isLoading } = useStepTypes(conversationTypeId || undefined);
  const fieldLabels = useFieldLabels();

  const lang = useGenerateWizardStore((s) => s.voice.languageCode);

  function getLabel(st: StepType): string {
    return st.labels[lang] ?? st.labels["en-US"] ?? st.id;
  }

  /* Determine if language_coding should be shown (only when assessment_type === 'coding') */
  function shouldShowField(_stepType: StepType, fieldName: string): boolean {
    if (fieldName === "language_coding") {
      return additionalData.assessment_type === "coding";
    }
    return true;
  }

  if (!conversationTypeId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle size={32} className="text-text-muted" />
        <p className="text-text-muted" style={{ fontSize: "var(--pt-sm)" }}>
          {l.noConversationType}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-text-secondary mb-2" style={{ fontSize: "var(--pt-sm)" }}>
        {l.selectStepsHint}
      </p>

      {stepTypes?.map((st) => {
        const isSelected = selectedSteps.includes(st.id);
        const allFields = [
          ...(st.additionalData?.required ?? []),
          ...(st.additionalData?.optional ?? []),
        ];
        const hasAdditional = allFields.length > 0;

        return (
          <div key={st.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggleStep(st.id)}
              className={cn(
                "flex items-center gap-3 rounded-card px-4 py-3",
                "border text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface/50 hover:border-primary/40 hover:bg-primary-light/50",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  "transition-colors",
                  isSelected
                    ? "bg-primary text-text-inverse"
                    : "bg-surface-overlay text-text-muted",
                )}
              >
                {isSelected ? <Check size={16} /> : <Layers size={14} />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-text" style={{ fontSize: "var(--pt-base)" }}>
                  {getLabel(st)}
                </p>
                <p className="text-text-muted" style={{ fontSize: "var(--pt-xs)" }}>
                  {st.id}
                </p>
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

            {/* Additional data fields for selected steps */}
            {isSelected && hasAdditional && (
              <div className="ml-11 mt-2 mb-1 flex flex-col gap-3 rounded-card border border-border/50 bg-surface/30 px-4 py-3 animate-[fade-in_200ms_ease-out]">
                <p className="panel-label">
                  {l.additionalDataTitle}
                </p>
                {allFields.map((field) => {
                  if (!shouldShowField(st, field)) return null;
                  const renderer = ADDITIONAL_DATA_FIELDS[field];
                  if (!renderer) {
                    return (
                      <Input
                        key={field}
                        label={fieldLabels[field] ?? field}
                        value={(additionalData[field] as string) ?? ""}
                        onChange={(e) => setAdditionalDataField(field, e.target.value || undefined)}
                        placeholder={field}
                      />
                    );
                  }
                  return (
                    <div key={field}>
                      {renderer.render({
                        value: additionalData[field],
                        onChange: (v) => setAdditionalDataField(field, v),
                        label: fieldLabels[field] ?? field,
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
