import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationSource = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, source: ValidationSource = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.') || 'root';
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(issue.message);
        }

        // Build descriptive message from errors
        const errorMessages = Object.entries(formattedErrors)
          .map(([path, messages]) => `${path}: ${messages.join(', ')}`)
          .join('; ');

        next(new ValidationError(`Validation failed: ${errorMessages}`, formattedErrors));
        return;
      }

      next(error);
    }
  };
};

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (schemas.params) {
      middlewares.push(validate(schemas.params, 'params'));
    }
    if (schemas.query) {
      middlewares.push(validate(schemas.query, 'query'));
    }
    if (schemas.body) {
      middlewares.push(validate(schemas.body, 'body'));
    }

    const runMiddleware = (index: number): void => {
      if (index >= middlewares.length) {
        next();
        return;
      }

      middlewares[index](req, res, (err?: unknown) => {
        if (err) {
          next(err);
          return;
        }
        runMiddleware(index + 1);
      });
    };

    runMiddleware(0);
  };
};
