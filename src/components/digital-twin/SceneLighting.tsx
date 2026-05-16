'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// SceneLighting — Ambient + Directional + Spot + Environment
// ============================================================================

export interface SceneLightingProps {
  /** Ambient light intensity (default: 0.4) */
  ambientIntensity?: number;
  /** Ambient light color (default: '#e0e0e8') */
  ambientColor?: string;
  /** Directional light intensity (default: 1.2) */
  directionalIntensity?: number;
  /** Directional light position (default: [10, 15, 10]) */
  directionalPosition?: [number, number, number];
  /** Whether shadows are enabled (default: true) */
  shadows?: boolean;
  /** Environment preset name from drei (default: 'warehouse') */
  environmentPreset?: 'warehouse' | 'city' | 'studio' | 'dawn' | 'sunset' | 'night' | 'forest' | 'apartment' | 'lobby' | 'park' | 'lobby';
  /** Whether to show the environment background (default: false) */
  showEnvironmentBackground?: boolean;
  /** Spotlight enabled (default: false) */
  enableSpotlight?: boolean;
  /** Spotlight intensity (default: 2) */
  spotlightIntensity?: number;
}

export function SceneLighting({
  ambientIntensity = 0.4,
  ambientColor = '#e0e0e8',
  directionalIntensity = 1.2,
  directionalPosition = [10, 15, 10] as [number, number, number],
  shadows = true,
  environmentPreset = 'warehouse',
  showEnvironmentBackground = false,
  enableSpotlight = false,
  spotlightIntensity = 2,
}: SceneLightingProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  // Subtle directional light animation for realism
  useFrame(({ clock }) => {
    if (dirLightRef.current) {
      const t = clock.getElapsedTime() * 0.05;
      dirLightRef.current.position.x = directionalPosition[0] + Math.sin(t) * 2;
      dirLightRef.current.position.z = directionalPosition[2] + Math.cos(t) * 2;
    }
  });

  return (
    <>
      {/* Ambient fill light */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Key directional light with shadows */}
      <directionalLight
        ref={dirLightRef}
        position={directionalPosition}
        intensity={directionalIntensity}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0001}
        color="#ffffff"
      />

      {/* Hemisphere light for natural sky-ground fill */}
      <hemisphereLight
        args={['#b1e1ff', '#b97a20', 0.3]}
      />

      {/* Optional spotlight for dramatic effect */}
      {enableSpotlight && (
        <spotLight
          ref={spotLightRef}
          position={[0, 12, 0]}
          angle={Math.PI / 6}
          penumbra={0.5}
          intensity={spotlightIntensity}
          castShadow={shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color="#fff5e6"
        />
      )}

      {/* HDRI Environment for reflections and ambient lighting */}
      <Environment
        preset={environmentPreset}
        background={showEnvironmentBackground}
        backgroundBlurriness={0.8}
        backgroundIntensity={0.4}
      />
    </>
  );
}

export default SceneLighting;
