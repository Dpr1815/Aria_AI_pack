/* ─────────────────────────────────────────────────────────
 * useMyOrganizations — TanStack Query wrapper for GET /organizations
 *
 * Fetches all organizations the current user belongs to.
 * ───────────────────────────────────────────────────────── */

import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "../api";
import { orgKeys } from "./use-organization";
import { useAuthStore } from "@/features/auth";

export function useMyOrganizations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: orgKeys.mine(),
    queryFn: () => organizationApi.listMine(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}
