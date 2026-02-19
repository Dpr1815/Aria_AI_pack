/* ─────────────────────────────────────────────────────────
 * Step 1: Agent Info — name + job description
 * ───────────────────────────────────────────────────────── */

import { Input } from "@/components/ui/input";
import { useLabels } from "@/i18n";
import { useGenerateWizardStore } from "../../../stores/generate-wizard.store";

export function AgentInfoStep() {
  const { agent: { generate: l } } = useLabels();
  const label = useGenerateWizardStore((s) => s.label);
  const summary = useGenerateWizardStore((s) => s.summary);
  const setField = useGenerateWizardStore((s) => s.setField);

  return (
    <div className="flex flex-col gap-6">
      <Input
        label={l.agentName}
        value={label}
        onChange={(e) => setField("label", e.target.value)}
        placeholder={l.agentNamePlaceholder}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary" className="panel-field-label">
          {l.summary}
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={(e) => setField("summary", e.target.value)}
          placeholder={l.summaryPlaceholder}
          rows={8}
          className="w-full rounded-input border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none transition-[border-color,box-shadow] duration-200 ease-out focus:border-primary focus:ring-1 focus:ring-primary/40 resize-y"
        />
      </div>
    </div>
  );
}
