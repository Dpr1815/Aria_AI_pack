/* ─────────────────────────────────────────────────────────
 * useOrganizationMutations — all write operations
 * ───────────────────────────────────────────────────────── */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationApi } from "../api";
import { orgKeys } from "./use-organization";
import type {
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
  AddMemberPayload,
  OrgRole,
} from "../types";
import { useOrgStore } from "../stores/organization.store";

export function useOrganizationMutations(orgId?: string) {
  const qc = useQueryClient();

  const invalidateAll = () =>
    qc.invalidateQueries({ queryKey: orgKeys.all });
  const invalidateDetail = () =>
    orgId
      ? qc.invalidateQueries({ queryKey: orgKeys.detail(orgId) })
      : invalidateAll();

  /* ── Create ──────────────────────────────────────────────── */

  const createOrg = useMutation({
    mutationFn: (payload: CreateOrganizationPayload) =>
      organizationApi.create(payload),
    onSuccess: () => invalidateAll(),
  });

  /* ── Update ──────────────────────────────────────────────── */

  const updateOrg = useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) => {
      if (!orgId) throw new Error("orgId is required");
      return organizationApi.update(orgId, payload);
    },
    onSuccess: (updatedOrg) => {
      invalidateDetail();
      // Keep the activeOrg store in sync if it's the currently active org
      const store = useOrgStore.getState();
      if (store.activeOrg && store.activeOrg._id === orgId) {
        store.setActiveOrg({
          _id: updatedOrg._id,
          name: updatedOrg.name,
          logoUrl: updatedOrg.logoUrl,
          role: store.activeOrg.role,
        });
      }
    },
  });

  /* ── Members ─────────────────────────────────────────────── */

  const addMember = useMutation({
    mutationFn: (payload: AddMemberPayload) => {
      if (!orgId) throw new Error("orgId is required");
      return organizationApi.addMember(orgId, payload);
    },
    onSuccess: () => invalidateDetail(),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => {
      if (!orgId) throw new Error("orgId is required");
      return organizationApi.removeMember(orgId, memberId);
    },
    onSuccess: () => invalidateDetail(),
  });

  const updateMemberRole = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: OrgRole;
    }) => {
      if (!orgId) throw new Error("orgId is required");
      return organizationApi.updateMemberRole(orgId, memberId, { role });
    },
    onSuccess: () => invalidateDetail(),
  });

  /* ── Leave ───────────────────────────────────────────────── */

  const leaveOrg = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error("orgId is required");
      return organizationApi.leave(orgId);
    },
    onSuccess: () => {
      // If leaving the active org, clear org mode
      const store = useOrgStore.getState();
      if (store.activeOrg?._id === orgId) {
        store.clearActiveOrg();
      }
      invalidateAll();
    },
  });

  return {
    createOrg,
    updateOrg,
    addMember,
    removeMember,
    updateMemberRole,
    leaveOrg,
  } as const;
}
