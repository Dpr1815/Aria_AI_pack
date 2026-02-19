/**
 * Google Connector Index
 *
 * Shared Google Cloud utilities used by STT and TTS connectors.
 */

export {
  GoogleTokenManager,
  createTokenManager,
  getTokenManager,
  resetTokenManager,
  type TokenManagerConfig,
  type TokenInfo,
  type TokenEventType,
} from './GoogleTokenManager';
