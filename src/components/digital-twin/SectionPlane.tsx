'use client';

import { useRef, useCallback, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDigitalTwinStore, type SectionAxis } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface SectionPlaneProps {
  /** Size of the visible clipping plane (default: 20) */
  planeSize?: number;
  /** Plane color (default: '#22d3ee') */
  planeColor?: string;
  /** Whether the plane position is draggable (default: true) */
  draggable?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PLANE_DEFAULTS: Record<SectionAxis, { normal: THREE.Vector3; rotation: THREE.Euler }> = {
  x: {
    normal: new THREE.Vector3(-1, 0, 0),
    rotation: new THREE.Euler(0, Math.PI / 2, 0),
  },
  y: {
    normal: new THREE.Vector3(0, -1, 0),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
  },
  z: {
    normal: new THREE.Vector3(0, 0, -1),
    rotation: new THREE.Euler(0, 0, 0),
  },
};

// ============================================================================
// Component
// ============================================================================

export function SectionPlane({
  planeSize = 20,
  planeColor = '#22d3ee',
  draggable = true,
}: SectionPlaneProps) {
  const sectionMode = useDigitalTwinStore((s) => s.sectionMode);
  const sectionAxis = useDigitalTwinStore((s) => s.sectionAxis);
  const sectionPosition = useDigitalTwinStore((s) => s.sectionPosition);
  const setSectionPosition = useDigitalTwinStore((s) => s.setSectionPosition);
  const setSectionAxis = useDigitalTwinStore((s) => s.setSectionAxis);

  const { scene } = useThree();
  const planeRef = useRef<THREE.Mesh>(null);
  const clippingPlaneRef = useRef<THREE.Plane>(null);

  // Create the Three.js clipping plane
  const clippingPlane = useMemo(() => {
    const axisConfig = PLANE_DEFAULTS[sectionAxis];
    const plane = new THREE.Plane();
    plane.normal.copy(axisConfig.normal);
    plane.constant = sectionPosition * (planeSize / 2);
    return plane;
  }, [sectionAxis, sectionPosition, planeSize]);

  // Update clipping planes on all materials in the scene
  useFrame(() => {
    if (!sectionMode) return;

    const axisConfig = PLANE_DEFAULTS[sectionAxis];
    // Re-derive a fresh plane each frame instead of mutating useMemo result
    const freshPlane = new THREE.Plane();
    freshPlane.normal.copy(axisConfig.normal);
    freshPlane.constant = sectionPosition * (planeSize / 2);

    // Apply clipping to all materials in the scene
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        for (const mat of materials) {
          if (mat instanceof THREE.Material) {
            mat.clippingPlanes = [freshPlane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
          }
        }
      }
    });
  });

  // Handle axis change
  const handleAxisChange = useCallback(
    (axis: SectionAxis) => {
      setSectionAxis(axis);
    },
    [setSectionAxis],
  );

  // Handle position change from drag
  const handleDrag = useCallback(() => {
    if (planeRef.current) {
      const worldPos = new THREE.Vector3();
      planeRef.current.getWorldPosition(worldPos);
      // Map world position to normalized -1..1 range
      const normalizedPos = worldPos[sectionAxis] / (planeSize / 2);
      setSectionPosition(normalizedPos);
    }
  }, [sectionAxis, planeSize, setSectionPosition]);

  if (!sectionMode) {
    // Clear clipping planes when section mode is off
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of materials) {
          if (mat instanceof THREE.Material) {
            mat.clippingPlanes = [];
            mat.needsUpdate = true;
          }
        }
      }
    });
    return null;
  }

  const axisConfig = PLANE_DEFAULTS[sectionAxis];
  const planePosition = sectionPosition * (planeSize / 2);

  // Compute the plane position vector based on axis
  const position: [number, number, number] =
    sectionAxis === 'x'
      ? [planePosition, 0, 0]
      : sectionAxis === 'y'
        ? [0, planePosition, 0]
        : [0, 0, planePosition];

  return (
    <group>
      {/* Visible clipping plane helper */}
      <mesh
        ref={planeRef}
        position={position}
        rotation={axisConfig.rotation}
        onAfterRender={handleDrag}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshStandardMaterial
          color={planeColor}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Axis control UI overlay */}
      <Html position={[0, planeSize / 2 + 0.5, 0]} center>
        <div className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg shadow-xl"
          style={{
            background: 'rgba(15,15,25,0.85)',
            border: '1px solid rgba(34,211,238,0.3)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[10px] text-cyan-300 font-medium tracking-wider uppercase">
            Section Plane
          </span>
          <div className="flex gap-1">
            {(['x', 'y', 'z'] as SectionAxis[]).map((axis) => (
              <button
                key={axis}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAxisChange(axis);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  sectionAxis === axis
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {axis}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={sectionPosition}
              onChange={(e) => {
                e.stopPropagation();
                setSectionPosition(parseFloat(e.target.value));
              }}
              className="w-24 h-1 accent-cyan-400"
            />
            <span className="text-[9px] text-slate-400 font-mono w-8">
              {sectionPosition.toFixed(2)}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default SectionPlane;
