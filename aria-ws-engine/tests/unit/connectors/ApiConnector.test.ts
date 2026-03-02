/**
 * ApiConnector Unit Tests
 */

import { ApiConnector } from '@connectors/api/ApiConnector';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function okResponse(data: unknown = { id: '123' }) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

function errorResponse(status: number, body = 'Internal server error') {
  return {
    ok: false,
    status,
    json: jest.fn().mockRejectedValue(new Error('not json')),
    text: jest.fn().mockResolvedValue(body),
  };
}

describe('ApiConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createConnector(overrides: Record<string, unknown> = {}) {
    return new ApiConnector({
      baseUrl: 'http://api-server:8080',
      serviceToken: 'test-service-jwt',
      timeoutMs: 5000,
      ...overrides,
    });
  }

  // ── generateSummary ──

  describe('generateSummary', () => {
    it('calls correct URL with auth header', async () => {
      mockFetch.mockResolvedValue(okResponse());
      const connector = createConnector();

      await connector.generateSummary('session-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api-server:8080/internal/summaries/session/session-abc',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-service-jwt',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('strips trailing slashes from baseUrl', async () => {
      mockFetch.mockResolvedValue(okResponse());
      const connector = createConnector({ baseUrl: 'http://api-server:8080///' });

      await connector.generateSummary('session-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api-server:8080/internal/summaries/session/session-abc',
        expect.anything()
      );
    });

    it('returns success with data on 2xx', async () => {
      const data = { summaryId: 'sum-1' };
      mockFetch.mockResolvedValue(okResponse(data));
      const connector = createConnector();

      const result = await connector.generateSummary('session-abc');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('returns failure on HTTP error', async () => {
      mockFetch.mockResolvedValue(errorResponse(500, 'DB crashed'));
      const connector = createConnector();

      const result = await connector.generateSummary('session-abc');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('returns failure on network error (never throws)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      const connector = createConnector();

      const result = await connector.generateSummary('session-abc');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('passes AbortSignal for timeout', async () => {
      mockFetch.mockResolvedValue(okResponse());
      const connector = createConnector({ timeoutMs: 3000 });

      await connector.generateSummary('session-abc');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.signal).toBeDefined();
    });
  });

  // ── refreshStatistics ──

  describe('refreshStatistics', () => {
    it('calls correct URL with auth header', async () => {
      mockFetch.mockResolvedValue(okResponse());
      const connector = createConnector();

      await connector.refreshStatistics('agent-xyz');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api-server:8080/internal/statistics/agent-xyz/calculate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-service-jwt',
          }),
        })
      );
    });

    it('returns success with data on 2xx', async () => {
      const data = { refreshed: true };
      mockFetch.mockResolvedValue(okResponse(data));
      const connector = createConnector();

      const result = await connector.refreshStatistics('agent-xyz');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('returns failure on HTTP error', async () => {
      mockFetch.mockResolvedValue(errorResponse(503, 'Service unavailable'));
      const connector = createConnector();

      const result = await connector.refreshStatistics('agent-xyz');

      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });

    it('returns failure on network error (never throws)', async () => {
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));
      const connector = createConnector();

      const result = await connector.refreshStatistics('agent-xyz');

      expect(result.success).toBe(false);
      expect(result.error).toContain('DNS resolution failed');
    });
  });

  // ── Circuit Breaker ──

  describe('circuit breaker', () => {
    it('opens circuit after repeated failures', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));
      const connector = createConnector();

      // Trigger enough failures to open the circuit (threshold = 5)
      for (let i = 0; i < 6; i++) {
        await connector.generateSummary(`session-${i}`);
      }

      // Next call should fail immediately via circuit breaker (no fetch)
      mockFetch.mockClear();
      const result = await connector.generateSummary('session-blocked');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/circuit|open/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
