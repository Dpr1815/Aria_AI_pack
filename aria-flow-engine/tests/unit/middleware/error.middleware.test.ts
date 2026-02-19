/**
 * Unit tests for error middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '../../../src/middleware/error.middleware';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ExternalServiceError,
} from '../../../src/utils/errors';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/test',
    method: 'GET',
    body: {},
    query: {},
    ...overrides,
  } as Request;
}

function mockRes(): { status: jest.Mock; json: jest.Mock } & Partial<Response> {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorMiddleware', () => {
  const next = jest.fn();

  it('should return 500 for generic errors', () => {
    const err = new Error('Something broke');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        }),
      })
    );
  });

  it('should return correct status code for AppError', () => {
    const err = new NotFoundError('User', '123');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found'),
        }),
      })
    );
  });

  it('should return 401 for UnauthorizedError', () => {
    const err = new UnauthorizedError('Invalid token');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 for ForbiddenError', () => {
    const err = new ForbiddenError('Access denied');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 502 for ExternalServiceError', () => {
    const err = new ExternalServiceError('OpenAI', 'timeout');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'EXTERNAL_SERVICE_ERROR',
        }),
      })
    );
  });

  it('should return 400 for ValidationError', () => {
    const err = new ValidationError('Bad input', {
      name: ['Required'],
      age: ['Must be a number'],
    });
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Bad input',
        }),
      })
    );
  });

  it('should use x-request-id from header when present', () => {
    const err = new Error('oops');
    const res = mockRes();

    errorMiddleware(err, mockReq({ headers: { 'x-request-id': 'req-123' } }), res as any, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          requestId: 'req-123',
        }),
      })
    );
  });

  it('should generate a requestId when none in header', () => {
    const err = new Error('oops');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    const body = res.json.mock.calls[0][0];
    expect(body.error.requestId).toBeDefined();
    expect(typeof body.error.requestId).toBe('string');
  });

  it('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('dev error');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    const body = res.json.mock.calls[0][0];
    expect(body.error.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('prod error');
    const res = mockRes();

    errorMiddleware(err, mockReq(), res as any, next);

    const body = res.json.mock.calls[0][0];
    expect(body.error.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('notFoundMiddleware', () => {
  it('should call next with 404 AppError', () => {
    const req = mockReq({ method: 'GET', path: '/unknown' });
    const next = jest.fn();

    notFoundMiddleware(req, mockRes() as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'ROUTE_NOT_FOUND',
        message: expect.stringContaining('/unknown'),
      })
    );
  });
});
