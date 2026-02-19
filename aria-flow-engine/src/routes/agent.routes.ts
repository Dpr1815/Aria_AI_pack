import { RequestHandler, Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentQuerySchema,
  AgentIdParamSchema,
  AgentGetByIdQuerySchema,
  GenerateAgentSchema,
  AgentStepKeyParamSchema,
  AgentPromptKeyParamSchema,
  UpdateStepSchema,
  AddStepSchema,
  UpdatePromptSchema,
  UpdateAssessmentSchema,
} from '../validations/agent.validation';
import { Role } from '../constants';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';
import { EntitlementMiddleware } from '../middleware/entitlement.middleware';

export interface AgentRouterDependencies {
  controller: AgentController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
  entitlement: EntitlementMiddleware;
  expensiveRateLimit: RequestHandler;
}

export const createAgentRouter = (deps: AgentRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // ============================================
  // AGENT CRUD ROUTES
  // ============================================

  router.post(
    '/',
    deps.auth,
    deps.tenant,
    validateBody(CreateAgentSchema),
    deps.entitlement.maxActiveAgents(),
    c.create
  );

  router.post('/generate', deps.auth, deps.tenant, deps.expensiveRateLimit, validateBody(GenerateAgentSchema), c.generate);

  router.get('/', deps.auth, deps.tenant, validateQuery(AgentQuerySchema), c.list);

  /**
   * GET /agents/:id
   *
   * Sparse fieldsets via `include` query parameter:
   * @example GET /agents/123                        → Metadata only (fastest)
   * @example GET /agents/123?include=steps          → With steps
   * @example GET /agents/123?include=steps,prompts  → With steps and prompts
   * @example GET /agents/123?include=all            → Full agent (steps, prompts, assessment)
   */
  router.get(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    validateQuery(AgentGetByIdQuerySchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getById
  );
  /**
   * GET /agents/:id/public
   *
   * Returns agent metadata only (name, description, avatar, etc.)
   * Used by the entry modal before session join.
   * No steps, no prompts, no assessment — by design.
   */
  router.get('/:id/public', validateParams(AgentIdParamSchema), c.getPublicProfile);
  router.patch(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    validateBody(UpdateAgentSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.update
  );

  router.delete(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.ADMIN),
    deps.tenantScope.agent(),
    c.delete
  );

  router.put(
    '/:id/activate',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    deps.entitlement.maxActiveAgents(),
    c.activate
  );

  router.put(
    '/:id/deactivate',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.deactivate
  );

  // ============================================
  // STEP ROUTES (nested under agent)
  // ============================================

  router.get(
    '/:id/steps',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.listSteps
  );

  /**
   * POST /agents/:id/steps
   * Add a new step to an agent
   * Creates step and compiles its prompt from inputs
   */
  router.post(
    '/:id/steps',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    validateBody(AddStepSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.addStep
  );

  router.get(
    '/:id/steps/:key',
    deps.auth,
    deps.tenant,
    validateParams(AgentStepKeyParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getStep
  );

  /**
   * PATCH /agents/:id/steps/:key
   * Update step inputs/label
   * If inputs change, prompt is automatically recompiled
   */
  router.patch(
    '/:id/steps/:key',
    deps.auth,
    deps.tenant,
    validateParams(AgentStepKeyParamSchema),
    validateBody(UpdateStepSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.updateStep
  );

  /**
   * DELETE /agents/:id/steps/:key
   * Remove a step from an agent
   * Also removes the associated prompt
   */
  router.delete(
    '/:id/steps/:key',
    deps.auth,
    deps.tenant,
    validateParams(AgentStepKeyParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.removeStep
  );

  // ============================================
  // PROMPT ROUTES (nested under agent)
  // ============================================

  router.get(
    '/:id/prompts',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.listPrompts
  );

  router.get(
    '/:id/prompts/:key',
    deps.auth,
    deps.tenant,
    validateParams(AgentPromptKeyParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getPrompt
  );

  router.patch(
    '/:id/prompts/:key',
    deps.auth,
    deps.tenant,
    validateParams(AgentPromptKeyParamSchema),
    validateBody(UpdatePromptSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.updatePrompt
  );

  // ============================================
  // ASSESSMENT ROUTES (nested under agent)
  // ============================================

  router.get(
    '/:id/assessment',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getAssessment
  );

  router.patch(
    '/:id/assessment',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    validateBody(UpdateAssessmentSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.agent(),
    c.updateAssessment
  );

  // ============================================
  // SESSION ROUTES (nested under agent)
  // ============================================

  /**
   * GET /agents/:id/sessions/stats
   * Get session statistics for this agent
   */
  router.get(
    '/:id/sessions/stats',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getSessionStats
  );

  // ============================================
  // CONVERSATION ROUTES (nested under agent)
  // ============================================

  /**
   * GET /agents/:id/conversations/stats
   * Get conversation statistics for this agent
   */
  router.get(
    '/:id/conversations/stats',
    deps.auth,
    deps.tenant,
    validateParams(AgentIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.agent(),
    c.getConversationStats
  );

  return router;
};
