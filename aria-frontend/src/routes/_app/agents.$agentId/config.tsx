/* ─────────────────────────────────────────────────────────
 * Route: /_app/agents/$agentId/config
 *
 * Renders the two-column agent configuration page.
 * Agent data is already fetched by the parent layout route,
 * so we reuse the cached query here.
 * ───────────────────────────────────────────────────────── */

import { createFileRoute } from "@tanstack/react-router";
import { useAgent } from "@/features/agent";
import { AgentConfigPage } from "@/features/agent/components/config/agent-config-page";

export const Route = createFileRoute("/_app/agents/$agentId/config")({
  component: AgentConfigRoute,
});

function AgentConfigRoute() {
  const { agentId } = Route.useParams();
  const { data: agent } = useAgent(agentId);

  /* Agent is guaranteed by the parent layout loader. */
  if (!agent) return null;

  return <AgentConfigPage agent={agent} />;
}
