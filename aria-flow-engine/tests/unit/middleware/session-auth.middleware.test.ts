/**
 * Unit tests for session-auth middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import {
  createSessionAuthMiddleware,
  SessionTokenValidator,
} from '../../../src/middleware/session-auth.middleware';
import { UnauthorizedError } from '../../../src/utils/errors';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('session-auth middleware', () => {
  let mockValidator: jest.Mocked<SessionTokenValidator>;
  let middleware: ReturnType<typeof createSessionAuthMiddleware>;

  const sessionId = new ObjectId();
  const participantId = new ObjectId();
  const agentId = new ObjectId();

  const mockSession = {
    _id: sessionId,
    participantId,
    agentId,
    agentOwnerId: new ObjectId(),
    status: 'active' as const,
    currentStep: 'intro',
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockValidator = {
      validateAccessToken: jest.fn(),
    };
    middleware = createSessionAuthMiddleware(mockValidator);
  });

  it('should set sessionAuth context on successful token validation', async () => {
    mockValidator.validateAccessToken.mockResolvedValue({
      valid: true,
      session: mockSession as any,
      payload: {
        sub: sessionId.toString(),
        pid: participantId.toString(),
        aid: agentId.toString(),
      },
    });

    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.sessionAuth).toBeDefined();
    expect(req.sessionAuth!.sessionId).toEqual(sessionId);
    expect(req.sessionAuth!.participantId).toEqual(participantId);
    expect(req.sessionAuth!.agentId).toEqual(agentId);
  });

  it('should call next with UnauthorizedError when no Authorization header', async () => {
    const req = mockReq({ headers: {} });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), statusCode: 401 }));
  });

  it('should call next with UnauthorizedError for malformed header', async () => {
    const req = mockReq({ headers: { authorization: 'NotBearer token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), statusCode: 401 }));
  });

  it('should call next with UnauthorizedError when token is invalid', async () => {
    mockValidator.validateAccessToken.mockResolvedValue({
      valid: false,
      error: 'Token expired',
    });

    const req = mockReq({ headers: { authorization: 'Bearer expired-token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), statusCode: 401 }));
  });

  it('should call next with UnauthorizedError when session is missing from result', async () => {
    mockValidator.validateAccessToken.mockResolvedValue({
      valid: true,
      payload: { sub: 'x', pid: 'y', aid: 'z' },
    });

    const req = mockReq({ headers: { authorization: 'Bearer no-session-token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), statusCode: 401 }));
  });

  it('should call next with error when validator throws', async () => {
    mockValidator.validateAccessToken.mockRejectedValue(new Error('DB down'));

    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should extract token from Bearer prefix case-insensitively', async () => {
    mockValidator.validateAccessToken.mockResolvedValue({
      valid: true,
      session: mockSession as any,
      payload: {
        sub: sessionId.toString(),
        pid: participantId.toString(),
        aid: agentId.toString(),
      },
    });

    const req = mockReq({ headers: { authorization: 'bearer my-token' } });
    const next = jest.fn();

    await middleware(req, mockRes(), next);

    expect(mockValidator.validateAccessToken).toHaveBeenCalledWith('my-token');
    expect(next).toHaveBeenCalledWith();
  });
});
