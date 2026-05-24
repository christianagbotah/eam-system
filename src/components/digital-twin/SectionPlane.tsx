'use client';

import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
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

const PLANE_DEFAULTS: Record<
  SectionAxis,
  { normal: THREE.Vector3; rotation: THREE.Euler }
> = {
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
// Animated section plane visual — semi-transparent with glowing edges
// ============================================================================

function SectionPlaneVisual({
  position,
  rotation,
  planeSize,
  planeColor,
  isTransitioning,
}: {
  position: [number, number, number];
  rotation: THREE.Euler;
  planeSize: number;
  planeColor: string;
  isTransitioning: boolean;
}) {
  const planeRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const opacityRef = useRef(0);
  const glowOpacityRef = useRef(0);

  useFrame(() => {
    const targetOpacity = isTransitioning ? 0.1 : 0.08;
    const targetGlow = isTransitioning ? 0.2 : 0.05;

    opacityRef.current += (targetOpacity - opacityRef.current) * 0.1;
    glowOpacityRef.current += (targetGlow - glowOpacityRef.current) * 0.08;

    if (planeRef.current) {
      (planeRef.current.material as THREE.MeshStandardMaterial).opacity =
        opacityRef.current;
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        glowOpacityRef.current;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Main clipping plane surface */}
      <mesh ref={planeRef}>
        <planeGeometry args={[planeSize, planeSize]} />
        <meshStandardMaterial
          color={planeColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing edge highlight */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(planeSize, planeSize)]}
        />
        <lineBasicMaterial
          color={planeColor}
          transparent
          opacity={0.4}
        />
      </lineSegments>

      {/* Outer glow plane */}
      <mesh ref={glowRef}>
        <planeGeometry args={[planeSize * 1.02, planeSize * 1.02]} />
        <meshStandardMaterial
          color={planeColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          emissive={new THREE.Color(planeColor)}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

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

  // Track whether we're transitioning (for animation)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevSectionMode = useRef(sectionMode);
  const clippedRef = useRef<Set<string>>(new Set());

  // Detect section mode toggle for animation
  useEffect(() => {
    if (prevSectionMode.current !== sectionMode) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 600);
      prevSectionMode.current = sectionMode;
      return () => clearTimeout(timer);
    }
  }, [sectionMode]);

  // Update clipping planes on all materials in the scene
  useFrame(() => {
    if (!sectionMode) {
      // Clear clipping planes when section mode is off
      if (clippedRef.current.size > 0) {
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const key = mesh.uuid;
            if (clippedRef.current.has(key)) {
              const materials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              for (const mat of materials) {
                if (mat instanceof THREE.Material) {
                  mat.clippingPlanes = [];
                  mat.clipShadows = false;
                  mat.needsUpdate = true;
                }
              }
              clippedRef.current.delete(key);
            }
          }
        });
      }
      return;
    }

    const axisConfig = PLANE_DEFAULTS[sectionAxis];
    const freshPlane = new THREE.Plane();
    freshPlane.normal.copy(axisConfig.normal);
    freshPlane.constant = sectionPosition * (planeSize / 2);

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        if (mat instanceof THREE.Material) {
          if (!mat.clippingPlanes || mat.clippingPlanes.length === 0) {
            clippedRef.current.add(mesh.uuid);
          }
          mat.clippingPlanes = [freshPlane];
          mat.clipShadows = true;
          mat.needsUpdate = true;
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
  const planeRef = useRef<THREE.Mesh>(null);
  const dragThrottleRef = useRef(0);
  const handleDrag = useCallback(() => {
    if (planeRef.current) {
      const worldPos = new THREE.Vector3();
      planeRef.current.getWorldPosition(worldPos);
      const normalizedPos = worldPos[sectionAxis] / (planeSize / 2);
      // CRITICAL: React.startTransition does NOT prevent Error #185 for Zustand
      // set() calls. Throttle store updates to ~100ms and defer with setTimeout
      // to ensure they fire outside any ongoing React render cycle.
      const now = Date.now();
      if (now - dragThrottleRef.current > 100) {
        dragThrottleRef.current = now;
        setTimeout(() => setSectionPosition(normalizedPos), 0);
      }
    }
  }, [sectionAxis, planeSize, setSectionPosition]);

  if (!sectionMode) {
    return null;
  }

  const axisConfig = PLANE_DEFAULTS[sectionAxis];
  const planePosition = sectionPosition * (planeSize / 2);

  const position: [number, number, number] =
    sectionAxis === 'x'
      ? [planePosition, 0, 0]
      : sectionAxis === 'y'
        ? [0, planePosition, 0]
        : [0, 0, planePosition];

  return (
    <group>
      {/* Visible clipping plane with animated edges */}
      <SectionPlaneVisual
        position={position}
        rotation={axisConfig.rotation}
        planeSize={planeSize}
        planeColor={planeColor}
        isTransitioning={isTransitioning}
      />

      {/* Invisible hit target for drag interaction */}
      <mesh
        ref={planeRef}
        position={position}
        rotation={axisConfig.rotation}
        onAfterRender={handleDrag}
        visible={false}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {/* Axis control UI overlay */}
      <Html position={[0, planeSize / 2 + 0.5, 0]} center>
        <div
          className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg shadow-xl"
          style={{
            background: 'rgba(15,15,25,0.9)',
            border: '1px solid rgba(34,211,238,0.3)',
            backdropFilter: 'blur(12px)',
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
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all duration-200 ${
                  sectionAxis === axis
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:bg-white/10'
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
