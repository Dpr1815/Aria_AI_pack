/**
 * AuthService Unit Tests
 */

import crypto from 'crypto';
import { AuthService } from '@services/auth/AuthService';
import { createMockSession } from '../../mocks/data/sessions.mock';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildSessionRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findByAccessTokenHash: jest.fn(),
    ...overrides,
  } as any;
}

describe('AuthService', () => {
  const RAW_TOKEN = 'test-access-token-abc123';

  describe('validateAccessToken', () => {
    it('returns valid with session for a good token', async () => {
      const session = createMockSession({ status: 'active' });
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockResolvedValue(session),
      });
      const service = new AuthService(repo);

      const result = await service.validateAccessToken(RAW_TOKEN);

      expect(result.valid).toBe(true);
      expect(result.session).toBe(session);
      expect(result.error).toBeUndefined();
    });

    it('hashes the token with SHA-256 before querying', async () => {
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockResolvedValue(null),
      });
      const service = new AuthService(repo);

      await service.validateAccessToken(RAW_TOKEN);

      expect(repo.findByAccessTokenHash).toHaveBeenCalledWith(hashToken(RAW_TOKEN));
    });

    it('rejects empty token', async () => {
      const repo = buildSessionRepo();
      const service = new AuthService(repo);

      const result = await service.validateAccessToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/no access token/i);
      expect(repo.findByAccessTokenHash).not.toHaveBeenCalled();
    });

    it('rejects when no session matches the token hash', async () => {
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockResolvedValue(null),
      });
      const service = new AuthService(repo);

      const result = await service.validateAccessToken('wrong-token');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid or expired/i);
    });

    it('rejects completed sessions', async () => {
      const session = createMockSession({ status: 'completed' });
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockResolvedValue(session),
      });
      const service = new AuthService(repo);

      const result = await service.validateAccessToken(RAW_TOKEN);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already completed/i);
    });

    it('rejects abandoned sessions', async () => {
      const session = createMockSession({ status: 'abandoned' });
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockResolvedValue(session),
      });
      const service = new AuthService(repo);

      const result = await service.validateAccessToken(RAW_TOKEN);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/abandoned/i);
    });

    it('propagates repository errors', async () => {
      const repo = buildSessionRepo({
        findByAccessTokenHash: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      });
      const service = new AuthService(repo);

      await expect(service.validateAccessToken(RAW_TOKEN)).rejects.toThrow('DB connection lost');
    });
  });
});
