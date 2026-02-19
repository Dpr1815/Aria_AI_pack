import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

/**
 * Register the router instance for type-safety across the app.
 * This enables auto-complete for route paths in <Link> and useNavigate.
 */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
