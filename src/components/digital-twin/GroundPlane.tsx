'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useStoreSelector } from '@/hooks/useDigitalTwin';

// ============================================================================
// Types
// ============================================================================

export interface GroundPlaneProps {
  /** Grid size (default: 20) */
  gridSize?: number;
  /** Grid cell size (default: 1) */
  cellSize?: number;
  /** Grid cell thickness (default: 0.6) */
  cellThickness?: number;
  /** Grid color (default: '#333340') */
  gridColor?: string;
  /** Secondary grid color (default: '#1f1f2e') */
  cellColor?: string;
  /** Fade distance from center (default: 20) */
  fadeDistance?: number;
  /** Fade strength (default: 1) */
  fadeStrength?: number;
  /** Infinite grid (default: true) */
  infiniteGrid?: boolean;
  /** Contact shadows enabled (default: true) */
  contactShadows?: boolean;
  /** Contact shadow opacity (default: 0.4) */
  contactShadowOpacity?: number;
  /** Contact shadow blur (default: 2) */
  contactShadowBlur?: number;
  /** Contact shadow spread (default: 20) */
  contactShadowSpread?: number;
  /** Y position of the ground (default: 0) */
  groundY?: number;
  /** Ground reflection enabled (default: false) */
  enableReflection?: boolean;
  /** Ground plane color (default: '#0a0a12') */
  groundColor?: string;
  /** Ground plane opacity for reflection (default: 0.4) */
  groundOpacity?: number;
}

// ============================================================================
// Reflective ground plane (optional)
// ============================================================================

function ReflectiveGroundPlane({
  gridSize,
  groundColor,
  groundOpacity,
}: {
  gridSize: number;
  groundColor: string;
  groundOpacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[gridSize, gridSize]} />
      <meshStandardMaterial
        color={groundColor}
        transparent
        opacity={groundOpacity}
        roughness={0.8}
        metalness={0.2}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

// ============================================================================
// Component
// ============================================================================

export function GroundPlane({
  gridSize = 20,
  cellSize = 1,
  cellThickness = 0.6,
  gridColor = '#333340',
  cellColor = '#1f1f2e',
  fadeDistance = 20,
  fadeStrength = 1,
  infiniteGrid = true,
  contactShadows = true,
  contactShadowOpacity = 0.4,
  contactShadowBlur = 2,
  contactShadowSpread = 20,
  groundY = 0,
  enableReflection = false,
  groundColor = '#0a0a12',
  groundOpacity = 0.4,
}: GroundPlaneProps) {
  // useStoreSelector: Safe alternative to useDigitalTwinStore() inside R3F Canvas.
  // Avoids useSyncExternalStore cross-reconciler cascading (Error #185).
  const gridEnabled = useStoreSelector((s) => s.currentScene !== null);

  if (!gridEnabled) return null;

  return (
    <group position={[0, groundY, 0]}>
      {/* ── Infinite ground grid with edge fading ────────────────────────── */}
      <Grid
        args={[gridSize, gridSize]}
        cellSize={cellSize}
        cellThickness={cellThickness}
        cellColor={cellColor}
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor={gridColor}
        fadeDistance={fadeDistance}
        fadeStrength={fadeStrength}
        infiniteGrid={infiniteGrid}
        followCamera={false}
      />

      {/* ── Soft contact shadows beneath the model ───────────────────────── */}
      {contactShadows && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={contactShadowOpacity}
          scale={contactShadowSpread}
          blur={contactShadowBlur}
          far={8}
          color="#000000"
        />
      )}

      {/* ── Optional reflective ground plane ─────────────────────────────── */}
      {enableReflection && (
        <ReflectiveGroundPlane
          gridSize={gridSize}
          groundColor={groundColor}
          groundOpacity={groundOpacity}
        />
      )}

      {/* ── Shadow-receiving ground plane ────────────────────────────────── */}
      {!enableReflection && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          receiveShadow
          visible={false}
        >
          <planeGeometry args={[gridSize * 2, gridSize * 2]} />
          <shadowMaterial transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

export default GroundPlane;
