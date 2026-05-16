'use client';

import { Grid, ContactShadows } from '@react-three/drei';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

// ============================================================================
// GroundPlane — Grid + Contact Shadows
// ============================================================================

export interface GroundPlaneProps {
  /** Grid size (default: 20) */
  gridSize?: number;
  /** Grid cell size (default: 1) */
  cellSize?: number;
  /** Grid section count (default: 20) */
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
  /** Y position of the ground (default: 0) */
  groundY?: number;
}

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
  groundY = 0,
}: GroundPlaneProps) {
  const gridEnabled = useDigitalTwinStore((s) => s.currentScene !== null);

  if (!gridEnabled) return null;

  return (
    <group position={[0, groundY, 0]}>
      {/* Infinite ground grid */}
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

      {/* Soft contact shadows beneath the model */}
      {contactShadows && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={contactShadowOpacity}
          scale={20}
          blur={contactShadowBlur}
          far={8}
          color="#000000"
        />
      )}
    </group>
  );
}

export default GroundPlane;
