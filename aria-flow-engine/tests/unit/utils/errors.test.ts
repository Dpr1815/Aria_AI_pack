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
} from '../../../src/utils/errors';

// ============================================
// AppError (base)
// ============================================

describe('AppError', () => {
  it('should create with default values', () => {
    const error = new AppError('Something went wrong');

    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.stack).toBeDefined();
  });

  it('should accept custom statusCode, code, and isOperational', () => {
    const error = new AppError('Custom', 418, 'TEAPOT', false);

    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.isOperational).toBe(false);
  });

  it('should maintain correct prototype chain', () => {
    const error = new AppError('test');

    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================
// Specialized Errors
// ============================================

describe('NotFoundError', () => {
  it('should create with resource name only', () => {
    const error = new NotFoundError('User');

    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.isOperational).toBe(true);
  });

  it('should create with resource name and identifier', () => {
    const error = new NotFoundError('User', '123');

    expect(error.message).toBe("User with identifier '123' not found");
    expect(error.statusCode).toBe(404);
  });
});

describe('ValidationError', () => {
  it('should create with message only', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors).toEqual({});
  });

  it('should create with field errors', () => {
    const errors = { email: ['Required', 'Must be valid'], name: ['Too short'] };
    const error = new ValidationError('Validation failed', errors);

    expect(error.errors).toEqual(errors);
    expect(error.errors.email).toHaveLength(2);
  });
});

describe('UnauthorizedError', () => {
  it('should create with default message', () => {
    const error = new UnauthorizedError();

    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create with custom message', () => {
    const error = new UnauthorizedError('Token expired');

    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('should create with default message', () => {
    const error = new ForbiddenError();

    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should create with custom message', () => {
    const error = new ForbiddenError('Requires admin role');

    expect(error.message).toBe('Requires admin role');
  });
});

describe('ConflictError', () => {
  it('should create with the given message', () => {
    const error = new ConflictError('Email already exists');

    expect(error.message).toBe('Email already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('should create with default message', () => {
    const error = new RateLimitError();

    expect(error.message).toBe('Too many requests');
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should create with custom message', () => {
    const error = new RateLimitError('Retry after 30s');

    expect(error.message).toBe('Retry after 30s');
  });
});

describe('DatabaseError', () => {
  it('should create with message and mark as non-operational', () => {
    const error = new DatabaseError('Connection lost');

    expect(error.message).toBe('Connection lost');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.isOperational).toBe(false);
  });

  it('should preserve original error stack trace', () => {
    const original = new Error('Mongo timeout');
    const error = new DatabaseError('Query failed', original);

    expect(error.stack).toBe(original.stack);
  });

  it('should work without original error', () => {
    const error = new DatabaseError('Unknown DB error');

    expect(error.stack).toBeDefined();
  });
});

describe('ExternalServiceError', () => {
  it('should include service name in message', () => {
    const error = new ExternalServiceError('OpenAI', 'Rate limited');

    expect(error.message).toBe('OpenAI error: Rate limited');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.service).toBe('OpenAI');
  });
});

// ============================================
// Type Guards
// ============================================

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    expect(isAppError(new AppError('test'))).toBe(true);
    expect(isAppError(new NotFoundError('User'))).toBe(true);
    expect(isAppError(new DatabaseError('fail'))).toBe(true);
  });

  it('should return false for plain Error instances', () => {
    expect(isAppError(new Error('test'))).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError(42)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});

describe('isOperationalError', () => {
  it('should return true for operational AppErrors', () => {
    expect(isOperationalError(new NotFoundError('User'))).toBe(true);
    expect(isOperationalError(new UnauthorizedError())).toBe(true);
    expect(isOperationalError(new ForbiddenError())).toBe(true);
    expect(isOperationalError(new ValidationError('bad'))).toBe(true);
    expect(isOperationalError(new ConflictError('dup'))).toBe(true);
    expect(isOperationalError(new RateLimitError())).toBe(true);
    expect(isOperationalError(new ExternalServiceError('X', 'Y'))).toBe(true);
  });

  it('should return false for non-operational AppErrors', () => {
    expect(isOperationalError(new DatabaseError('fail'))).toBe(false);
  });

  it('should return false for non-AppError values', () => {
    expect(isOperationalError(new Error('plain'))).toBe(false);
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError('string')).toBe(false);
  });
});
