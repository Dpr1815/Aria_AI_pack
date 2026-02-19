/**
 * Rhubarb Lip Sync Configuration
 *
 * Settings for Rhubarb lip sync generation.
 */

import type { LipSyncConnectorConfig } from '../connectors/lipsync/ILipSyncConnector';
import { logger } from '@utils';

// ============================================
// Environment Variables
// ============================================

const {
  RHUBARB_PATH = 'rhubarb',
  RHUBARB_TIMEOUT_MS = '30000',
  RHUBARB_RECOGNIZER = 'phonetic',
  RHUBARB_EXTENDED_SHAPES = 'true',
  LIPSYNC_ENABLED = 'true',
} = process.env;

// ============================================
// Configuration
// ============================================

export const rhubarbConfig: LipSyncConnectorConfig = {
  executablePath: RHUBARB_PATH,
  timeoutMs: parseInt(RHUBARB_TIMEOUT_MS, 10),
  recognizer: RHUBARB_RECOGNIZER as 'pocketSphinx' | 'phonetic',
  extendedShapes: RHUBARB_EXTENDED_SHAPES === 'true',
};

/**
 * Whether lip sync is enabled globally.
 */
export const lipSyncEnabled = LIPSYNC_ENABLED === 'true';

// ============================================
// Lip Sync Full Configuration
// ============================================

export interface LipSyncConfig {
  enabled: boolean;
  config: LipSyncConnectorConfig;
}

export const lipSyncConfig: LipSyncConfig = {
  enabled: lipSyncEnabled,
  config: rhubarbConfig,
};

// ============================================
// Validation
// ============================================

export function validateRhubarbConfig(): void {
  if (lipSyncEnabled && !rhubarbConfig.executablePath) {
    logger.warn('RHUBARB_PATH not set - using default "rhubarb"');
  }
}

/**
 * Check if Rhubarb is available in the system.
 * This is a quick sync check - for production, use async version.
 */
export function isRhubarbAvailable(): boolean {
  if (!lipSyncEnabled) {
    return false;
  }

  try {
    const { execSync } = require('child_process');
    execSync(`${rhubarbConfig.executablePath} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
