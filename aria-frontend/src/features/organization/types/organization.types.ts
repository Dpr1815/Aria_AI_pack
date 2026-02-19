/* ─────────────────────────────────────────────────────────
 * Organization Types — mirrors BE DTOs + request payloads
 * ───────────────────────────────────────────────────────── */

/** Roles a member can have in an organization (mirrors BE Role enum) */
export type OrgRole = "role_admin" | "role_write" | "role_read";

/** A member within an organization (mirrors BE OrganizationMemberDTO) */
export interface OrganizationMember {
  userId: string;
  email: string;
  role: OrgRole;
  addedAt: string;
  updatedAt?: string;
}

/** Full organization (mirrors BE OrganizationDTO) */
export interface Organization {
  _id: string;
  name: string;
  logoUrl?: string;
  creatorId: string;
  members: OrganizationMember[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Request payloads ────────────────────────────────────── */

export interface CreateOrganizationPayload {
  name: string;
  logoUrl?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  logoUrl?: string | null;
  active?: boolean;
}

export interface AddMemberPayload {
  email: string;
  role: OrgRole;
}

export interface UpdateMemberRolePayload {
  role: OrgRole;
}

/* ── Active org context (for store) ──────────────────────── */

export interface ActiveOrganization {
  _id: string;
  name: string;
  logoUrl?: string;
  role: OrgRole;
}
