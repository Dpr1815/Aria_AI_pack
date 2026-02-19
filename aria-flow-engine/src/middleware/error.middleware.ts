import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ApiErrorResponse } from '@utils';
import { AppError, isAppError, isOperationalError, ValidationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorMiddleware');

/**
 * Global error handling middleware
 * Converts errors to consistent API error responses
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Log based on error type
  if (isOperationalError(err)) {
    logger.warn('Operational error', {
      requestId,
      code: (err as AppError).code,
      message: err.message,
      path: req.path,
      method: req.method,
    });
  } else {
    // Unexpected errors - log full details for debugging
    logger.error('Unexpected error', err, {
      requestId,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    });
  }

  // Build response
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  };

  let statusCode = 500;

  if (isAppError(err)) {
    statusCode = err.statusCode;
    response.error.code = err.code;
    response.error.message = err.message;

    // Include validation errors if present
    if (err instanceof ValidationError && Object.keys(err.errors).length > 0) {
      response.error.errors = err.errors;
    }
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found middleware for unmatched routes
 * Must be registered after all other routes
 */
export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route not found: ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};
