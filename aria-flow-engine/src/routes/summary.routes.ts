import { RequestHandler, Router } from 'express';
import { SummaryController } from '../controllers/summary.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  GenerateSummarySchema,
  SummaryQuerySchema,
  SummaryIdParamSchema,
  SessionSummaryParamSchema,
} from '../validations/summary.validation';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';
import { Role } from '../constants';

export interface SummaryRouterDependencies {
  controller: SummaryController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
  expensiveRateLimit: RequestHandler;
}

export const createSummaryRouter = (deps: SummaryRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // ============================================
  // STANDALONE ROUTES
  // ============================================

  router.get('/', deps.auth, deps.tenant, validateQuery(SummaryQuerySchema), requireTenantRole(Role.READ), deps.tenantScope.resolveAgentIds(), c.list);

  router.get('/:id', deps.auth, deps.tenant, validateParams(SummaryIdParamSchema), requireTenantRole(Role.READ), deps.tenantScope.summary(), c.getById);

  router.delete('/:id', deps.auth, deps.tenant, validateParams(SummaryIdParamSchema), requireTenantRole(Role.ADMIN), deps.tenantScope.summary(), c.delete);

  // ============================================
  // SESSION-SCOPED ROUTES
  // ============================================

  router.post(
    '/session/:sessionId',
    deps.auth,
    deps.tenant,
    deps.expensiveRateLimit,
    validateParams(SessionSummaryParamSchema),
    validateBody(GenerateSummarySchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.session('sessionId'),
    c.generate
  );

  router.get(
    '/session/:sessionId',
    deps.auth,
    deps.tenant,
    validateParams(SessionSummaryParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session('sessionId'),
    c.getBySessionId
  );

  router.put(
    '/session/:sessionId/regenerate',
    deps.auth,
    deps.tenant,
    deps.expensiveRateLimit,
    validateParams(SessionSummaryParamSchema),
    validateBody(GenerateSummarySchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.session('sessionId'),
    c.regenerate
  );

  return router;
};
