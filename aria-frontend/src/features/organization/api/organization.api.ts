/* ─────────────────────────────────────────────────────────
 * Organization API — maps to BE /api/organizations routes
 *
 * Auth + X-Organization-ID headers are injected automatically
 * by api-client.ts.
 * ───────────────────────────────────────────────────────── */

import { api } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/auth/types";
import type {
  Organization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
} from "../types";

const BASE = "/api/organizations" as const;

export const organizationApi = {
  /* ── Organization CRUD ───────────────────────────────────── */

  create: (payload: CreateOrganizationPayload) =>
    api
      .post<ApiEnvelope<Organization>>(BASE, { body: payload })
      .then((r) => r.data),

  listMine: () =>
    api
      .get<ApiEnvelope<Organization | Organization[]>>(BASE)
      .then((r) => (Array.isArray(r.data) ? r.data : [r.data])),

  getById: (id: string) =>
    api
      .get<ApiEnvelope<Organization>>(`${BASE}/${id}`)
      .then((r) => r.data),

  update: (id: string, payload: UpdateOrganizationPayload) =>
    api
      .patch<ApiEnvelope<Organization>>(`${BASE}/${id}`, { body: payload })
      .then((r) => r.data),

  /* ── Members ─────────────────────────────────────────────── */

  addMember: (orgId: string, payload: AddMemberPayload) =>
    api
      .post<ApiEnvelope<Organization>>(`${BASE}/${orgId}/members`, {
        body: payload,
      })
      .then((r) => r.data),

  removeMember: (orgId: string, memberId: string) =>
    api.delete<ApiEnvelope<null>>(
      `${BASE}/${orgId}/members/${memberId}`,
    ),

  updateMemberRole: (
    orgId: string,
    memberId: string,
    payload: UpdateMemberRolePayload,
  ) =>
    api
      .patch<ApiEnvelope<Organization>>(
        `${BASE}/${orgId}/members/${memberId}/role`,
        { body: payload },
      )
      .then((r) => r.data),

  /* ── Leave ───────────────────────────────────────────────── */

  leave: (orgId: string) =>
    api.post<ApiEnvelope<null>>(`${BASE}/${orgId}/leave`),
} as const;
