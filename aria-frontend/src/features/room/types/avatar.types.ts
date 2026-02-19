/* ─────────────────────────────────────────────
 * Avatar Feature — Type Definitions
 * ───────────────────────────────────────────── */

import type { VisemeCue } from "./room.types";

/** Morph target blend values keyed by ARKit morph name */
export type MorphTargetMap = Record<string, number>;

/** Lip-sync cue with optional detailed morph blends from the backend */
export interface LipSyncCue extends VisemeCue {
  morphs?: MorphTargetMap;
}

/** Payload from the `avatarLipSyncData` CustomEvent */
export interface LipSyncEventDetail {
  cues: LipSyncCue[];
  duration: number;
  text: string;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  chunkIndex: number;
}

/** Payload from the `avatarAudioStart` CustomEvent */
export interface AudioStartEventDetail {
  startTime: number;
}

/** Happy-neutral expression preset values */
export interface NeutralExpression {
  readonly mouthSmileLeft: number;
  readonly mouthSmileRight: number;
  readonly browInnerUp: number;
  readonly mouthDimpleLeft: number;
}

/** All viseme IDs supported by the lip-sync system */
export type VisemeId =
  | "sil"
  | "PP"
  | "FF"
  | "TH"
  | "DD"
  | "kk"
  | "CH"
  | "SS"
  | "nn"
  | "RR"
  | "aa"
  | "E"
  | "I"
  | "O"
  | "U";
