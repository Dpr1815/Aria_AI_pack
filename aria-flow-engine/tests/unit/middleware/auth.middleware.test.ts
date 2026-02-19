/**
 * Unit tests for auth middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  createServiceAuthMiddleware,
} from '../../../src/middleware/auth.middleware';
import { createObjectId } from '@test/helpers/test-utils';

const JWT_SECRET = 'test-jwt-secret';
const SERVICE_SECRET = 'test-service-secret';

describe('auth middleware', () => {
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockUserRepository: any;

  beforeEach(() => {
    mockRes = {};
    mockNext = jest.fn();
    mockUserRepository = {
      findById: jest.fn(),
    };
  });

  // ============================================
  // extractBearerToken (tested indirectly)
  // ============================================

  describe('createAuthMiddleware', () => {
    let authMiddleware: ReturnType<typeof createAuthMiddleware>;

    beforeEach(() => {
      authMiddleware = createAuthMiddleware(JWT_SECRET, mockUserRepository);
    });

    it('should authenticate valid access token', async () => {
      const userId = createObjectId();
      const token = jwt.sign({ userId: userId.toString(), email: 'test@test.com', type: 'access' }, JWT_SECRET);
      const mockUser = {
        _id: userId,
        email: 'test@test.com',
        planId: 'plan_starter',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toEqual(expect.objectContaining({ email: 'test@test.com' }));
      expect(req.jwtPayload).toBeDefined();
    });

    it('should reject missing authorization header', async () => {
      const req = { headers: {} } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Missing') })
      );
    });

    it('should reject malformed authorization header', async () => {
      const req = { headers: { authorization: 'NotBearer token' } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Missing') })
      );
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'a@b.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: -1 }
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('expired') })
      );
    });

    it('should reject invalid token', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token.here' } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid access token') })
      );
    });

    it('should reject non-access token type', async () => {
      const token = jwt.sign({ userId: 'u1', email: 'a@b.com', type: 'refresh' }, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid token type') })
      );
    });

    it('should reject when userId is missing in payload', async () => {
      const token = jwt.sign({ email: 'a@b.com', type: 'access' }, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid token payload') })
      );
    });

    it('should reject when user not found in DB', async () => {
      const token = jwt.sign({ userId: 'u1', email: 'a@b.com', type: 'access' }, JWT_SECRET);
      mockUserRepository.findById.mockResolvedValue(null);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await authMiddleware(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('User not found') })
      );
    });
  });

  // ============================================
  // createOptionalAuthMiddleware
  // ============================================

  describe('createOptionalAuthMiddleware', () => {
    let optionalAuth: ReturnType<typeof createOptionalAuthMiddleware>;

    beforeEach(() => {
      optionalAuth = createOptionalAuthMiddleware(JWT_SECRET, mockUserRepository);
    });

    it('should skip auth when no token present', async () => {
      const req = { headers: {} } as any;
      await optionalAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('should authenticate when token is present', async () => {
      const userId = createObjectId();
      const token = jwt.sign({ userId: userId.toString(), email: 'a@b.com', type: 'access' }, JWT_SECRET);
      const mockUser = { _id: userId, email: 'a@b.com', planId: 'plan_starter' };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      await optionalAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });
  });

  // ============================================
  // createServiceAuthMiddleware
  // ============================================

  describe('createServiceAuthMiddleware', () => {
    let serviceAuth: ReturnType<typeof createServiceAuthMiddleware>;

    beforeEach(() => {
      serviceAuth = createServiceAuthMiddleware(SERVICE_SECRET);
    });

    it('should authenticate valid service token', () => {
      const token = jwt.sign({ service: 'flow-engine', type: 'service' }, SERVICE_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.serviceIdentity).toBe('flow-engine');
    });

    it('should reject missing token', () => {
      const req = { headers: {} } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Missing') })
      );
    });

    it('should reject expired service token', () => {
      const token = jwt.sign({ service: 'svc', type: 'service' }, SERVICE_SECRET, { expiresIn: -1 });
      const req = { headers: { authorization: `Bearer ${token}` } } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('expired') })
      );
    });

    it('should reject invalid service token', () => {
      const req = { headers: { authorization: 'Bearer bad.token.value' } } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid service token') })
      );
    });

    it('should reject non-service token type', () => {
      const token = jwt.sign({ service: 'svc', type: 'access' }, SERVICE_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('expected service token') })
      );
    });

    it('should reject token without service field', () => {
      const token = jwt.sign({ type: 'service' }, SERVICE_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } } as any;

      serviceAuth(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid service token payload') })
      );
    });
  });
});
