import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { UnauthorizedError } from '../utils/errors';
import { SessionDocument } from '../models/documents/session.document';

// ============================================
// NARROW INTERFACE (Interface Segregation)
// ============================================

/**
 * Minimal contract for session token validation.
 * SessionService satisfies this shape — the middleware never
 * imports or depends on the full service class.
 */
export interface SessionTokenValidator {
  validateAccessToken(token: string): Promise<{
    valid: boolean;
    session?: SessionDocument;
    payload?: { sub: string; pid: string; aid: string };
    error?: string;
  }>;
}

// ============================================
// REQUEST AUGMENTATION
// ============================================

export interface SessionAuthContext {
  sessionId: ObjectId;
  participantId: ObjectId;
  agentId: ObjectId;
  session: SessionDocument;
}

declare global {
  namespace Express {
    interface Request {
      sessionAuth?: SessionAuthContext;
    }
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Creates middleware that authenticates requests using a session access token.
 *
 * Used for participant-facing routes (e.g. video upload) where the caller
 * holds a session JWT rather than a user access token.
 */
export const createSessionAuthMiddleware = (tokenValidator: SessionTokenValidator) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req);

      if (!token) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
      }

      const result = await tokenValidator.validateAccessToken(token);

      if (!result.valid || !result.session || !result.payload) {
        throw new UnauthorizedError(result.error || 'Invalid session token');
      }

      req.sessionAuth = {
        sessionId: result.session._id,
        participantId: result.session.participantId,
        agentId: result.session.agentId,
        session: result.session,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================
// HELPERS
// ============================================

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
