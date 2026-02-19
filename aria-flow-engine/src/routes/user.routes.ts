import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  UpdateUserSchema,
  SignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
} from '../validations/user.validation';

export interface UserRouterDependencies {
  controller: UserController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
  authRateLimit: RequestHandler;
}

export const createUserRouter = (deps: UserRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  // Public routes — strict per-IP rate limit (brute-force protection)
  router.post('/signup', deps.authRateLimit, validateBody(SignupSchema), c.signup);
  router.post('/login', deps.authRateLimit, validateBody(LoginSchema), c.login);
  router.post('/refresh', deps.authRateLimit, validateBody(RefreshTokenSchema), c.refresh);

  // Protected routes
  router.get('/me', deps.auth, c.getMe);
  router.patch('/me', deps.auth, validateBody(UpdateUserSchema), c.updateMe);
  router.post('/logout', deps.auth, c.logout);
  router.post('/logout-all', deps.auth, c.logoutAll);
  router.post('/change-password', deps.auth, validateBody(ChangePasswordSchema), c.changePassword);

  return router;
};
