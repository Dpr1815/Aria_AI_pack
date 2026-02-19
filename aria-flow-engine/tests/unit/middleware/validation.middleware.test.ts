/**
 * Unit tests for validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
} from '../../../src/middleware/validation.middleware';
import { ValidationError } from '../../../src/utils/errors';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('validation middleware', () => {
  // ============================================
  // validate
  // ============================================

  describe('validate', () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    it('should pass validation and call next', () => {
      const req = mockReq({ body: { name: 'John', age: 30 } });
      const next = jest.fn();

      validate(schema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John', age: 30 });
    });

    it('should replace body with parsed (coerced) data', () => {
      const coerceSchema = z.object({ count: z.coerce.number() });
      const req = mockReq({ body: { count: '42' } });
      const next = jest.fn();

      validate(coerceSchema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.count).toBe(42);
    });

    it('should call next with ValidationError on invalid data', () => {
      const req = mockReq({ body: { name: 123 } });
      const next = jest.fn();

      validate(schema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Validation failed') }));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('Validation failed');
    });

    it('should format errors with field paths', () => {
      const req = mockReq({ body: {} });
      const next = jest.fn();

      validate(schema)(req, mockRes(), next);

      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.errors).toHaveProperty('name');
      expect(error.errors).toHaveProperty('age');
    });

    it('should validate query source', () => {
      const querySchema = z.object({ page: z.string() });
      const req = mockReq({ query: { page: '1' } });
      const next = jest.fn();

      validate(querySchema, 'query')(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate params source', () => {
      const paramsSchema = z.object({ id: z.string() });
      const req = mockReq({ params: { id: 'abc123' } });
      const next = jest.fn();

      validate(paramsSchema, 'params')(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass through non-Zod errors', () => {
      const badSchema = {
        parse: () => { throw new Error('unexpected'); },
      } as any;
      const req = mockReq();
      const next = jest.fn();

      validate(badSchema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0]).not.toBeInstanceOf(ValidationError);
    });
  });

  // ============================================
  // Shorthand helpers
  // ============================================

  describe('validateBody', () => {
    it('should validate req.body', () => {
      const schema = z.object({ ok: z.boolean() });
      const req = mockReq({ body: { ok: true } });
      const next = jest.fn();

      validateBody(schema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateQuery', () => {
    it('should validate req.query', () => {
      const schema = z.object({ q: z.string() });
      const req = mockReq({ query: { q: 'search' } });
      const next = jest.fn();

      validateQuery(schema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateParams', () => {
    it('should validate req.params', () => {
      const schema = z.object({ id: z.string() });
      const req = mockReq({ params: { id: 'test' } });
      const next = jest.fn();

      validateParams(schema)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ============================================
  // validateRequest (composite)
  // ============================================

  describe('validateRequest', () => {
    it('should validate params, query, and body in order', () => {
      const schemas = {
        params: z.object({ id: z.string() }),
        query: z.object({ page: z.string().optional() }),
        body: z.object({ name: z.string() }),
      };
      const req = mockReq({
        params: { id: '123' },
        query: { page: '1' },
        body: { name: 'test' },
      });
      const next = jest.fn();

      validateRequest(schemas)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should stop on first validation error', () => {
      const schemas = {
        params: z.object({ id: z.string().min(5) }),
        body: z.object({ name: z.string() }),
      };
      const req = mockReq({
        params: { id: 'ab' },
        body: { name: 'test' },
      });
      const next = jest.fn();

      validateRequest(schemas)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Validation failed') }));
    });

    it('should call next when no schemas provided', () => {
      const req = mockReq();
      const next = jest.fn();

      validateRequest({})(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate only body when only body schema provided', () => {
      const schemas = {
        body: z.object({ email: z.string().email() }),
      };
      const req = mockReq({ body: { email: 'bad' } });
      const next = jest.fn();

      validateRequest(schemas)(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Validation failed') }));
    });
  });
});
