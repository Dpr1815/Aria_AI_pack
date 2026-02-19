import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/agents/$agentId/")({
  component: AgentIndexRedirect,
});

function AgentIndexRedirect() {
  const { agentId } = Route.useParams();
  return <Navigate to="/agents/$agentId/config" params={{ agentId }} replace />;
}
