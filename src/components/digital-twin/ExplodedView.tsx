'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import type { AssetMeshBinding } from './InteractiveMesh';

// ============================================================================
// Types
// ============================================================================

export interface ExplodedViewProps {
  /** Available mesh bindings for explosion offset calculation */
  bindings: AssetMeshBinding[];
  /** Animation speed factor (default: 0.05) */
  animationSpeed?: number;
  /** Show component labels during exploded view (default: true) */
  showLabels?: boolean;
}

// ============================================================================
// Spring physics for smooth animation
// ============================================================================

interface SpringState {
  current: number;
  velocity: number;
}

function springStep(
  state: SpringState,
  target: number,
  stiffness: number = 0.06,
  damping: number = 0.72,
): SpringState {
  const force = (target - state.current) * stiffness;
  state.velocity = (state.velocity + force) * damping;
  state.current += state.velocity;

  // Snap when close enough
  if (Math.abs(state.current - target) < 0.0001 && Math.abs(state.velocity) < 0.0001) {
    state.current = target;
    state.velocity = 0;
  }

  return state;
}

// ============================================================================
// Component
// ============================================================================
//
// CRITICAL: No useState is updated directly from useFrame. Label data is
// accumulated in a ref by useFrame and flushed to React state via a
// separate requestAnimationFrame loop, completely decoupled from R3F's
// frame loop. This eliminates React Error #185.
// ============================================================================

interface LabelData {
  meshName: string;
  assetName: string;
  position: [number, number, number];
  progress: number;
}

export function ExplodedView({
  bindings,
  animationSpeed = 0.05,
  showLabels = true,
}: ExplodedViewProps) {
  const explodeMode = useDigitalTwinStore((s) => s.explodeMode);
  const explodeAssemblyId = useDigitalTwinStore((s) => s.explodeAssemblyId);

  // Spring state for the overall explode progress
  const springRef = useRef<SpringState>({ current: 0, velocity: 0 });

  // Per-mesh spring states for smooth individual transitions
  const meshSpringsRef = useRef<Map<string, SpringState>>(new Map());

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

  // React state for label rendering — updated from a decoupled rAF loop, NEVER from useFrame
  const [activeLabels, setActiveLabels] = useState<LabelData[]>([]);

  // Ref to accumulate labels from useFrame — the rAF sync loop reads from this
  const pendingLabelsRef = useRef<LabelData[] | null>(null);

  // Animate explosion progress — drive the spring
  // CRITICAL: No store updates from useFrame. React.startTransition does NOT
  // prevent Error #185 for Zustand set() calls — it only affects React's own
  // setState. The visual animation is driven entirely by the local spring ref.
  useFrame(() => {
    const target = explodeMode ? 1 : 0;
    springRef.current = springStep(springRef.current, target);
  });

  // Apply spring-based offsets to mesh objects in the scene
  useFrame(({ scene }) => {
    const springValue = springRef.current.current;
    const labels: LabelData[] = [];

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      const offset = bindingOffsets.get(mesh.name);
      if (!offset) return;

      const isTarget = targetMeshes.some((b) => b.meshName === mesh.name);
      if (!isTarget) return;

      // Store original position
      if (!mesh.userData.__originalPosition) {
        mesh.userData.__originalPosition = mesh.position.clone();
      }

      const original = mesh.userData.__originalPosition as THREE.Vector3;

      // Initialize per-mesh spring if needed
      if (!meshSpringsRef.current.has(mesh.name)) {
        meshSpringsRef.current.set(mesh.name, { current: 0, velocity: 0 });
      }

      // Step per-mesh spring towards global spring value
      const meshSpring = meshSpringsRef.current.get(mesh.name)!;
      const targetValue = springValue;
      const stepped = springStep(meshSpring, targetValue, 0.08, 0.75);

      // Calculate target position with spring-animated offset
      const targetX = original.x + offset[0] * stepped.current;
      const targetY = original.y + offset[1] * stepped.current;
      const targetZ = original.z + offset[2] * stepped.current;

      // Smooth position update
      mesh.position.x += (targetX - mesh.position.x) * 0.15;
      mesh.position.y += (targetY - mesh.position.y) * 0.15;
      mesh.position.z += (targetZ - mesh.position.z) * 0.15;

      // Track for labels when significantly exploded
      if (showLabels && stepped.current > 0.3) {
        const binding = targetMeshes.find((b) => b.meshName === mesh.name);
        if (binding) {
          labels.push({
            meshName: mesh.name,
            assetName: binding.assetName,
            position: [mesh.position.x, mesh.position.y, mesh.position.z],
            progress: stepped.current,
          });
        }
      }
    });

    // Store labels in a ref — the decoupled rAF loop will flush to React state.
    // This completely avoids setState during R3F's frame loop.
    pendingLabelsRef.current = labels;
  });

  // Reset positions and springs when explode mode is off
  useFrame(({ scene }) => {
    if (explodeMode) return;
    if (springRef.current.current > 0.001) return; // Wait for spring to settle

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (mesh.userData.__originalPosition) {
        const original = mesh.userData.__originalPosition as THREE.Vector3;
        mesh.position.lerp(original, 0.15);

        if (mesh.position.distanceTo(original) < 0.001) {
          mesh.position.copy(original);
          delete mesh.userData.__originalPosition;
        }
      }
    });

    // Clear per-mesh springs and labels
    meshSpringsRef.current.clear();
    pendingLabelsRef.current = [];
  });

  // Decoupled sync loop: reads from pendingLabelsRef and flushes to React state.
  // Runs on a separate requestAnimationFrame that is NOT part of R3F's frame loop,
  // so it never triggers Error #185. Uses requestAnimationFrame to schedule the
  // React setState call, ensuring it fires outside any ongoing render cycle.
  useEffect(() => {
    let animId: number;
    let lastLabelsJson = '';

    const sync = () => {
      const pending = pendingLabelsRef.current;
      if (pending !== null) {
        // Only update React state if labels actually changed (avoid re-render spam)
        const json = JSON.stringify(pending);
        if (json !== lastLabelsJson) {
          lastLabelsJson = json;
          // CRITICAL: Use requestAnimationFrame to schedule the React setState
          // call. Even though we're already in a rAF callback, this ensures the
          // setState fires in the NEXT frame, completely outside any potential
          // React concurrent render that might be in progress.
          requestAnimationFrame(() => {
            setActiveLabels(pending);
          });
        }
        pendingLabelsRef.current = null;
      }
      animId = requestAnimationFrame(sync);
    };

    animId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Label renderer — renders HTML labels for exploded components
  const isVisible = explodeMode && showLabels;

  return (
    <group>
      {isVisible && activeLabels.map((label) => (
        <Html
          key={label.meshName}
          position={[
            label.position[0],
            label.position[1] + 0.6,
            label.position[2],
          ]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap shadow-lg border transition-opacity duration-300"
            style={{
              background: 'rgba(15,15,25,0.85)',
              color: '#94a3b8',
              borderColor: 'rgba(148,163,184,0.2)',
              backdropFilter: 'blur(8px)',
              opacity: Math.min(label.progress * 1.5, 1),
            }}
          >
            {label.assetName}
          </div>
        </Html>
      ))}
    </group>
  );
}

export default ExplodedView;
