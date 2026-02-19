/* ─────────────────────────────────────────────
 * Avatar Constants
 * ─────────────────────────────────────────────
 * Tunable parameters for the 3D avatar system:
 * viseme mapping, expression presets, animation
 * timing, camera, and lighting configuration.
 * ───────────────────────────────────────────── */

import type { NeutralExpression, VisemeId } from "../types";

/** Morph lerp speed — higher = snappier transitions */
export const MORPH_LERP_SPEED = 5.0;

/** Happy-neutral expression applied at rest */
export const NEUTRAL_EXPRESSION: NeutralExpression = {
  mouthSmileLeft: 0.04,
  mouthSmileRight: 0.04,
  browInnerUp: 0.02,
  mouthDimpleLeft: 0.015,
};

/** Average interval between idle blinks (ms) */
export const BLINK_INTERVAL_MS = 4000;

/** Duration of a single blink (ms) */
export const BLINK_DURATION_MS = 150;

/** Camera settings for close-up head/neck framing */
export const CAMERA_CONFIG = {
  fov: 35,
  position: [0, 0.05, 0.8] as const,
  near: 0.1,
  far: 100,
} as const;

/**
 * Viseme intensity mapping.
 * Maps each viseme ID to the morph target name and its peak intensity.
 * Used as fallback when cues don't include detailed `morphs` blends.
 */
export const VISEME_INTENSITIES: Record<
  VisemeId,
  { morphName: string; intensity: number }
> = {
  sil: { morphName: "viseme_sil", intensity: 0.0 },
  aa: { morphName: "viseme_aa", intensity: 0.5 },
  E: { morphName: "viseme_E", intensity: 0.35 },
  I: { morphName: "viseme_I", intensity: 0.25 },
  O: { morphName: "viseme_O", intensity: 0.4 },
  U: { morphName: "viseme_U", intensity: 0.35 },
  PP: { morphName: "viseme_PP", intensity: 0.45 },
  FF: { morphName: "viseme_FF", intensity: 0.4 },
  TH: { morphName: "viseme_TH", intensity: 0.35 },
  DD: { morphName: "viseme_DD", intensity: 0.3 },
  kk: { morphName: "viseme_kk", intensity: 0.2 },
  CH: { morphName: "viseme_CH", intensity: 0.35 },
  SS: { morphName: "viseme_SS", intensity: 0.25 },
  nn: { morphName: "viseme_nn", intensity: 0.25 },
  RR: { morphName: "viseme_RR", intensity: 0.3 },
};

/**
 * All mouth-related morph target names.
 * Cleared between visemes for clean lip-sync transitions.
 */
export const MOUTH_MORPH_NAMES: readonly string[] = [
  "viseme_sil",
  "viseme_PP",
  "viseme_FF",
  "viseme_TH",
  "viseme_DD",
  "viseme_kk",
  "viseme_CH",
  "viseme_SS",
  "viseme_nn",
  "viseme_RR",
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
  "jawOpen",
  "mouthClose",
  "mouthFunnel",
  "mouthPucker",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "tongueOut",
];

/** Material enhancement presets for GLB meshes */
export const MATERIAL_PRESETS = {
  skin: { minRoughness: 0.5, metalness: 0, envMapIntensity: 0.4 },
  eyes: { roughness: 0.1, metalness: 0, envMapIntensity: 1.0 },
  hair: {
    roughness: 0.6,
    metalness: 0,
    alphaTest: 0.5,
    doubleSided: true,
  },
} as const;
