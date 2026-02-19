import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { EntitlementMiddleware } from '../middleware/entitlement.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  AddMemberSchema,
  UpdateMemberRoleSchema,
  OrganizationIdParamSchema,
  MemberIdParamSchema,
} from '../validations/organization.validation';

export interface OrganizationRouterDependencies {
  controller: OrganizationController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  entitlement: EntitlementMiddleware;
}

export const createOrganizationRouter = (deps: OrganizationRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // Tenant resolves to PersonalTenant (no X-Organization-ID header at creation time)
  router.post('/', deps.auth, deps.tenant, deps.entitlement.canCreateOrganization(), validateBody(CreateOrganizationSchema), c.create);

  // No org context needed — returns the caller's own org
  router.get('/', deps.auth, c.getMyOrganization);

  // Service verifies membership
  router.get('/:id', deps.auth, validateParams(OrganizationIdParamSchema), c.getById);

  // Service verifies membership + ADMIN role
  router.patch(
    '/:id',
    deps.auth,
    validateParams(OrganizationIdParamSchema),
    validateBody(UpdateOrganizationSchema),
    c.update
  );

  router.post(
    '/:id/members',
    deps.auth,
    validateParams(OrganizationIdParamSchema),
    validateBody(AddMemberSchema),
    c.addMember
  );

  router.delete(
    '/:id/members/:memberId',
    deps.auth,
    validateParams(MemberIdParamSchema),
    c.removeMember
  );

  router.patch(
    '/:id/members/:memberId/role',
    deps.auth,
    validateParams(MemberIdParamSchema),
    validateBody(UpdateMemberRoleSchema),
    c.updateMemberRole
  );

  // Service verifies membership (any role can leave)
  router.post('/:id/leave', deps.auth, validateParams(OrganizationIdParamSchema), c.leave);

  return router;
};
