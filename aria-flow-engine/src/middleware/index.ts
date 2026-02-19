import { RequestHandler } from 'express';
import multer from 'multer';
import { AppConfig } from '@config';
import { Repositories } from '@repositories';
import { Services } from '@services';
import { ICacheConnector } from '@connectors';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  createServiceAuthMiddleware,
} from './auth.middleware';
import { createTenantMiddleware } from './tenant.middleware';
import { createTenantScopeMiddleware, TenantScopeMiddleware } from './tenant-scope.middleware';
import { createEntitlementMiddleware, EntitlementMiddleware } from './entitlement.middleware';
import { createSessionAuthMiddleware } from './session-auth.middleware';
import { createVideoUpload } from './upload.middleware';
import {
  createGlobalRateLimit,
  createAuthRateLimit,
  createExpensiveRateLimit,
} from './rate-limit.middleware';

export interface Middleware {
  auth: ReturnType<typeof createAuthMiddleware>;
  optionalAuth: ReturnType<typeof createOptionalAuthMiddleware>;
  serviceAuth: ReturnType<typeof createServiceAuthMiddleware>;
  tenant: ReturnType<typeof createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
  entitlement: EntitlementMiddleware;
  sessionAuth: ReturnType<typeof createSessionAuthMiddleware>;
  videoUpload: multer.Multer;
  globalRateLimit: RequestHandler;
  authRateLimit: RequestHandler;
  expensiveRateLimit: RequestHandler;
}

export function createMiddleware(
  config: AppConfig,
  repositories: Repositories,
  services: Services,
  cache?: ICacheConnector
): Middleware {
  return {
    auth: createAuthMiddleware(config.server.accessTokenSecret, repositories.user),
    optionalAuth: createOptionalAuthMiddleware(config.server.accessTokenSecret, repositories.user),
    serviceAuth: createServiceAuthMiddleware(config.server.serviceTokenSecret),
    tenant: createTenantMiddleware(repositories.organization),
    tenantScope: createTenantScopeMiddleware(repositories.agent, repositories.session, repositories.summary),
    entitlement: createEntitlementMiddleware(repositories.agent, repositories.user),
    sessionAuth: createSessionAuthMiddleware(services.session),
    videoUpload: createVideoUpload(config.storage),
    globalRateLimit: createGlobalRateLimit(cache),
    authRateLimit: createAuthRateLimit(cache),
    expensiveRateLimit: createExpensiveRateLimit(cache),
  };
}

export * from './auth.middleware';
export * from './tenant.middleware';
export * from './tenant-scope.middleware';
export * from './entitlement.middleware';
export * from './session-auth.middleware';
export * from './upload.middleware';
export * from './validation.middleware';
export * from './error.middleware';
export * from './rate-limit.middleware';
