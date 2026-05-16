'use client';

import { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useDigitalTwinStore, type MeshHealthEntry, type LiveReading } from '@/stores/digitalTwinStore';

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
// Health color utility
// ============================================================================

function getHealthColor(score: number): string {
  if (score <= 30) return '#ef4444';      // critical - red
  if (score <= 60) return '#f59e0b';      // warning - amber
  if (score <= 80) return '#22c55e';      // good - green
  return '#10b981';                         // excellent - bright green
}

function getHealthLabel(status: MeshHealthEntry['status']): string {
  switch (status) {
    case 'critical': return 'CRITICAL';
    case 'warning': return 'WARNING';
    case 'healthy': return 'HEALTHY';
    default: return 'UNKNOWN';
  }
}

function getHealthBg(score: number): string {
  if (score <= 30) return 'rgba(239,68,68,0.15)';
  if (score <= 60) return 'rgba(245,158,11,0.15)';
  if (score <= 80) return 'rgba(34,197,94,0.15)';
  return 'rgba(16,185,129,0.15)';
}

// ============================================================================
// Component
// ============================================================================

export function IoTOverlayLayer({ healthMapOverride, readingsOverride }: IoTOverlayLayerProps) {
  const iotOverlayEnabled = useDigitalTwinStore((s) => s.iotOverlayEnabled);
  const storeHealthMap = useDigitalTwinStore((s) => s.iotHealthMap);
  const storeLiveReadings = useDigitalTwinStore((s) => s.liveReadings);
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);

  const healthMap = healthMapOverride ?? storeHealthMap;
  const liveReadings = readingsOverride ?? storeLiveReadings;

  // Animation tick counter updated per frame
  const [animTick, setAnimTick] = useState(0);

  useFrame(({ clock }) => {
    setAnimTick(Math.floor(clock.getElapsedTime() * 10));
  });

  // Memoize the active entries (only those with health data)
  const activeEntries = useMemo(() => {
    return Object.entries(healthMap).filter(([_, entry]) => entry && entry.score > 0);
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

  if (!iotOverlayEnabled || activeEntries.length === 0) return null;

  return (
    <group>
      {/* Health status indicators + live readings */}
      {activeEntries.map(([meshName, entry]) => {
        if (!entry) return null;
        const reading = liveReadings[meshName];
        const isSelected = selectedMeshName === meshName;
        const pos = labelPositions[meshName] ?? [0, 1, 0];
        const color = getHealthColor(entry.score);
        const isCritical = entry.score <= 30;
        const isWarning = entry.score <= 60 && entry.score > 30;

        // Pulse animation for critical (CSS-driven via className)
        const pulseClass = isCritical
          ? 'animate-pulse'
          : '';

        return (
          <Html
            key={meshName}
            position={[pos[0], pos[1] + 0.3, pos[2]]}
            center
            distanceFactor={15}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[10, 0]}
          >
            <div
              className={`flex flex-col items-center gap-1 ${pulseClass}`}
            >
              {/* Health badge */}
              <div
                className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-lg border"
                style={{
                  background: getHealthBg(entry.score),
                  color,
                  borderColor: `${color}44`,
                  backdropFilter: 'blur(8px)',
                  minWidth: '60px',
                  textAlign: 'center',
                }}
              >
                {getHealthLabel(entry.status)}
                <div className="text-[9px] font-normal opacity-70 mt-0.5">
                  Score: {entry.score}
                </div>
              </div>

              {/* Live reading value */}
              {reading && (
                <div
                  className="px-2 py-0.5 rounded text-[11px] font-mono shadow-md border"
                  style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: '#e2e8f0',
                    borderColor: `${color}33`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {reading.value.toFixed(1)}
                  <span className="text-[9px] opacity-60 ml-1">{reading.unit}</span>
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
      })}
    </group>
  );
}

export default IoTOverlayLayer;
