'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

/** Binding data linking a mesh to an asset */
export interface AssetMeshBinding {
  meshName: string;
  assetId: string;
  assetName: string;
  isClickable?: boolean;
  isVisible?: boolean;
  colorOverride?: string;
  explodeOffset?: [number, number, number];
  hotspots?: Array<{ id: string; title: string; type: string }>;
}

export interface InteractiveMeshProps {
  /** The Three.js mesh object reference */
  mesh: THREE.Mesh;
  /** The asset-mesh binding data */
  binding: AssetMeshBinding;
  /** Original geometry of the mesh for bounds calculation */
  children?: React.ReactNode;
}

// ============================================================================
// Color palette for selection / hover
// ============================================================================

const SELECTION_COLOR = new THREE.Color('#22d3ee'); // cyan-400
const HOVER_COLOR = new THREE.Color('#94a3b8'); // slate-400
const IOT_CRITICAL_COLOR = new THREE.Color('#ef4444');
const IOT_WARNING_COLOR = new THREE.Color('#f59e0b');
const IOT_GOOD_COLOR = new THREE.Color('#22c55e');
const IOT_EXCELLENT_COLOR = new THREE.Color('#10b981');

// ============================================================================
// Component
// ============================================================================

export function InteractiveMesh({ mesh, binding }: InteractiveMeshProps) {
  const meshRef = useRef<THREE.Mesh>(mesh);
  const [hovered, setHovered] = useState(false);

  // Store bindings
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);
  const hoveredMeshName = useDigitalTwinStore((s) => s.hoveredMeshName);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);
  const hoverMesh = useDigitalTwinStore((s) => s.hoverMesh);
  const iotOverlayEnabled = useDigitalTwinStore((s) => s.iotOverlayEnabled);
  const iotHealthMap = useDigitalTwinStore((s) => s.iotHealthMap);
  const liveReadings = useDigitalTwinStore((s) => s.liveReadings);

  // Edges geometry for selection/hover outline
  const [lineSegmentsObj, setLineSegmentsObj] = useState<THREE.LineSegments | null>(null);

  useEffect(() => {
    if (meshRef.current?.geometry) {
      const geo = new THREE.EdgesGeometry(meshRef.current.geometry, 15);
      const mat = new THREE.LineBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.8,
      });
      setLineSegmentsObj(new THREE.LineSegments(geo, mat));
    }
    return () => {
      setLineSegmentsObj((prev) => {
        if (prev) {
          prev.geometry.dispose();
          (prev.material as THREE.Material).dispose();
        }
        return null;
      });
    };
  }, [mesh]);

  const isSelected = selectedMeshName === binding.meshName;
  const isHovered = hoveredMeshName === binding.meshName;

  // Original material color backup
  const originalColorRef = useRef<THREE.Color | null>(null);

  // Memoize whether this mesh is interactive
  const isClickable = binding.isClickable !== false;
  const isVisible = binding.isVisible !== false;

  // Health data for this mesh
  const healthEntry = useMemo(
    () => iotHealthMap[binding.meshName],
    [iotHealthMap, binding.meshName],
  );

  const liveReading = useMemo(
    () => liveReadings[binding.meshName],
    [liveReadings, binding.meshName],
  );

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleClick = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation();
      if (!isClickable) return;
      selectMesh(binding.meshName, binding.assetId);
    },
    [isClickable, selectMesh, binding.meshName, binding.assetId],
  );

  const handlePointerOver = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation();
      setHovered(true);
      hoverMesh(binding.meshName);
      document.body.style.cursor = isClickable ? 'pointer' : 'default';
    },
    [isClickable, hoverMesh, binding.meshName],
  );

  const handlePointerOut = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation();
      setHovered(false);
      hoverMesh(null);
      document.body.style.cursor = 'default';
    },
    [hoverMesh],
  );

  // ── Per-frame material updates ────────────────────────────────────────────

  useFrame(() => {
    const obj = meshRef.current;
    if (!obj || !obj.material) return;

    const material = obj.material as THREE.MeshStandardMaterial;

    // Store original color on first frame
    if (!originalColorRef.current) {
      originalColorRef.current = material.color.clone();
    }

    // Determine target color
    let targetColor: THREE.Color | null = null;

    if (isSelected) {
      targetColor = SELECTION_COLOR;
    } else if (isHovered) {
      targetColor = HOVER_COLOR;
    } else if (iotOverlayEnabled && healthEntry) {
      if (healthEntry.score <= 30) {
        targetColor = IOT_CRITICAL_COLOR;
      } else if (healthEntry.score <= 60) {
        targetColor = IOT_WARNING_COLOR;
      } else if (healthEntry.score <= 80) {
        targetColor = IOT_GOOD_COLOR;
      } else {
        targetColor = IOT_EXCELLENT_COLOR;
      }
    } else if (binding.colorOverride) {
      targetColor = new THREE.Color(binding.colorOverride);
    }

    if (targetColor) {
      material.color.lerp(targetColor, 0.15);
      material.emissive.lerp(
        isSelected ? SELECTION_COLOR : new THREE.Color('#000000'),
        isSelected ? 0.2 : 1.0,
      );
      material.emissiveIntensity = isSelected ? 0.3 : 0;
    } else {
      material.color.lerp(originalColorRef.current, 0.1);
      material.emissiveIntensity = 0;
    }

    // Visibility
    obj.visible = isVisible;

    // Pulse effect for critical health
    if (iotOverlayEnabled && healthEntry && healthEntry.score <= 30) {
      const t = performance.now() * 0.003;
      material.emissiveIntensity = 0.2 + Math.sin(t) * 0.15;
      material.emissive.lerp(IOT_CRITICAL_COLOR, 0.3);
    } else if (iotOverlayEnabled && healthEntry && healthEntry.score <= 60) {
      const t = performance.now() * 0.002;
      material.emissiveIntensity = 0.1 + Math.sin(t) * 0.08;
      material.emissive.lerp(IOT_WARNING_COLOR, 0.2);
    }
  });

  // ── Render ────────────────────────────────────────────────────────────────

  // We attach events and visual props to the original mesh via primitive
  return (
    <group>
      <primitive
        ref={meshRef}
        object={mesh}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      />

      {/* Selection / hover outline */}
      {(isSelected || isHovered) && lineSegmentsObj && (
        <primitive object={lineSegmentsObj} />
      )}

      {/* Live telemetry label when IoT overlay is active */}
      {iotOverlayEnabled && liveReading && (
        <Html
          position={[
            (mesh.position?.x ?? 0),
            (mesh.position?.y ?? 0) + 1.2,
            (mesh.position?.z ?? 0),
          ]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-2 py-1 rounded text-xs font-mono whitespace-nowrap shadow-lg"
            style={{
              background: 'rgba(0,0,0,0.75)',
              color: healthEntry && healthEntry.score <= 30 ? '#fca5a5' :
                     healthEntry && healthEntry.score <= 60 ? '#fde68a' : '#86efac',
              border: `1px solid ${healthEntry && healthEntry.score <= 30 ? '#ef4444' :
                             healthEntry && healthEntry.score <= 60 ? '#f59e0b' : '#22c55e'}`,
              backdropFilter: 'blur(4px)',
            }}
          >
            {liveReading.value.toFixed(1)} {liveReading.unit}
          </div>
        </Html>
      )}

      {/* Hotspot indicator icons */}
      {binding.hotspots && binding.hotspots.length > 0 && (
        <Html
          position={[
            (mesh.position?.x ?? 0),
            (mesh.position?.y ?? 0) + 0.8,
            (mesh.position?.z ?? 0),
          ]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-[10px] text-white font-bold">
                {binding.hotspots.length}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default InteractiveMesh;
