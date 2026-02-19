/* ─────────────────────────────────────────────────────────
 * Organization Feature — public API
 * ───────────────────────────────────────────────────────── */

/* Components */
export { OrgDetailPage, OrgFormModal, OrgSwitcher, MemberList } from "./components";

/* Hooks */
export {
  useOrganization,
  useMyOrganizations,
  useOrganizationMutations,
  orgKeys,
} from "./hooks";

/* Store */
export { useOrgStore } from "./stores/organization.store";

/* API */
export { organizationApi } from "./api";

/* Types */
export type {
  Organization,
  OrganizationMember,
  OrgRole,
  ActiveOrganization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
} from "./types";

/* Constants */
export { ORG_STORAGE_KEY } from "./constants";
