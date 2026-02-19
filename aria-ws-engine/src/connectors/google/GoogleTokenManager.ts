/**
 * Google Token Manager
 *
 * Manages OAuth2 tokens for Google Cloud APIs (STT & TTS).
 * Handles automatic token refresh before expiry.
 * Shared by both STT and TTS connectors.
 */

import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { EventEmitter } from 'events';
import { createLogger, ExternalServiceError } from '@utils';

const logger = createLogger('GoogleTokenManager');

// ============================================
// Types
// ============================================

export interface TokenManagerConfig {
  credentialsPath?: string;
  scopes?: string[];
  refreshBufferMs?: number;
}

export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  tokenType: string;
}

export type TokenEventType = 'refreshed' | 'error' | 'expired';

// ============================================
// Constants
// ============================================

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

// ============================================
// Google Token Manager Class
// ============================================

export class GoogleTokenManager extends EventEmitter {
  private auth: GoogleAuth;
  private client: OAuth2Client | null = null;
  private currentToken: TokenInfo | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly config: Required<TokenManagerConfig>;

  constructor(config: TokenManagerConfig = {}) {
    super();

    this.config = {
      credentialsPath: config.credentialsPath ?? process.env.GCS_KEY_FILE_PATH ?? '',
      scopes: config.scopes ?? DEFAULT_SCOPES,
      refreshBufferMs: config.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS,
    };

    this.auth = new GoogleAuth({
      keyFile: this.config.credentialsPath || undefined,
      scopes: this.config.scopes,
    });
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Initialize the token manager and get initial token.
   */
  async initialize(): Promise<void> {
    await this.refreshToken();
    this.scheduleRefresh();
  }

  /**
   * Get a valid access token.
   * Refreshes automatically if expired or about to expire.
   */
  async getToken(): Promise<string> {
    if (!this.currentToken || this.isTokenExpiringSoon()) {
      await this.refreshToken();
    }

    if (!this.currentToken) {
      throw new ExternalServiceError('GoogleAuth', 'Failed to obtain access token');
    }

    return this.currentToken.accessToken;
  }

  /**
   * Get current token info.
   */
  getTokenInfo(): TokenInfo | null {
    return this.currentToken;
  }

  /**
   * Check if token is valid and not expiring soon.
   */
  isTokenValid(): boolean {
    return this.currentToken !== null && !this.isTokenExpiringSoon();
  }

  /**
   * Force token refresh.
   */
  async refreshToken(): Promise<void> {
    try {
      this.client = (await this.auth.getClient()) as OAuth2Client;
      const tokenResponse = await this.client.getAccessToken();

      if (!tokenResponse.token) {
        throw new ExternalServiceError('GoogleAuth', 'No access token received');
      }

      // Get expiry time
      const credentials = this.client.credentials;
      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      this.currentToken = {
        accessToken: tokenResponse.token,
        expiresAt,
        tokenType: 'Bearer',
      };

      this.emit('refreshed', this.currentToken);
      logger.info('Token refreshed', { expiresAt: expiresAt.toISOString() });
    } catch (error) {
      this.emit('error', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new ExternalServiceError('GoogleAuth', message);
    }
  }

  /**
   * Stop the token manager and clear refresh timer.
   */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.currentToken = null;
    this.client = null;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Check if token is expiring soon.
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.currentToken) return true;

    const bufferTime = new Date(Date.now() + this.config.refreshBufferMs);
    return this.currentToken.expiresAt <= bufferTime;
  }

  /**
   * Schedule automatic token refresh.
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.currentToken) return;

    // Calculate time until refresh needed
    const refreshAt = this.currentToken.expiresAt.getTime() - this.config.refreshBufferMs;
    const delay = Math.max(refreshAt - Date.now(), 60000); // At least 1 minute

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
        this.scheduleRefresh();
      } catch (error) {
        logger.error('Auto-refresh failed', error instanceof Error ? error : undefined);
        // Retry in 1 minute
        this.refreshTimer = setTimeout(() => this.scheduleRefresh(), 60000);
      }
    }, delay);

    logger.info('Next refresh scheduled', { delaySeconds: Math.round(delay / 1000) });
  }

  // ============================================
  // Event Emitter Overrides
  // ============================================

  override on(event: TokenEventType, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  override emit(event: TokenEventType, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}

// ============================================
// Singleton Pattern
// ============================================

let instance: GoogleTokenManager | null = null;

/**
 * Create a new token manager instance.
 */
export function createTokenManager(config?: TokenManagerConfig): GoogleTokenManager {
  return new GoogleTokenManager(config);
}

/**
 * Get or create singleton token manager.
 */
export function getTokenManager(config?: TokenManagerConfig): GoogleTokenManager {
  if (!instance) {
    instance = new GoogleTokenManager(config);
  }
  return instance;
}

/**
 * Reset singleton instance.
 */
export function resetTokenManager(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
