import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { UnauthorizedError } from '../utils/errors';
import { PlanId } from '../constants';
import { UserRepository } from '../repositories/user.repository';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Service-to-service JWT payload.
 * Used for internal communication between microservices (e.g., conversation engine → API server).
 * These tokens have long expiration (1 year) and bypass user-level auth.
 */
export interface ServiceTokenPayload {
  service: string;
  type: 'service';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  _id: ObjectId;
  email: string;
  organizationId?: ObjectId;
  planId: PlanId;
}

export interface RefreshContext {
  userAgent?: string;
  ipAddress?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      jwtPayload?: AccessTokenPayload;
      serviceIdentity?: string;
    }
  }
}

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
};

export const createAuthMiddleware = (jwtSecret: string, userRepository: UserRepository) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req);

      if (!token) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
      }

      let payload: AccessTokenPayload;

      try {
        payload = jwt.verify(token, jwtSecret) as AccessTokenPayload;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedError('Access token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedError('Invalid access token');
        }
        throw error;
      }

      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      if (!payload.userId || !payload.email) {
        throw new UnauthorizedError('Invalid token payload');
      }

      req.jwtPayload = payload;

      const user = await userRepository.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      req.user = {
        _id: user._id,
        email: user.email,
        organizationId: user.organizationId,
        planId: user.planId,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const createOptionalAuthMiddleware = (jwtSecret: string, userRepository: UserRepository) => {
  const authMiddleware = createAuthMiddleware(jwtSecret, userRepository);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);

    if (!token) {
      next();
      return;
    }

    await authMiddleware(req, res, next);
  };
};

/**
 * Service-to-service auth middleware.
 * Validates a long-lived JWT with type: 'service', used exclusively for
 * internal communication between microservices (e.g., conversation engine → API server).
 * Skips user DB lookup — sets req.serviceIdentity instead.
 */
export const createServiceAuthMiddleware = (serviceTokenSecret: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = extractBearerToken(req);

      if (!token) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
      }

      let payload: ServiceTokenPayload;

      try {
        payload = jwt.verify(token, serviceTokenSecret) as ServiceTokenPayload;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedError('Service token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedError('Invalid service token');
        }
        throw error;
      }

      if (payload.type !== 'service') {
        throw new UnauthorizedError('Invalid token type: expected service token');
      }

      if (!payload.service) {
        throw new UnauthorizedError('Invalid service token payload');
      }

      req.serviceIdentity = payload.service;

      next();
    } catch (error) {
      next(error);
    }
  };
};
