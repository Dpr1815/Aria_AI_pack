/**
 * Logger Unit Tests
 *
 * Tests for the AsyncLocalStorage context functions and requestLogger middleware.
 * The global mock from setup.ts is removed for this file so we can test the real module.
 */

jest.unmock('@utils/logger');

import {
  getContext,
  runWithContext,
  setContextValue,
  attachUserContext,
  requestLogger,
  createLogger,
  logger,
} from '@utils/logger';

// ── AsyncLocalStorage context ──

describe('getContext', () => {
  it('returns empty object when called outside any context', () => {
    expect(getContext()).toEqual({});
  });
});

describe('runWithContext', () => {
  it('provides the context to getContext within the callback', () => {
    const ctx = { requestId: 'req-123', userId: 'user-1' };
    runWithContext(ctx, () => {
      expect(getContext()).toEqual(ctx);
    });
  });

  it('isolates context from the outer scope', () => {
    runWithContext({ requestId: 'inner' }, () => {
      expect(getContext().requestId).toBe('inner');
    });
    expect(getContext()).toEqual({});
  });

  it('returns the callback return value', () => {
    const result = runWithContext({}, () => 42);
    expect(result).toBe(42);
  });

  it('propagates context to async continuations', async () => {
    await runWithContext({ requestId: 'async-ctx' }, async () => {
      await Promise.resolve();
      expect(getContext().requestId).toBe('async-ctx');
    });
  });
});

describe('setContextValue', () => {
  it('mutates the current store inside a runWithContext call', () => {
    runWithContext({}, () => {
      setContextValue('customKey', 'customVal');
      expect(getContext()).toEqual({ customKey: 'customVal' });
    });
  });

  it('does nothing when called outside a runWithContext (no store)', () => {
    setContextValue('orphan', 'value');
    expect(getContext()).toEqual({});
  });
});

describe('attachUserContext', () => {
  it('sets userId on the current store', () => {
    runWithContext({}, () => {
      attachUserContext('user-abc');
      expect(getContext().userId).toBe('user-abc');
    });
  });

  it('sets organizationId when provided', () => {
    runWithContext({}, () => {
      attachUserContext('user-abc', 'org-xyz');
      expect(getContext().organizationId).toBe('org-xyz');
    });
  });

  it('does not set organizationId when omitted', () => {
    runWithContext({}, () => {
      attachUserContext('user-abc');
      expect(getContext().organizationId).toBeUndefined();
    });
  });
});

// ── requestLogger middleware ──

describe('requestLogger', () => {
  function buildReqRes(overrides: Record<string, any> = {}) {
    const req = {
      headers: {},
      method: 'GET',
      path: '/test',
      query: {},
      ...overrides.req,
    } as any;

    const finishCallbacks: Array<() => void> = [];
    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallbacks.push(cb);
      }),
      ...overrides.res,
    } as any;

    const next = jest.fn();

    return { req, res, next, finishCallbacks };
  }

  it('calls next()', () => {
    const { req, res, next } = buildReqRes();
    requestLogger()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('attaches requestId to req', () => {
    const { req, res, next } = buildReqRes();
    requestLogger()(req, res, next);
    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
  });

  it('uses x-request-id header when present', () => {
    const { req, res, next } = buildReqRes({
      req: { headers: { 'x-request-id': 'custom-id' } },
    });
    requestLogger()(req, res, next);
    expect(req.requestId).toBe('custom-id');
  });

  it('generates a UUID when x-request-id header is absent', () => {
    const { req, res, next } = buildReqRes();
    requestLogger()(req, res, next);
    // UUID v4 format: 8-4-4-4-12
    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('sets x-request-id response header', () => {
    const { req, res, next } = buildReqRes();
    requestLogger()(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });

  it('registers a finish handler on res', () => {
    const { req, res, next } = buildReqRes();
    requestLogger()(req, res, next);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});

// ── createLogger ──

describe('createLogger', () => {
  it('returns an object with all log level methods', () => {
    const log = createLogger('TestService');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.fatal).toBe('function');
  });

  it('does not throw when calling log methods', () => {
    const log = createLogger('TestService');
    expect(() => log.info('hello')).not.toThrow();
    expect(() => log.error('fail', new Error('e'))).not.toThrow();
    expect(() => log.error('fail', { key: 'val' })).not.toThrow();
  });
});

// ── logger singleton ──

describe('logger', () => {
  it('has all log level methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('does not throw when calling error with an Error instance', () => {
    expect(() => logger.error('msg', new Error('test'))).not.toThrow();
  });

  it('does not throw when calling error with a plain object', () => {
    expect(() => logger.error('msg', { detail: 'info' })).not.toThrow();
  });

  it('does not throw when calling error with no second argument', () => {
    expect(() => logger.error('msg')).not.toThrow();
  });
});
