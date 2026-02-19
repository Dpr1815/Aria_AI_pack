import { useCallback, useMemo, useState } from "react";
import {
  ChevronLeft,
  Clock,
  ClipboardCheck,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useAgentEditorStore } from "../../stores/agent-editor.store";
import { useAgentMutations } from "../../hooks";
import type { Agent, UpdateAssessmentPayload } from "../../types";
import { MarkdownTextField } from "@/components/ui/markdown-text-field";

interface AssessmentPanelProps {
  agent: Agent;
}

export function AssessmentPanel({ agent }: AssessmentPanelProps) {
  const { agent: { assessment: l, steps: sl } } = useLabels();
  const assessment = agent.assessment;
  const { updateAssessment } = useAgentMutations(agent._id);
  const showSettings = useAgentEditorStore((s) => s.showSettings);

  const [testContent, setTestContent] = useState(assessment?.testContent ?? "");
  const [language, setLanguage] = useState(assessment?.language ?? "");
  const [duration, setDuration] = useState(assessment?.durationSeconds ?? 1800);

  const sourceJson = JSON.stringify(assessment);
  useMemo(() => {
    if (!assessment) return;
    setTestContent(assessment.testContent);
    setLanguage(assessment.language);
    setDuration(assessment.durationSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceJson]);

  const isDirty =
    assessment != null &&
    (testContent !== assessment.testContent ||
      language !== assessment.language ||
      duration !== assessment.durationSeconds);

  const handleSave = useCallback(() => {
    if (!assessment) return;
    const payload: UpdateAssessmentPayload = {};
    if (testContent !== assessment.testContent)
      payload.testContent = testContent;
    if (language !== assessment.language) payload.language = language;
    if (duration !== assessment.durationSeconds)
      payload.durationSeconds = duration;
    if (Object.keys(payload).length > 0) updateAssessment.mutate(payload);
  }, [testContent, language, duration, assessment, updateAssessment]);

  if (!assessment) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <ClipboardCheck size={32} className="text-text-muted" />
        <p
          className="text-center text-text-muted"
          style={{ fontSize: "var(--pt-base)" }}
        >
          {l.noAssessment}
        </p>
      </div>
    );
  }

  const durationMin = Math.round(duration / 60);

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
          {sl.generalSettings}
        </button>
      </div>

      {/* ── Header (pinned) ── */}
      <div className="shrink-0 panel-header-gradient relative z-[1] flex items-center justify-between border-b border-border px-[var(--panel-px)] py-[var(--panel-py)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/12">
            <ClipboardCheck size={15} className="text-warning" />
          </div>
          <h3 className="panel-title">{l.title}</h3>
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-button",
            "bg-surface px-2.5 py-1 font-medium text-text-muted",
          )}
          style={{ fontSize: "var(--pt-xs)" }}
        >
          <Clock size={12} />
          {durationMin} min
        </div>
      </div>

      {/* ── Body (scrollable) ── */}
      <div className="panel-body panel-scroll px-[var(--panel-px)] py-[var(--panel-py)]">
        <div className="flex flex-col" style={{ gap: "var(--panel-gap)" }}>
          <div className="panel-section flex flex-col gap-4">
            <Input
              label={l.language}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder={l.languagePlaceholder}
            />
            <div className="flex flex-col gap-1.5">
              <label className="panel-field-label">{l.durationSeconds}</label>
              <input
                type="number"
                min={60}
                step={60}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={cn(
                  "w-full rounded-input border border-border bg-surface px-3 py-2.5",
                  "panel-field-input text-text",
                  "outline-none transition-[border-color,box-shadow] duration-200 ease-out",
                  "focus:border-primary focus:ring-1 focus:ring-primary/40",
                )}
              />
            </div>
          </div>

          <div className="panel-section">
            <MarkdownTextField
              label={l.testContent}
              value={testContent}
              onChange={setTestContent}
              rows={16}
              placeholder={l.testContentPlaceholder}
            />
          </div>
        </div>
      </div>

      {/* ── Footer (pinned bottom) ── */}
      <div className="panel-footer">
        <Button
          size="sm"
          disabled={!isDirty || updateAssessment.isPending}
          onClick={handleSave}
          className="w-full"
        >
          {updateAssessment.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={14} className="mr-2" />
              {l.saveAssessment}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
