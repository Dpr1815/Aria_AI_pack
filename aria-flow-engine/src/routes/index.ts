import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { Connectors } from '@connectors';
import { Controllers } from '@controllers';
import { Middleware, errorMiddleware, notFoundMiddleware } from '@middleware';

import { createHealthRouter } from './health.routes';
import { createUserRouter } from './user.routes';
import { createOrganizationRouter } from './organization.routes';
import { createAgentRouter } from './agent.routes';
import { createSessionRouter } from './session.routes';
import { createConversationRouter } from './conversation.routes';
import { createParticipantRouter } from './participant.routes';
import { createSummaryRouter } from './summary.routes';
import { createStatisticsRouter } from './statistics.routes';
import { createInternalRouter } from './internal.routes';
import { requestLogger } from '@utils/logger';
import { createCategoryRouter } from './category.routes';

export function createExpressApp(
  connectors: Connectors,
  controllers: Controllers,
  middleware: Middleware
): Application {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID'],
    })
  );

  // Parsing & compression
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(requestLogger());

  // Health check (public)
  app.use('/health', createHealthRouter({ db: connectors.database }));

  // ============================================
  // INTERNAL SERVICE-TO-SERVICE ROUTES
  // Protected by service token, not user auth.
  // ============================================
  app.use(
    '/internal',
    createInternalRouter({
      summaryController: controllers.summary,
      statisticsController: controllers.statistics,
      serviceAuth: middleware.serviceAuth,
    })
  );
  // ============================================
  // GLOBAL RATE LIMIT
  // Applied to all /api routes below.
  // Health and internal routes above are exempt.
  // ============================================
  app.use('/api', middleware.globalRateLimit);

  app.use(
    '/api/categories',
    createCategoryRouter({
      controller: controllers.stepCategory,
      auth: middleware.auth,
    })
  );
  // User routes (mixed public/protected)
  app.use(
    '/api/users',
    createUserRouter({
      controller: controllers.user,
      auth: middleware.auth,
      authRateLimit: middleware.authRateLimit,
    })
  );

  // Organization routes (all protected — service handles membership/role checks)
  app.use(
    '/api/organizations',
    createOrganizationRouter({
      controller: controllers.organization,
      auth: middleware.auth,
      tenant: middleware.tenant,
      entitlement: middleware.entitlement,
    })
  );

  // Agent routes (all protected)
  app.use(
    '/api/agents',
    createAgentRouter({
      controller: controllers.agent,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
      entitlement: middleware.entitlement,
      expensiveRateLimit: middleware.expensiveRateLimit,
    })
  );

  // Session routes (mixed public/protected)
  app.use(
    '/api/sessions',
    createSessionRouter({
      controller: controllers.session,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
      sessionAuth: middleware.sessionAuth,
      videoUpload: middleware.videoUpload,
      authRateLimit: middleware.authRateLimit,
    })
  );
  // Session conversation sub-routes
  app.use(
    '/api/sessions/:sessionId/conversation',
    createConversationRouter({
      controller: controllers.conversation,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
    })
  );

  // Participant routes (all protected)
  app.use(
    '/api/participants',
    createParticipantRouter({
      controller: controllers.participant,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
    })
  );

  // Summary routes (all protected)
  app.use(
    '/api/summaries',
    createSummaryRouter({
      controller: controllers.summary,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
      expensiveRateLimit: middleware.expensiveRateLimit,
    })
  );

  // Statistics routes (all protected)
  app.use(
    '/api/statistics',
    createStatisticsRouter({
      controller: controllers.statistics,
      auth: middleware.auth,
      tenant: middleware.tenant,
      tenantScope: middleware.tenantScope,
    })
  );

  // Error handling
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export * from './health.routes';
export * from './user.routes';
export * from './organization.routes';
export * from './agent.routes';
export * from './participant.routes';
export * from './session.routes';
export * from './conversation.routes';
export * from './summary.routes';
export * from './statistics.routes';
export * from './internal.routes';
