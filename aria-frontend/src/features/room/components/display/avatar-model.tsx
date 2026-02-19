import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LipSyncRefs } from "../../hooks/use-lip-sync-events";
import { useMorphTargets } from "../../hooks/use-morph-targets";
import { MATERIAL_PRESETS } from "../../constants";
import avatarGlbUrl from "@/assets/aria.glb";

/* ─────────────────────────────────────────────
 * AvatarModel
 * ─────────────────────────────────────────────
 * R3F scene component that loads and renders
 * the 3D avatar GLB model. Handles:
 *  - GLB loading via useGLTF
 *  - Material enhancement (skin, eyes, hair)
 *  - Idle animation playback via useAnimations
 *  - Morph target animation via useMorphTargets
 *
 * Must be rendered inside a <Canvas>.
 * ───────────────────────────────────────────── */

type AvatarGLTF = GLTF & {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

interface AvatarModelProps {
  lipSync: LipSyncRefs | null;
  onLoaded?: () => void;
}

/** Check if a name matches a material category (case-insensitive) */
function matchesMaterial(name: string, keyword: string): boolean {
  return name.toLowerCase().includes(keyword);
}

export function AvatarModel({ lipSync, onLoaded }: AvatarModelProps) {
  const gltf = useGLTF(avatarGlbUrl) as unknown as AvatarGLTF;
  const { scene, animations } = gltf;
  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, groupRef);
  const meshesRef = useRef<THREE.SkinnedMesh[]>([]);
  const hasInitialized = useRef(false);

  const enhanceMaterials = useCallback((root: THREE.Object3D) => {
    const skinnedMeshes: THREE.SkinnedMesh[] = [];

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = false;
      child.receiveShadow = false;

      if (child.material instanceof THREE.MeshStandardMaterial) {
        const mat = child.material;
        const matName = mat.name;
        const meshName = child.name;

        mat.envMapIntensity = MATERIAL_PRESETS.skin.envMapIntensity;

        if (
          matchesMaterial(matName, "skin") ||
          matchesMaterial(matName, "face") ||
          matchesMaterial(matName, "head") ||
          matchesMaterial(meshName, "face") ||
          matchesMaterial(meshName, "head")
        ) {
          mat.roughness = Math.max(
            MATERIAL_PRESETS.skin.minRoughness,
            mat.roughness,
          );
          mat.metalness = MATERIAL_PRESETS.skin.metalness;
        }

        if (
          matchesMaterial(matName, "eye") ||
          matchesMaterial(meshName, "eye")
        ) {
          mat.roughness = MATERIAL_PRESETS.eyes.roughness;
          mat.metalness = MATERIAL_PRESETS.eyes.metalness;
          mat.envMapIntensity = MATERIAL_PRESETS.eyes.envMapIntensity;
        }

        if (
          matchesMaterial(matName, "hair") ||
          matchesMaterial(meshName, "hair")
        ) {
          mat.roughness = MATERIAL_PRESETS.hair.roughness;
          mat.metalness = MATERIAL_PRESETS.hair.metalness;
          mat.side = THREE.DoubleSide;
          if (mat.transparent) {
            mat.alphaTest = MATERIAL_PRESETS.hair.alphaTest;
            mat.depthWrite = true;
          }
        }

        mat.needsUpdate = true;
      }

      // Collect skinned meshes with morph targets
      if (child instanceof THREE.SkinnedMesh) {
        const skinnedChild = child as THREE.SkinnedMesh;
        if (
          skinnedChild.morphTargetInfluences &&
          skinnedChild.morphTargetDictionary
        ) {
          skinnedChild.morphTargetInfluences.fill(0);
          skinnedMeshes.push(skinnedChild);
        }
      }

      const geometry = child.geometry as THREE.BufferGeometry | undefined;
      if (geometry) {
        geometry.computeBoundingSphere();
        child.frustumCulled = true;
      }
    });

    return skinnedMeshes;
  }, []);

  // Initialize materials and center the model
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const skinnedMeshes = enhanceMaterials(scene);
    meshesRef.current = skinnedMeshes;

    // Center the model on its bounding box
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);

    onLoaded?.();
  }, [scene, enhanceMaterials, onLoaded]);

  // Play idle animation
  useEffect(() => {
    const idleKey =
      Object.keys(actions).find((name) =>
        name.toLowerCase().includes("idle"),
      ) ?? Object.keys(actions)[0];

    if (!idleKey) return;

    const idleAction = actions[idleKey];
    if (!idleAction) return;

    idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      idleAction.fadeOut(0.5);
    };
  }, [actions]);

  // Wire morph target animation system
  useMorphTargets(meshesRef, lipSync);

  return (
    <group ref={groupRef} position={[0, -0.2, 0]} rotation={[0.02, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}
