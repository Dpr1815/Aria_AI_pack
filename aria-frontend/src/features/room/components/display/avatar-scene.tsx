import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { LipSyncRefs } from "../../hooks/use-lip-sync-events";
import { AvatarModel } from "./avatar-model";
import { CAMERA_CONFIG } from "../../constants";

/* ─────────────────────────────────────────────
 * AvatarScene
 * ─────────────────────────────────────────────
 * React Three Fiber Canvas with scene setup:
 * camera and lighting.
 *
 * Lazy-loaded by AvatarPresentation so the heavy
 * Three.js bundle doesn't block the initial
 * page render.
 * ───────────────────────────────────────────── */

interface AvatarSceneProps {
  lipSync: LipSyncRefs | null;
  onLoaded?: () => void;
}

export function AvatarScene({ lipSync, onLoaded }: AvatarSceneProps) {
  return (
    <Canvas
      camera={{
        fov: CAMERA_CONFIG.fov,
        position: [...CAMERA_CONFIG.position],
        near: CAMERA_CONFIG.near,
        far: CAMERA_CONFIG.far,
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: 4, // ACESFilmicToneMapping
        toneMappingExposure: 1.4,
      }}
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
        });
      }}
    >
      {/* ── Lighting ── */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[1, 1.5, 3]} intensity={1.8} color="#fff8f0" />
      <directionalLight position={[-1.5, 1, 2]} intensity={1.2} color="#f0f5ff" />
      <directionalLight position={[0, 0.5, 3]} intensity={0.8} />
      <directionalLight position={[0, 1.5, -1.5]} intensity={0.6} />
      <directionalLight position={[0, -1, 2]} intensity={0.5} color="#ffeedd" />
      <hemisphereLight args={["#ffffff", "#ffeedd", 0.6]} />

      {/* ── Avatar model ── */}
      <Suspense fallback={null}>
        <AvatarModel lipSync={lipSync} onLoaded={onLoaded} />
      </Suspense>
    </Canvas>
  );
}
