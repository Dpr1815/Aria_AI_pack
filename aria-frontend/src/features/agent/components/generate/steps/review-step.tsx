/* ─────────────────────────────────────────────────────────
 * Step 4: Review & Generate — summary of all settings
 * ───────────────────────────────────────────────────────── */

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelError } from "@/components/ui/panel-error";
import { useLabels } from "@/i18n";
import { useGenerateWizardStore } from "../../../stores/generate-wizard.store";
import { useGenerateAgent } from "../../../hooks/use-generate-agent";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-text-muted" style={{ fontSize: "var(--pt-sm)" }}>
        {label}
      </span>
      <span
        className="text-right font-medium text-text"
        style={{ fontSize: "var(--pt-sm)" }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border/50 bg-surface/30 px-4 py-3">
      <h4 className="panel-label mb-1">{title}</h4>
      {children}
    </div>
  );
}

export function ReviewStep() {
  const { agent: { generate: l, settings: sl } } = useLabels();
  const store = useGenerateWizardStore();
  const generateAgent = useGenerateAgent();

  const handleGenerate = () => {
    const payload = store.buildPayload();
    generateAgent.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-secondary" style={{ fontSize: "var(--pt-sm)" }}>
        {l.reviewHint}
      </p>

      <ReviewSection title={l.stepAgentInfo}>
        <ReviewRow label={l.agentName} value={store.label} />
        <ReviewRow
          label={l.summary}
          value={
            store.summary.length > 120
              ? store.summary.slice(0, 120) + "…"
              : store.summary
          }
        />
      </ReviewSection>

      <ReviewSection title={l.stepAgentConfig}>
        <ReviewRow label={sl.languageCode} value={store.voice.languageCode} />
        <ReviewRow label={sl.voiceName} value={store.voice.name} />
        <ReviewRow label={sl.gender} value={store.voice.gender} />
        <ReviewRow label={sl.render} value={store.render.mode} />
        <ReviewRow
          label={sl.conversationType}
          value={store.conversationTypeId}
        />
        <ReviewRow label={sl.summaryType} value={store.summaryTypeId} />
        <ReviewRow label={sl.statisticsType} value={store.statisticsTypeId} />
      </ReviewSection>

      <ReviewSection title={l.stepPipeline}>
        <ReviewRow
          label={l.selectSteps}
          value={
            store.selectedSteps.length > 0
              ? store.selectedSteps.join(", ")
              : "—"
          }
        />
        {Object.keys(store.additionalData).length > 0 && (
          <>
            {Object.entries(store.additionalData).map(([key, val]) => (
              <ReviewRow key={key} label={key} value={String(val ?? "")} />
            ))}
          </>
        )}
      </ReviewSection>

      {/* Error */}
      <PanelError errors={[generateAgent.error]} className="mx-0" />

      {/* Generate button */}
      <Button
        size="lg"
        disabled={generateAgent.isPending}
        onClick={handleGenerate}
        className="w-full mt-2"
      >
        {generateAgent.isPending ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin" />
            {l.generating}
          </>
        ) : (
          <>
            <Sparkles size={18} className="mr-2" />
            {l.generateAgent}
          </>
        )}
      </Button>
    </div>
  );
}
