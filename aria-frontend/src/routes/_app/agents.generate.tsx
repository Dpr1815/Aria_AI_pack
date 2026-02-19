import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { GeneratePage } from "@/features/agent/components/generate/generate-page";

export const Route = createFileRoute("/_app/agents/generate")({
  component: GenerateAgentRoute,
});

function GenerateAgentRoute() {
  useDocumentTitle("Create Agent");
  return <GeneratePage />;
}
