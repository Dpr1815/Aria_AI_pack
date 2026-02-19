/* ─────────────────────────────────────────────────────────
 * useOrganization — TanStack Query wrapper for GET /organizations/:id
 * ───────────────────────────────────────────────────────── */

import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "../api";

/** Query key factory for organization-related queries. */
export const orgKeys = {
  all: ["organizations"] as const,
  mine: () => [...orgKeys.all, "mine"] as const,
  detail: (id: string) => [...orgKeys.all, id] as const,
};

/** Fetch a single organization by ID. */
export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: orgKeys.detail(orgId),
    queryFn: () => organizationApi.getById(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
