/* ─────────────────────────────────────────────────────────
 * Route: /_app/agents/$agentId
 *
 * Layout route that fetches the agent and passes it to
 * the AgentLayout shell (back button + tabs + outlet).
 * ───────────────────────────────────────────────────────── */

import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAgent, useAgentEditorStore } from "@/features/agent";
import { AgentLayout } from "@/features/agent/components/agent-layout";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/agents/$agentId")({
  component: AgentLayoutRoute,
});

function AgentLayoutRoute() {
  const { agentId } = Route.useParams();
  const { data: agent, isLoading, error } = useAgent(agentId);
  const reset = useAgentEditorStore((s) => s.reset);

  useEffect(() => {
    reset();
    return () => reset();
  }, [agentId, reset]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-error">
          {error?.message ?? "Agent not found"}
        </p>
      </div>
    );
  }

  return <AgentLayout agent={agent} agentId={agentId} />;
}
