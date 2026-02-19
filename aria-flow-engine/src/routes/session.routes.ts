import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { SessionController } from '../controllers/session.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  JoinSessionSchema,
  SessionIdParamSchema,
  SessionQuerySchema,
} from '../validations/session.validation';
import { VideoStepParamSchema, VideoUploadFieldsSchema } from '../validations/video.validation';
import { requireTenantRole } from '../middleware/tenant.middleware';
import { TenantScopeMiddleware } from '../middleware/tenant-scope.middleware';
import { Role } from '../constants';

export interface SessionRouterDependencies {
  controller: SessionController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  tenant: ReturnType<typeof import('../middleware/tenant.middleware').createTenantMiddleware>;
  tenantScope: TenantScopeMiddleware;
  sessionAuth: ReturnType<
    typeof import('../middleware/session-auth.middleware').createSessionAuthMiddleware
  >;
  videoUpload: multer.Multer;
  authRateLimit: RequestHandler;
}

export const createSessionRouter = (deps: SessionRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // ============================================
  // PUBLIC ROUTES (no auth required)
  // ============================================

  /**
   * POST /sessions/join
   * Join a session - creates participant if needed, handles persistence
   * Returns access token for WebSocket connection
   */
  router.post('/join', deps.authRateLimit, validateBody(JoinSessionSchema), c.join);

  /**
   * POST /sessions/test
   * Test join - allows agent owner/org member to join regardless of agent status.
   * Same body as /join but requires auth + tenant context.
   * Agent ownership is verified in the service layer.
   */
  router.post('/test', deps.auth, deps.tenant, validateBody(JoinSessionSchema), c.testJoin);

  // ============================================
  // SESSION-AUTH ROUTES (participant access token)
  // ============================================

  /**
   * POST /sessions/:id/upload-video
   * Upload a video recording for a session step
   * Content-Type: multipart/form-data
   * @field video - The video file (video/webm)
   * @field step  - The step name this recording belongs to
   */
  router.post(
    '/:id/upload-video',
    deps.sessionAuth,
    deps.videoUpload.single('video'),
    validateBody(VideoUploadFieldsSchema),
    c.uploadVideo
  );

  // ============================================
  // PROTECTED ROUTES (auth + tenant required)
  // ============================================

  /**
   * GET /sessions/:id/video-urls
   * Get fresh signed URLs for all videos in a session
   */
  router.get(
    '/:id/video-urls',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session(),
    c.getVideoUrls
  );

  /**
   * GET /sessions/:id/video-url/:step
   * Get fresh signed URL for a single video
   */
  router.get(
    '/:id/video-url/:step',
    deps.auth,
    deps.tenant,
    validateParams(VideoStepParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session(),
    c.getVideoUrl
  );

  /**
   * GET /sessions
   * List sessions with filters
   * @query agentId - Filter by agent
   * @query participantId - Filter by participant
   * @query status - Filter by status (active, completed, abandoned)
   */
  router.get(
    '/',
    deps.auth,
    deps.tenant,
    validateQuery(SessionQuerySchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.resolveAgentIds(),
    c.list
  );

  /**
   * GET /sessions/:id
   * Get session details
   */
  router.get(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session(),
    c.getById
  );

  /**
   * POST /sessions/:id/complete
   * Mark session as completed
   */
  router.post(
    '/:id/complete',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.session(),
    c.complete
  );

  /**
   * POST /sessions/:id/abandon
   * Mark session as abandoned
   */
  router.post(
    '/:id/abandon',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.WRITE),
    deps.tenantScope.session(),
    c.abandon
  );

  /**
   * POST /sessions/:id/refresh-token
   * Refresh access token for a session
   */
  router.post(
    '/:id/refresh-token',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.READ),
    deps.tenantScope.session(),
    c.refreshToken
  );

  /**
   * DELETE /sessions/:id
   * Delete session and its conversation
   */
  router.delete(
    '/:id',
    deps.auth,
    deps.tenant,
    validateParams(SessionIdParamSchema),
    requireTenantRole(Role.ADMIN),
    deps.tenantScope.session(),
    c.delete
  );

  return router;
};
