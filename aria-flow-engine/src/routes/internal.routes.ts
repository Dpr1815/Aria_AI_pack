import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import {
  GenerateSummarySchema,
  SessionSummaryParamSchema,
  AgentStatisticsParamSchema,
} from '@validations';
import { StatisticsController, SummaryController } from '@controllers';

/**
 * Internal routes for service-to-service communication.
 * Protected by service token auth (long-lived JWT with type: 'service').
 * These routes are NOT exposed publicly — only reachable within the private network.
 */

export interface InternalRouterDependencies {
  summaryController: SummaryController;
  statisticsController: StatisticsController;
  serviceAuth: ReturnType<
    typeof import('../middleware/auth.middleware').createServiceAuthMiddleware
  >;
}

export const createInternalRouter = (deps: InternalRouterDependencies): Router => {
  const router = Router();

  // All internal routes require service token
  router.use(deps.serviceAuth);

  // POST /internal/summaries/session/:sessionId — trigger summary generation
  router.post(
    '/summaries/session/:sessionId',
    validateParams(SessionSummaryParamSchema),
    validateBody(GenerateSummarySchema),
    deps.summaryController.generate
  );

  router.post(
    '/statistics/:agentId/calculate',
    validateParams(AgentStatisticsParamSchema),
    deps.statisticsController.calculateAgentStatistics
  );

  return router;
};
