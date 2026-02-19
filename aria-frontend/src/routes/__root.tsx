import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthModal, useAuthRefresh } from "@/features/auth";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useAuthRefresh();

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <Outlet />
      <AuthModal />
    </div>
  );
}
