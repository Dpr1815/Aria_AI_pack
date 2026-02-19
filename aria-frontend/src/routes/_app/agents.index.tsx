import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AgentsPage } from "@/features/agent/components/agents-page";

export const Route = createFileRoute("/_app/agents/")({
  component: AgentsRoute,
});

function AgentsRoute() {
  useDocumentTitle("Agents");
  return <AgentsPage />;
}
