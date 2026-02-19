/* ─────────────────────────────────────────────────────────
 * Organization Store (Zustand 5 + persist)
 *
 * Persisted slice  → activeOrg (the org the user is operating as)
 * ───────────────────────────────────────────────────────── */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActiveOrganization } from "../types";
import { ORG_STORAGE_KEY } from "../constants";

/* ── State shape ─────────────────────────────────────────── */

interface OrgState {
  /* Persisted */
  activeOrg: ActiveOrganization | null;

  /* Derived — kept in sync by actions for selector convenience */
  isOrgMode: boolean;
}

interface OrgActions {
  /** Switch to organization mode. */
  setActiveOrg: (org: ActiveOrganization) => void;

  /** Switch back to personal mode. */
  clearActiveOrg: () => void;
}

/* ── Store ────────────────────────────────────────────────── */

export const useOrgStore = create<OrgState & OrgActions>()(
  persist(
    (set) => ({
      /* ── Initial state ── */
      activeOrg: null,
      isOrgMode: false,

      /* ── Actions ── */
      setActiveOrg: (org) => set({ activeOrg: org, isOrgMode: true }),
      clearActiveOrg: () => set({ activeOrg: null, isOrgMode: false }),
    }),
    {
      name: ORG_STORAGE_KEY,
      /** Only persist org context — derived flags recompute. */
      partialize: ({ activeOrg, isOrgMode }) => ({ activeOrg, isOrgMode }),
    },
  ),
);
