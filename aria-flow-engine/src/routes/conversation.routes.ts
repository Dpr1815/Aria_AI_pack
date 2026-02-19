import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { validateParams, validateQuery } from '../middleware/validation.middleware';
import { ConversationBySessionParamSchema, MessageFilterSchema } from '@validations';
import { z } from 'zod';
import { Role } from '../constants';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';

const StepKeyParamSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  stepKey: z.string().min(1, 'Step key is required'),
});

export interface ConversationRouterDependencies {
  controller: ConversationController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
}

/**
 * Create conversation router
 * Mounted at /api/sessions/:sessionId/conversation
 */
export const createConversationRouter = (deps: ConversationRouterDependencies): Router => {
  const router = Router({ mergeParams: true });
  const c = deps.controller;

  /**
   * GET /sessions/:sessionId/conversation
   * Get full conversation with messages
   */
  router.get(
    '/',
    deps.auth,
    deps.tenant,
    validateParams(ConversationBySessionParamSchema),
    validateQuery(MessageFilterSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session('sessionId'),
    c.getBySessionId
  );

  /**
   * GET /sessions/:sessionId/conversation/messages
   * Get just the messages (lighter payload)
   */
  router.get(
    '/messages',
    deps.auth,
    deps.tenant,
    validateParams(ConversationBySessionParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session('sessionId'),
    c.getMessages
  );

  /**
   * GET /sessions/:sessionId/conversation/steps/:stepKey/messages
   * Get messages for a specific step
   */
  router.get(
    '/steps/:stepKey/messages',
    deps.auth,
    deps.tenant,
    validateParams(StepKeyParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session('sessionId'),
    c.getStepMessages
  );

  return router;
};
