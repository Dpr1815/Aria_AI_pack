/**
 * Lip Sync Connector Interface
 *
 * Defines the contract for lip sync generation services.
 * Allows swapping Rhubarb for other providers.
 */

import type { VisemeCue, LipSyncResult } from '../../types/audio.types';

// ============================================
// Connector Interface
// ============================================

export interface ILipSyncConnector {
  /**
   * Generate lip sync data from audio.
   */
  generate(audioBuffer: Buffer, text?: string): Promise<LipSyncResult>;

  /**
   * Check if lip sync is enabled.
   */
  isEnabled(): boolean;

  /**
   * Check if the connector is ready.
   */
  isReady(): boolean;
}

// ============================================
// Configuration
// ============================================

export interface LipSyncConnectorConfig {
  /** Path to Rhubarb executable */
  executablePath?: string;
  /** Processing timeout in ms */
  timeoutMs?: number;
  /** Recognizer type */
  recognizer?: 'pocketSphinx' | 'phonetic';
  /** Extended shapes (A-H vs A-F) */
  extendedShapes?: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_LIPSYNC_CONFIG: LipSyncConnectorConfig = {
  executablePath: 'rhubarb',
  timeoutMs: 30000,
  recognizer: 'phonetic',
  extendedShapes: true,
};

// ============================================
// Viseme Morph Mappings
// ============================================

/**
 * Rhubarb viseme shapes to blend shape weights.
 * Uses viseme_* morph targets (Oculus lip sync) and valid ARKit
 * blend shapes that exist on Ready Player Me avatar models.
 *
 * Valid ARKit mouth targets: jawOpen, mouthClose, mouthFunnel,
 * mouthPucker, tongueOut (no mouthOpen or mouthSmile).
 */
export const VISEME_MORPHS: Record<string, Record<string, number>> = {
  A: {
    // Closed mouth (M, B, P)
    viseme_PP: 0.55,
    mouthClose: 0.4,
  },
  B: {
    // Slightly open (most consonants)
    viseme_DD: 0.25,
    jawOpen: 0.1,
  },
  C: {
    // Open (EH, AE)
    viseme_E: 0.35,
    viseme_aa: 0.2,
    jawOpen: 0.2,
  },
  D: {
    // Wide open (AA)
    viseme_aa: 0.45,
    jawOpen: 0.35,
  },
  E: {
    // Rounded (ER)
    viseme_RR: 0.35,
    jawOpen: 0.15,
  },
  F: {
    // Puckered (UW, OW, W)
    viseme_U: 0.35,
    mouthPucker: 0.35,
    mouthFunnel: 0.2,
  },
  G: {
    // Upper teeth on lower lip (F, V)
    viseme_FF: 0.4,
  },
  H: {
    // Tongue behind teeth (L)
    viseme_nn: 0.35,
    jawOpen: 0.12,
    tongueOut: 0.08,
  },
  X: {
    // Idle/rest
    viseme_sil: 0.05,
    mouthClose: 0.1,
  },
};

/**
 * Get morph weights for a viseme shape.
 */
export function getVisemeMorphs(shape: string): Record<string, number> {
  return VISEME_MORPHS[shape] ?? VISEME_MORPHS['X'];
}
