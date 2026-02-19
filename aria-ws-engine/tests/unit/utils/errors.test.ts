/**
 * Error Classes Unit Tests
 */

import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  isAppError,
  isOperationalError,
} from '@utils/errors';

// ── AppError (base) ──

describe('AppError', () => {
  it('sets message, statusCode, code, and isOperational', () => {
    const err = new AppError('boom', 503, 'CUSTOM_CODE', false);
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.isOperational).toBe(false);
  });

  it('defaults to statusCode 500, code INTERNAL_ERROR, isOperational true', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of AppError (prototype chain fixed)', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(AppError);
  });

  it('has a captured stack trace', () => {
    const err = new AppError('test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('errors.test.ts');
  });
});

// ── NotFoundError ──

describe('NotFoundError', () => {
  it('sets statusCode 404 and code NOT_FOUND', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isOperational).toBe(true);
  });

  it('formats message with identifier when provided', () => {
    const err = new NotFoundError('User', 'abc-123');
    expect(err.message).toBe("User with identifier 'abc-123' not found");
  });

  it('formats message without identifier when omitted', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
  });

  it('is an instance of AppError', () => {
    expect(new NotFoundError('X')).toBeInstanceOf(AppError);
  });
});

// ── ValidationError ──

describe('ValidationError', () => {
  it('sets statusCode 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('attaches the errors map', () => {
    const errors = { name: ['required'], email: ['invalid format'] };
    const err = new ValidationError('invalid', errors);
    expect(err.errors).toEqual(errors);
  });

  it('defaults errors to empty object when not provided', () => {
    const err = new ValidationError('bad');
    expect(err.errors).toEqual({});
  });
});

// ── UnauthorizedError ──

describe('UnauthorizedError', () => {
  it('sets statusCode 401 and code UNAUTHORIZED', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('uses default message "Unauthorized"', () => {
    expect(new UnauthorizedError().message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    expect(new UnauthorizedError('Token expired').message).toBe('Token expired');
  });
});

// ── ForbiddenError ──

describe('ForbiddenError', () => {
  it('sets statusCode 403 and code FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('uses default message "Forbidden"', () => {
    expect(new ForbiddenError().message).toBe('Forbidden');
  });

  it('accepts a custom message', () => {
    expect(new ForbiddenError('No access').message).toBe('No access');
  });
});

// ── ConflictError ──

describe('ConflictError', () => {
  it('sets statusCode 409 and code CONFLICT', () => {
    const err = new ConflictError('duplicate');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('duplicate');
  });
});

// ── RateLimitError ──

describe('RateLimitError', () => {
  it('sets statusCode 429 and code RATE_LIMIT_EXCEEDED', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('uses default message "Too many requests"', () => {
    expect(new RateLimitError().message).toBe('Too many requests');
  });

  it('accepts a custom message', () => {
    expect(new RateLimitError('Slow down').message).toBe('Slow down');
  });
});

// ── DatabaseError ──

describe('DatabaseError', () => {
  it('sets statusCode 500, code DATABASE_ERROR, isOperational false', () => {
    const err = new DatabaseError('connection lost');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('DATABASE_ERROR');
    expect(err.isOperational).toBe(false);
  });

  it('copies stack from originalError when provided', () => {
    const original = new Error('mongo fail');
    const err = new DatabaseError('connection lost', original);
    expect(err.stack).toBe(original.stack);
  });

  it('keeps its own stack when originalError is omitted', () => {
    const err = new DatabaseError('timeout');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('DatabaseError');
  });
});

// ── ExternalServiceError ──

describe('ExternalServiceError', () => {
  it('sets statusCode 502 and code EXTERNAL_SERVICE_ERROR', () => {
    const err = new ExternalServiceError('OpenAI', 'rate limited');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
  });

  it('prepends service name to message', () => {
    const err = new ExternalServiceError('OpenAI', 'rate limited');
    expect(err.message).toBe('OpenAI error: rate limited');
  });

  it('exposes the service property', () => {
    const err = new ExternalServiceError('Redis', 'timeout');
    expect(err.service).toBe('Redis');
  });
});

// ── Guard Functions ──

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError('x'))).toBe(true);
  });

  it('returns true for subclass instances', () => {
    expect(isAppError(new NotFoundError('x'))).toBe(true);
    expect(isAppError(new DatabaseError('x'))).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('x'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isAppError('string')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({ message: 'fake' })).toBe(false);
  });
});

describe('isOperationalError', () => {
  it('returns true for operational AppErrors', () => {
    expect(isOperationalError(new AppError('x'))).toBe(true);
    expect(isOperationalError(new NotFoundError('x'))).toBe(true);
  });

  it('returns false for non-operational AppErrors (DatabaseError)', () => {
    expect(isOperationalError(new DatabaseError('x'))).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(isOperationalError(new Error('x'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError(42)).toBe(false);
  });
});
