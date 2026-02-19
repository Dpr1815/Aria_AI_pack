import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const matches = useMatches();
  const isAgentPage = matches.some((m) =>
    m.routeId.includes("agents/$agentId"),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      {!isAgentPage && <Footer />}
    </div>
  );
}
