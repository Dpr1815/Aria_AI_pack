import { ReactFlowProvider } from "@xyflow/react";
import { cn } from "@/utils";
import { useAgentEditorStore } from "../../stores/agent-editor.store";
import { StepFlow } from "./steps/step-flow";
import { StepEditorPanel } from "./steps/step-editor-panel";
import { AgentSettingsPanel } from "./agent-settings-panel";
import { AssessmentPanel } from "./assessment-panel";
import type { Agent } from "../../types";

interface AgentConfigPageProps {
  agent: Agent;
}

export function AgentConfigPage({ agent }: AgentConfigPageProps) {
  const panel = useAgentEditorStore((s) => s.panel);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left: React Flow canvas ── */}
      <div className="min-h-0 min-w-0 flex-[2]">
        <ReactFlowProvider>
          <StepFlow agent={agent} />
        </ReactFlowProvider>
      </div>

      {/* ── Right: Contextual panel ── */}
      <aside
        className={cn(
          "relative flex-[1] border-l border-border",
          "bg-surface-raised/60 backdrop-blur-sm",
          "animate-[slide-in-right_250ms_ease-out]",
        )}
      >
        <div
          key={panel.kind === "step" ? panel.stepKey : panel.kind}
          className="absolute inset-0 animate-[fade-in_200ms_ease-out]"
        >
          {panel.kind === "settings" && <AgentSettingsPanel agent={agent} />}
          {panel.kind === "step" && (
            <StepEditorPanel agent={agent} stepKey={panel.stepKey} />
          )}
          {panel.kind === "assessment" && <AssessmentPanel agent={agent} />}
        </div>
      </aside>
    </div>
  );
}
