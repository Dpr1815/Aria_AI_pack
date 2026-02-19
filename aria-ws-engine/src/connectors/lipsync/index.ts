/**
 * Lip Sync Connector Index
 */

export type { ILipSyncConnector, LipSyncConnectorConfig } from './ILipSyncConnector';

export { DEFAULT_LIPSYNC_CONFIG, VISEME_MORPHS, getVisemeMorphs } from './ILipSyncConnector';

export { RhubarbConnector, createRhubarbConnector } from './RhubarbConnector';

export { NullLipSyncConnector, createNullLipSyncConnector } from './NullLipSyncConnector';

// ============================================
// Factory Helper
// ============================================

import type { ILipSyncConnector, LipSyncConnectorConfig } from './ILipSyncConnector';
import { RhubarbConnector } from './RhubarbConnector';
import { NullLipSyncConnector } from './NullLipSyncConnector';

/**
 * Create lip sync connector based on enabled flag.
 */
export function createLipSyncConnector(
  enabled: boolean,
  config?: Partial<LipSyncConnectorConfig>
): ILipSyncConnector {
  if (enabled) {
    return new RhubarbConnector(config);
  }
  return new NullLipSyncConnector();
}
