'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  useDigitalTwinStore,
  type MeshHealthEntry,
  type LiveReading,
} from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface IoTOverlayLayerProps {
  /** Override the entire health map (optional, uses store by default) */
  healthMapOverride?: Record<string, MeshHealthEntry>;
  /** Override live readings (optional, uses store by default) */
  readingsOverride?: Record<string, LiveReading>;
}

// ============================================================================
// Health color utilities
// ============================================================================

function getHealthColor(score: number): string {
  if (score <= 30) return '#ef4444'; // critical - red
  if (score <= 60) return '#f59e0b'; // warning - amber
  if (score <= 80) return '#22c55e'; // good - green
  return '#10b981'; // excellent - bright green
}

function getHealthLabel(status: MeshHealthEntry['status']): string {
  switch (status) {
    case 'critical':
      return 'CRITICAL';
    case 'warning':
      return 'WARNING';
    case 'healthy':
      return 'HEALTHY';
    default:
      return 'UNKNOWN';
  }
}

function getHealthBg(score: number): string {
  if (score <= 30) return 'rgba(239,68,68,0.2)';
  if (score <= 60) return 'rgba(245,158,11,0.2)';
  if (score <= 80) return 'rgba(34,197,94,0.2)';
  return 'rgba(16,185,129,0.2)';
}

function getHealthBorderColor(score: number): string {
  if (score <= 30) return 'rgba(239,68,68,0.4)';
  if (score <= 60) return 'rgba(245,158,11,0.4)';
  if (score <= 80) return 'rgba(34,197,94,0.4)';
  return 'rgba(16,185,129,0.4)';
}

// ============================================================================
// Pulsing ring component for critical health indicators
// ============================================================================

function PulseRing({
  color,
  size = 1,
}: {
  color: string;
  size?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.2;
      ringRef.current.scale.setScalar(size * scale);
    }

    if (materialRef.current) {
      // Pulsing opacity
      const opacity = 0.3 + Math.sin(t * 3) * 0.2;
      materialRef.current.opacity = Math.max(0, opacity);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4, 0.55, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// Single IoT Health Indicator
// ============================================================================

interface HealthIndicatorProps {
  meshName: string;
  entry: MeshHealthEntry;
  reading?: LiveReading;
  isSelected: boolean;
  position: [number, number, number];
  index: number;
}

function HealthIndicator({
  meshName,
  entry,
  reading,
  isSelected,
  position,
}: HealthIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const color = getHealthColor(entry.score);
  const isCritical = entry.score <= 30;
  const isWarning = entry.score <= 60 && entry.score > 30;
  const bgColor = getHealthBg(entry.score);
  const borderColor = getHealthBorderColor(entry.score);

  return (
    <Html
      position={[position[0], position[1] + 0.3, position[2]]}
      center
      distanceFactor={15}
      style={{ pointerEvents: 'auto' }}
      zIndexRange={[10, 0]}
    >
      <div
        className="flex flex-col items-center gap-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Pulsing ring for critical components */}
        {isCritical && (
          <div
            className="absolute -inset-2 rounded-full animate-ping"
            style={{
              background: 'rgba(239,68,68,0.08)',
              animationDuration: '1.5s',
            }}
          />
        )}

        {/* Health badge */}
        <div
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider shadow-lg border transition-all duration-300"
          style={{
            background: bgColor,
            color,
            borderColor,
            backdropFilter: 'blur(12px)',
            minWidth: '70px',
            textAlign: 'center',
            boxShadow: isCritical
              ? `0 0 16px rgba(239,68,68,0.2)`
              : isWarning
                ? `0 0 12px rgba(245,158,11,0.15)`
                : undefined,
          }}
        >
          {/* Status dot */}
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isCritical ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: color,
                boxShadow: isCritical
                  ? `0 0 6px ${color}`
                  : undefined,
              }}
            />
            {getHealthLabel(entry.status)}
          </div>
          <div className="text-[9px] font-normal opacity-70 mt-0.5">
            Score: {entry.score}
          </div>
        </div>

        {/* Live reading value */}
        {reading && (
          <div
            className="px-2.5 py-1 rounded-md text-[11px] font-mono shadow-md border transition-all duration-200"
            style={{
              background: 'rgba(0,0,0,0.85)',
              color: '#e2e8f0',
              borderColor: `${color}33`,
              backdropFilter: 'blur(6px)',
            }}
          >
            {reading.value.toFixed(1)}
            <span className="text-[9px] opacity-60 ml-1">{reading.unit}</span>
          </div>
        )}

        {/* Tooltip on hover — shows detailed telemetry */}
        {isHovered && reading && (
          <div
            className="mt-1 px-3 py-2 rounded-lg shadow-2xl border min-w-[120px]"
            style={{
              background: 'rgba(10,10,20,0.95)',
              border: `1px solid ${borderColor}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-[9px] text-slate-400 font-mono mb-1">
              {meshName}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold" style={{ color }}>
                {reading.value.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                {reading.unit}
              </span>
            </div>
            {reading.timestamp && (
              <div className="text-[8px] text-slate-500 mt-1">
                Updated: {new Date(reading.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Vertical line connecting to position */}
        <div
          className="w-px"
          style={{
            height: '24px',
            background: `linear-gradient(to bottom, ${color}88, transparent)`,
          }}
        />
      </div>
    </Html>
  );
}

// ============================================================================
// Main IoTOverlayLayer Component
// ============================================================================

export function IoTOverlayLayer({
  healthMapOverride,
  readingsOverride,
}: IoTOverlayLayerProps) {
  const iotOverlayEnabled = useDigitalTwinStore((s) => s.iotOverlayEnabled);
  const storeHealthMap = useDigitalTwinStore((s) => s.iotHealthMap);
  const storeLiveReadings = useDigitalTwinStore((s) => s.liveReadings);
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);

  const healthMap = healthMapOverride ?? storeHealthMap;
  const liveReadings = readingsOverride ?? storeLiveReadings;

  // Memoize the active entries (only those with health data)
  const activeEntries = useMemo(() => {
    return Object.entries(healthMap).filter(
      ([_, entry]) => entry && entry.score > 0,
    );
  }, [healthMap]);

  // Generate deterministic positions for telemetry labels based on mesh names
  const labelPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    activeEntries.forEach(([meshName], index) => {
      const angle = index * 2.4;
      const radius = 2 + (index % 4) * 0.8;
      const y = 0.5 + Math.floor(index / 4) * 1.5;
      positions[meshName] = [
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius,
      ];
    });
    return positions;
  }, [activeEntries]);

  // Track critical meshes count for pulse ring rendering
  const criticalCount = useMemo(() => {
    return activeEntries.filter(([_, entry]) => entry && entry.score <= 30)
      .length;
  }, [activeEntries]);

  if (!iotOverlayEnabled || activeEntries.length === 0) return null;

  return (
    <group>
      {/* Critical pulse ring effects at origin */}
      {criticalCount > 0 && (
        <PulseRing color="#ef4444" size={criticalCount * 0.5 + 2} />
      )}

      {/* Health status indicators + live readings */}
      {activeEntries.map(([meshName, entry], index) => {
        if (!entry) return null;
        const reading = liveReadings[meshName];
        const isSelected = selectedMeshName === meshName;
        const pos = labelPositions[meshName] ?? [0, 1, 0];

        return (
          <HealthIndicator
            key={meshName}
            meshName={meshName}
            entry={entry}
            reading={reading}
            isSelected={isSelected}
            position={pos}
            index={index}
          />
        );
      })}
    </group>
  );
}

export default IoTOverlayLayer;
