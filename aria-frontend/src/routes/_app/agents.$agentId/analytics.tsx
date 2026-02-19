/* ─────────────────────────────────────────────────────────
 * Route: /agents/:agentId/analytics
 *
 * Child route of agents.$agentId.tsx layout.
 * Renders the analytics dashboard.
 * ───────────────────────────────────────────────────────── */

import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/features/agent/components/analytics";

export const Route = createFileRoute("/_app/agents/$agentId/analytics")({
  component: AgentAnalytics,
});

function AgentAnalytics() {
  const { agentId } = Route.useParams();
  return <AnalyticsPage agentId={agentId} />;
}
