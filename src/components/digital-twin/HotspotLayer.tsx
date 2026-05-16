'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useDigitalTwinStore, type DigitalTwinHotspot } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface HotspotLayerProps {
  /** Override hotspots from the store (optional) */
  hotspots?: DigitalTwinHotspot[];
}

// ============================================================================
// Hotspot type styling
// ============================================================================

const HOTSPOT_STYLES: Record<string, { bg: string; border: string; icon: string; pulse: boolean }> = {
  info: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', icon: 'ℹ️', pulse: false },
  warning: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', icon: '⚠️', pulse: true },
  critical: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', icon: '🔴', pulse: true },
  link: { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', icon: '🔗', pulse: false },
};

// ============================================================================
// Single Hotspot Component
// ============================================================================

interface HotspotPinProps {
  hotspot: DigitalTwinHotspot;
  isActive: boolean;
  onClick: (id: string) => void;
}

function HotspotPin({ hotspot, isActive, onClick }: HotspotPinProps) {
  const style = HOTSPOT_STYLES[hotspot.type] ?? HOTSPOT_STYLES.info;

  // CSS-driven pulse animation
  const pulseClass = style.pulse ? 'animate-pulse' : '';

  return (
    <Html
      position={hotspot.position}
      center
      distanceFactor={12}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`flex flex-col items-center cursor-pointer group ${pulseClass}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(hotspot.id);
        }}
      >
        {/* Pin dot */}
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-125"
          style={{
            background: style.bg,
            border: `2px solid ${style.border}`,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 0 12px ${style.border}44`,
          }}
        >
          <span className="text-xs">{style.icon}</span>
        </div>

        {/* Connecting line */}
        <div
          className="w-px mt-1"
          style={{
            height: '16px',
            background: `linear-gradient(to bottom, ${style.border}88, transparent)`,
          }}
        />

        {/* Label (show on hover or when active) */}
        {(isActive || true) && (
          <div
            className="mt-1 px-2 py-1 rounded-md text-[10px] font-medium max-w-[120px] text-center shadow-xl"
            style={{
              background: 'rgba(10,10,20,0.9)',
              color: style.border,
              border: `1px solid ${style.border}44`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {hotspot.title}
          </div>
        )}
      </div>
    </Html>
  );
}

// ============================================================================
// Main HotspotLayer Component
// ============================================================================

export function HotspotLayer({ hotspots: externalHotspots }: HotspotLayerProps) {
  const hotspotsVisible = useDigitalTwinStore((s) => s.hotspotsVisible);
  const storeHotspots = useDigitalTwinStore((s) => s.currentScene?.hotspots ?? []);
  const activeHotspotId = useDigitalTwinStore((s) => s.activeHotspotId);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);

  const hotspots = externalHotspots ?? storeHotspots;

  const handleHotspotClick = useMemo(
    () => (id: string) => {
      const hotspot = hotspots.find((h) => h.id === id);
      if (hotspot?.meshName) {
        selectMesh(hotspot.meshName);
      }
    },
    [hotspots, selectMesh],
  );

  if (!hotspotsVisible || hotspots.length === 0) return null;

  return (
    <group>
      {hotspots.map((hotspot) => (
        <HotspotPin
          key={hotspot.id}
          hotspot={hotspot}
          isActive={activeHotspotId === hotspot.id}
          onClick={handleHotspotClick}
        />
      ))}
    </group>
  );
}

export default HotspotLayer;
