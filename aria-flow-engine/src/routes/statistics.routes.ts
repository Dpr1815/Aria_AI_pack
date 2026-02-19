import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';
import { validateParams } from '../middleware/validation.middleware';
import { AgentStatisticsParamSchema } from '../validations/statistics.validation';
import { Role } from '../constants';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';

export interface StatisticsRouterDependencies {
  controller: StatisticsController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
}

export const createStatisticsRouter = (deps: StatisticsRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  router.get(
    '/agent/:agentId',
    deps.auth,
    deps.tenant,
    validateParams(AgentStatisticsParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent('agentId'),
    c.getAgentStatistics
  );

  router.post(
    '/agent/:agentId/calculate',
    deps.auth,
    deps.tenant,
    validateParams(AgentStatisticsParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent('agentId'),
    c.calculateAgentStatistics
  );

  router.delete(
    '/agent/:agentId',
    deps.auth,
    deps.tenant,
    validateParams(AgentStatisticsParamSchema),
    requireTenantRole(Role.ADMIN),
    deps.tenantScope.agent('agentId'),
    c.deleteAgentStatistics
  );

  return router;
};
