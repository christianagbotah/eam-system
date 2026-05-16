'use client';

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDigitalTwinStore, type SectionAxis } from '@/stores/digitalTwinStore';
import type { AssetMeshBinding } from './InteractiveMesh';

// ============================================================================
// Types
// ============================================================================

export interface ExplodedViewProps {
  /** Available mesh bindings for explosion offset calculation */
  bindings: AssetMeshBinding[];
  /** Animation speed factor (default: 0.05) */
  animationSpeed?: number;
  /** Easing function (default: ease-out cubic) */
  easing?: (t: number) => number;
}

// ============================================================================
// Easing functions
// ============================================================================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ============================================================================
// Component
// ============================================================================

export function ExplodedView({
  bindings,
  animationSpeed = 0.05,
  easing = easeOutCubic,
}: ExplodedViewProps) {
  const explodeMode = useDigitalTwinStore((s) => s.explodeMode);
  const explodeProgress = useDigitalTwinStore((s) => s.explodeProgress);
  const explodeAssemblyId = useDigitalTwinStore((s) => s.explodeAssemblyId);
  const setExplodeProgress = useDigitalTwinStore((s) => s.setExplodeProgress);

  // Refs to track animated positions per mesh
  const meshPositionsRef = useRef<Map<string, { current: THREE.Vector3; target: THREE.Vector3 }>>(new Map());

  // Build lookup of binding offsets
  const bindingOffsets = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const binding of bindings) {
      if (binding.explodeOffset) {
        map.set(binding.meshName, binding.explodeOffset);
      }
    }
    return map;
  }, [bindings]);

  // Filter to only explode the target assembly (or all if no assembly specified)
  const targetMeshes = useMemo(() => {
    if (explodeAssemblyId) {
      return bindings.filter((b) => b.assetId === explodeAssemblyId);
    }
    return bindings;
  }, [bindings, explodeAssemblyId]);

  // Animate explosion progress
  useFrame(() => {
    if (!explodeMode) return;

    const currentProgress = useDigitalTwinStore.getState().explodeProgress;

    if (currentProgress < 1) {
      setExplodeProgress(Math.min(currentProgress + animationSpeed, 1));
    }
  });

  // Apply offsets to mesh objects in the scene
  useFrame(({ scene }) => {
    const currentProgress = useDigitalTwinStore.getState().explodeProgress;
    const easedProgress = easing(currentProgress);

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // Only animate meshes that have binding offsets
      const offset = bindingOffsets.get(mesh.name);
      if (!offset) return;

      // Check if this mesh is in the target set
      const isTarget = targetMeshes.some((b) => b.meshName === mesh.name);
      if (!isTarget) return;

      // Store original position if not already stored
      if (!mesh.userData.__originalPosition) {
        mesh.userData.__originalPosition = mesh.position.clone();
      }

      const original = mesh.userData.__originalPosition as THREE.Vector3;

      // Calculate target position with eased offset
      const targetX = original.x + offset[0] * easedProgress;
      const targetY = original.y + offset[1] * easedProgress;
      const targetZ = original.z + offset[2] * easedProgress;

      // Smooth lerp to target position
      mesh.position.x += (targetX - mesh.position.x) * 0.1;
      mesh.position.y += (targetY - mesh.position.y) * 0.1;
      mesh.position.z += (targetZ - mesh.position.z) * 0.1;
    });
  });

  // Reset positions when explode mode is off
  useFrame(({ scene }) => {
    if (explodeMode) return;

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (mesh.userData.__originalPosition) {
        const original = mesh.userData.__originalPosition as THREE.Vector3;
        mesh.position.lerp(original, 0.1);

        // Clean up when close enough
        if (mesh.position.distanceTo(original) < 0.001) {
          mesh.position.copy(original);
          delete mesh.userData.__originalPosition;
        }
      }
    });
  });

  // This is a "headless" component — it only modifies mesh positions per frame
  return null;
}

export default ExplodedView;
