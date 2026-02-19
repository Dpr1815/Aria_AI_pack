import { Router } from 'express';
import { ParticipantController } from '../controllers/participant.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  ParticipantIdParamSchema,
  ParticipantEmailParamSchema,
  UpdateParticipantSchema,
  ParticipantQuerySchema,
} from '../validations/participant.validation';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';
import { Role } from '../constants';

export interface ParticipantRouterDependencies {
  controller: ParticipantController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
}

export const createParticipantRouter = (deps: ParticipantRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // ============================================
  // PARTICIPANT ROUTES
  // ============================================

  /**
   * GET /participants
   * List participants with filters
   * @query agentId - Filter by agent (participants who have sessions with this agent)
   */
  router.get('/', deps.auth, deps.tenant, validateQuery(ParticipantQuerySchema), requireTenantRole(Role.READ), deps.tenantScope.resolveAgentIds(), c.list);

  /**
   * GET /participants/email/:email
   * Get participant by email
   */
  router.get('/email/:email', deps.auth, deps.tenant, validateParams(ParticipantEmailParamSchema), requireTenantRole(Role.READ), c.getByEmail);

  /**
   * GET /participants/:id
   * Get participant by ID
   */
  router.get('/:id', deps.auth, deps.tenant, validateParams(ParticipantIdParamSchema), requireTenantRole(Role.READ), c.getById);

  /**
   * PATCH /participants/:id
   * Update participant (name, metadata only - email is immutable)
   */
  router.patch(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(ParticipantIdParamSchema),
    validateBody(UpdateParticipantSchema),
    requireTenantRole(Role.WRITE),
    c.update
  );

  /**
   * DELETE /participants/:id
   * Delete participant and cascade delete all sessions/conversations
   */
  router.delete(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(ParticipantIdParamSchema),
    requireTenantRole(Role.ADMIN),
    c.delete
  );

  return router;
};
