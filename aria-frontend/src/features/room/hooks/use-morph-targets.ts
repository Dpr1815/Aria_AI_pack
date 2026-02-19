import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { LipSyncRefs } from "./use-lip-sync-events";
import type { VisemeId } from "../types";
import {
  MORPH_LERP_SPEED,
  NEUTRAL_EXPRESSION,
  BLINK_INTERVAL_MS,
  BLINK_DURATION_MS,
  VISEME_INTENSITIES,
  MOUTH_MORPH_NAMES,
} from "../constants";

/* ─────────────────────────────────────────────
 * useMorphTargets
 * ─────────────────────────────────────────────
 * Frame-level morph target animation system.
 * Drives lip sync, idle blinking, and neutral
 * expression on the avatar's SkinnedMesh nodes.
 *
 * Must be used inside a React Three Fiber
 * <Canvas> context (calls useFrame).
 * ───────────────────────────────────────────── */

/** Set a single morph target value on all meshes that have it */
function applyMorphToMeshes(
  meshes: THREE.SkinnedMesh[],
  morphName: string,
  value: number,
) {
  for (const mesh of meshes) {
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dict || !influences) continue;

    const index = dict[morphName];
    if (index === undefined) continue;

    influences[index] = value;
  }
}

export function useMorphTargets(
  meshesRef: React.RefObject<THREE.SkinnedMesh[]>,
  lipSync: LipSyncRefs | null,
): void {
  const currentMorphs = useRef<Record<string, number>>({});
  const targetMorphs = useRef<Record<string, number>>({});
  const lastBlinkTime = useRef(performance.now());
  const isBlinking = useRef(false);
  const blinkStartTime = useRef(0);
  const lastViseme = useRef<string | null>(null);
  const cueSearchIndex = useRef(0);

  useFrame((_state, rawDelta) => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;

    // Clamp delta to avoid morph overshoot after tab switch
    // (browser pauses rAF while hidden, first frame back has huge delta)
    const delta = Math.min(rawDelta, 0.05);

    const targets = targetMorphs.current;
    const current = currentMorphs.current;
    const now = performance.now();

    /* ── Blink system ── */
    if (!isBlinking.current) {
      const jitter = (Math.random() - 0.5) * BLINK_INTERVAL_MS * 0.5;
      if (now - lastBlinkTime.current > BLINK_INTERVAL_MS + jitter) {
        isBlinking.current = true;
        blinkStartTime.current = now;
        targets["eyeBlinkLeft"] = 0.9;
        targets["eyeBlinkRight"] = 0.9;
      }
    } else if (now - blinkStartTime.current > BLINK_DURATION_MS) {
      isBlinking.current = false;
      lastBlinkTime.current = now;
      targets["eyeBlinkLeft"] = 0;
      targets["eyeBlinkRight"] = 0;
    }

    /* ── Lip sync vs neutral expression ── */
    if (lipSync?.isSpeakingRef.current) {
      const elapsed =
        performance.now() / 1000 - lipSync.audioStartTimeRef.current;
      const cues = lipSync.cuesRef.current;

      // Clamp search index when cues array changes (e.g. new message)
      if (cueSearchIndex.current >= cues.length) {
        cueSearchIndex.current = 0;
      }

      // Advance the search index to find the current cue
      while (
        cueSearchIndex.current < cues.length - 1 &&
        elapsed >= (cues[cueSearchIndex.current + 1]?.start ?? Infinity)
      ) {
        cueSearchIndex.current++;
      }

      // Also go back if needed (edge case)
      while (
        cueSearchIndex.current > 0 &&
        elapsed < (cues[cueSearchIndex.current]?.start ?? 0)
      ) {
        cueSearchIndex.current--;
      }

      const cue = cues[cueSearchIndex.current];

      if (cue && elapsed >= cue.start && elapsed < cue.end) {
        if (cue.value !== lastViseme.current) {
          // Clear all mouth morphs for clean transition
          for (const morphName of MOUTH_MORPH_NAMES) {
            targets[morphName] = 0;
          }

          // Apply morph blend data if available, otherwise use fallback
          if (cue.morphs) {
            for (const [morphName, intensity] of Object.entries(cue.morphs)) {
              targets[morphName] = intensity;
            }
          } else {
            const visemeId = cue.value.replace("viseme_", "") as VisemeId;
            const mapping = VISEME_INTENSITIES[visemeId];
            targets[mapping.morphName] = mapping.intensity;
          }

          lastViseme.current = cue.value;
        }
      }

      // Subtle expression during speech (don't override lip morphs)
      if (!cue?.morphs?.mouthSmileLeft) {
        targets["mouthSmileLeft"] = 0.025;
        targets["mouthSmileRight"] = 0.025;
      }
      targets["browInnerUp"] = 0.015;
    } else {
      // Not speaking — return to neutral
      lastViseme.current = null;
      cueSearchIndex.current = 0;

      for (const morphName of MOUTH_MORPH_NAMES) {
        targets[morphName] = 0;
      }

      targets["mouthSmileLeft"] = NEUTRAL_EXPRESSION.mouthSmileLeft;
      targets["mouthSmileRight"] = NEUTRAL_EXPRESSION.mouthSmileRight;
      targets["browInnerUp"] = NEUTRAL_EXPRESSION.browInnerUp;
      targets["mouthDimpleLeft"] = NEUTRAL_EXPRESSION.mouthDimpleLeft;
    }

    /* ── Smooth lerp all morphs toward targets ── */
    const allMorphNames = new Set([
      ...Object.keys(targets),
      ...Object.keys(current),
    ]);

    for (const morphName of allMorphNames) {
      const target = targets[morphName] ?? 0;
      const curr = current[morphName] ?? 0;

      if (Math.abs(curr - target) < 0.001) {
        if (curr !== target) {
          current[morphName] = target;
          applyMorphToMeshes(meshes, morphName, target);
        }
        continue;
      }

      const next = curr + (target - curr) * MORPH_LERP_SPEED * delta;
      current[morphName] = next;
      applyMorphToMeshes(meshes, morphName, next);
    }
  });
}
