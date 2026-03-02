import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthModal, useAuthRefresh } from "@/features/auth";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
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

function RootErrorComponent({ error: _error }: { error: Error }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mb-6 text-gray-600">
          An unexpected error occurred. Please refresh the page to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 font-medium text-white transition hover:from-blue-700 hover:to-purple-700"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}
