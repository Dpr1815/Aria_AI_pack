import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { OrgDetailPage } from "@/features/organization/components/org-detail-page";

export const Route = createFileRoute("/_app/organization")({
  component: OrganizationRoute,
});

function OrganizationRoute() {
  useDocumentTitle("Organization");
  return <OrgDetailPage />;
}
