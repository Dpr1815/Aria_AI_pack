/**
 * Unit tests for GoogleTokenManager
 *
 * Tests token caching, expiry detection, refresh scheduling,
 * stop/cleanup, and singleton management.
 */

import {
  GoogleTokenManager,
  createTokenManager,
  getTokenManager,
  resetTokenManager,
} from '@connectors/google/GoogleTokenManager';

// Mock google-auth-library
jest.mock('google-auth-library', () => {
  const mockGetAccessToken = jest.fn();
  const mockCredentials: Record<string, unknown> = {};

  const mockClient = {
    getAccessToken: mockGetAccessToken,
    credentials: mockCredentials,
  };

  const mockGetClient = jest.fn().mockResolvedValue(mockClient);

  return {
    GoogleAuth: jest.fn().mockImplementation(() => ({
      getClient: mockGetClient,
    })),
    OAuth2Client: jest.fn(),
    __mockClient: mockClient,
    __mockGetClient: mockGetClient,
    __mockGetAccessToken: mockGetAccessToken,
  };
});

// Access mock internals
const googleAuthMocks = jest.requireMock('google-auth-library');

describe('GoogleTokenManager', () => {
  let manager: GoogleTokenManager;

  /** Suppress unhandled EventEmitter 'error' events in tests that expect throws */
  const suppressErrorEvents = (m: GoogleTokenManager) => {
    m.on('error', () => {});
  };

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new GoogleTokenManager({ refreshBufferMs: 5 * 60 * 1000 });

    // Reset mock state
    googleAuthMocks.__mockGetAccessToken.mockReset();
    googleAuthMocks.__mockGetClient.mockReset();

    // Default: successful token fetch
    const expiryDate = Date.now() + 3600 * 1000; // 1 hour from now
    googleAuthMocks.__mockClient.credentials = { expiry_date: expiryDate };
    googleAuthMocks.__mockGetAccessToken.mockResolvedValue({ token: 'test-access-token' });
    googleAuthMocks.__mockGetClient.mockResolvedValue(googleAuthMocks.__mockClient);
  });

  afterEach(() => {
    manager.stop();
    jest.useRealTimers();
    resetTokenManager();
  });

  // ============================================
  // getTokenInfo / isTokenValid — initial state
  // ============================================

  describe('initial state', () => {
    it('should have no token before initialization', () => {
      expect(manager.getTokenInfo()).toBeNull();
      expect(manager.isTokenValid()).toBe(false);
    });
  });

  // ============================================
  // initialize
  // ============================================

  describe('initialize', () => {
    it('should fetch token and schedule refresh', async () => {
      await manager.initialize();

      expect(manager.getTokenInfo()).not.toBeNull();
      expect(manager.getTokenInfo()!.accessToken).toBe('test-access-token');
      expect(manager.getTokenInfo()!.tokenType).toBe('Bearer');
      expect(manager.isTokenValid()).toBe(true);
    });

    it('should throw when auth fails', async () => {
      suppressErrorEvents(manager);
      googleAuthMocks.__mockGetClient.mockRejectedValue(new Error('Auth failed'));

      await expect(manager.initialize()).rejects.toThrow('Auth failed');
    });
  });

  // ============================================
  // getToken
  // ============================================

  describe('getToken', () => {
    it('should return cached token when valid', async () => {
      await manager.initialize();

      // Reset call count after initialize
      googleAuthMocks.__mockGetAccessToken.mockClear();

      const token = await manager.getToken();

      expect(token).toBe('test-access-token');
      // Should NOT have called refresh again
      expect(googleAuthMocks.__mockGetAccessToken).not.toHaveBeenCalled();
    });

    it('should refresh when no token exists', async () => {
      const token = await manager.getToken();

      expect(token).toBe('test-access-token');
      expect(googleAuthMocks.__mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should refresh when token is expiring soon', async () => {
      // Set token that expires within the buffer window (< 5 minutes)
      const nearExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
      googleAuthMocks.__mockClient.credentials = { expiry_date: nearExpiry };
      await manager.initialize();

      // Token should be expiring soon since 2min < 5min buffer
      googleAuthMocks.__mockGetAccessToken.mockClear();
      googleAuthMocks.__mockGetAccessToken.mockResolvedValue({ token: 'refreshed-token' });
      googleAuthMocks.__mockClient.credentials = { expiry_date: Date.now() + 3600 * 1000 };

      const token = await manager.getToken();

      expect(token).toBe('refreshed-token');
      expect(googleAuthMocks.__mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should throw when refresh fails and no token', async () => {
      suppressErrorEvents(manager);
      googleAuthMocks.__mockGetAccessToken.mockResolvedValue({ token: null });

      await expect(manager.getToken()).rejects.toThrow('No access token received');
    });
  });

  // ============================================
  // refreshToken
  // ============================================

  describe('refreshToken', () => {
    it('should emit refreshed event on success', async () => {
      const listener = jest.fn();
      manager.on('refreshed', listener);

      await manager.refreshToken();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'test-access-token',
          tokenType: 'Bearer',
        })
      );
    });

    it('should emit error event on failure', async () => {
      const listener = jest.fn();
      manager.on('error', listener);

      const error = new Error('Network error');
      googleAuthMocks.__mockGetClient.mockRejectedValue(error);

      await expect(manager.refreshToken()).rejects.toThrow('Network error');
      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should throw when no token received', async () => {
      suppressErrorEvents(manager);
      googleAuthMocks.__mockGetAccessToken.mockResolvedValue({ token: null });

      await expect(manager.refreshToken()).rejects.toThrow('No access token received');
    });

    it('should default to 1 hour expiry when no expiry_date in credentials', async () => {
      googleAuthMocks.__mockClient.credentials = {}; // no expiry_date
      const before = Date.now();

      await manager.refreshToken();

      const tokenInfo = manager.getTokenInfo();
      expect(tokenInfo).not.toBeNull();
      // Should be approximately 1 hour from now
      const expiresMs = tokenInfo!.expiresAt.getTime() - before;
      expect(expiresMs).toBeGreaterThanOrEqual(3600 * 1000 - 100);
      expect(expiresMs).toBeLessThanOrEqual(3600 * 1000 + 100);
    });
  });

  // ============================================
  // stop
  // ============================================

  describe('stop', () => {
    it('should clear token and timer', async () => {
      await manager.initialize();
      expect(manager.getTokenInfo()).not.toBeNull();

      manager.stop();

      expect(manager.getTokenInfo()).toBeNull();
      expect(manager.isTokenValid()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      manager.stop();
      manager.stop();
      expect(manager.getTokenInfo()).toBeNull();
    });
  });

  // ============================================
  // isTokenValid
  // ============================================

  describe('isTokenValid', () => {
    it('should return false when no token', () => {
      expect(manager.isTokenValid()).toBe(false);
    });

    it('should return true when token is fresh', async () => {
      await manager.initialize();
      expect(manager.isTokenValid()).toBe(true);
    });

    it('should return false when token is expiring within buffer', async () => {
      const nearExpiry = Date.now() + 2 * 60 * 1000; // 2 min < 5 min buffer
      googleAuthMocks.__mockClient.credentials = { expiry_date: nearExpiry };

      await manager.initialize();

      expect(manager.isTokenValid()).toBe(false);
    });
  });

  // ============================================
  // Singleton functions
  // ============================================

  describe('singleton management', () => {
    afterEach(() => {
      resetTokenManager();
    });

    it('createTokenManager should return a new instance each time', () => {
      const a = createTokenManager();
      const b = createTokenManager();

      expect(a).not.toBe(b);
      a.stop();
      b.stop();
    });

    it('getTokenManager should return the same instance', () => {
      const a = getTokenManager();
      const b = getTokenManager();

      expect(a).toBe(b);
      a.stop();
    });

    it('resetTokenManager should clear the singleton', () => {
      const a = getTokenManager();
      resetTokenManager();
      const b = getTokenManager();

      expect(a).not.toBe(b);
      b.stop();
    });
  });
});
