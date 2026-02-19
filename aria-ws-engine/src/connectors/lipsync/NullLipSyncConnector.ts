/**
 * Null Lip Sync Connector
 *
 * No-op implementation when lip sync is disabled.
 * Returns empty cues without processing.
 */

import type { LipSyncResult } from '../../types/audio.types';
import type { ILipSyncConnector } from './ILipSyncConnector';

// ============================================
// Null Connector Class
// ============================================

export class NullLipSyncConnector implements ILipSyncConnector {
  /**
   * Generate returns empty result.
   */
  async generate(_audioBuffer: Buffer, text?: string): Promise<LipSyncResult> {
    return {
      cues: [],
      duration: 0,
      text: text ?? '',
    };
  }

  /**
   * Lip sync is disabled.
   */
  isEnabled(): boolean {
    return false;
  }

  /**
   * Always ready (nothing to initialize).
   */
  isReady(): boolean {
    return true;
  }
}

// ============================================
// Factory Function
// ============================================

export function createNullLipSyncConnector(): NullLipSyncConnector {
  return new NullLipSyncConnector();
}
