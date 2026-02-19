/**
 * Auth Service
 *
 * Handles WebSocket connection authentication.
 *
 * DESIGN:
 * - Sessions are created by the agent configuration project (not by the WS engine)
 * - The WS engine only validates existing access tokens
 * - Token hash is stored in SessionDocument.accessTokenHash
 * - Validation checks hash match + expiry
 */

import crypto from 'crypto';
import type { SessionRepository } from '@repositories';
import type { SessionDocument } from '@models';

// ============================================
// Types
// ============================================

export interface AuthResult {
  valid: boolean;
  session?: SessionDocument;
  error?: string;
}

// ============================================
// Auth Service Class
// ============================================

export class AuthService {
  constructor(private sessionRepo: SessionRepository) {}

  /**
   * Validate an access token for WebSocket connection.
   *
   * 1. Hash the raw token
   * 2. Look up session by hash (also checks expiry via query)
   * 3. Return session if valid
   */
  async validateAccessToken(accessToken: string): Promise<AuthResult> {
    if (!accessToken) {
      return { valid: false, error: 'No access token provided' };
    }

    const tokenHash = this.hashToken(accessToken);
    const session = await this.sessionRepo.findByAccessTokenHash(tokenHash);

    if (!session) {
      return { valid: false, error: 'Invalid or expired access token' };
    }

    if (session.status === 'completed') {
      return { valid: false, error: 'Session already completed' };
    }

    if (session.status === 'abandoned') {
      return { valid: false, error: 'Session has been abandoned' };
    }

    return { valid: true, session };
  }

  /**
   * Hash a raw access token using SHA-256.
   * Matches the hashing used when the token was created.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// ============================================
// Error Class
// ============================================

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================
// Factory
// ============================================

export function createAuthService(sessionRepo: SessionRepository): AuthService {
  return new AuthService(sessionRepo);
}
