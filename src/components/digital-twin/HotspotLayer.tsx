'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  useDigitalTwinStore,
  type DigitalTwinHotspot,
} from '@/stores/digitalTwinStore';

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

const HOTSPOT_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    icon: string;
    pulse: boolean;
    shadow: string;
    label: string;
  }
> = {
  info: {
    bg: 'rgba(59,130,246,0.2)',
    border: '#3b82f6',
    icon: 'ℹ️',
    pulse: false,
    shadow: 'rgba(59,130,246,0.3)',
    label: '#60a5fa',
  },
  warning: {
    bg: 'rgba(245,158,11,0.2)',
    border: '#f59e0b',
    icon: '⚠️',
    pulse: true,
    shadow: 'rgba(245,158,11,0.3)',
    label: '#fbbf24',
  },
  critical: {
    bg: 'rgba(239,68,68,0.25)',
    border: '#ef4444',
    icon: '🔴',
    pulse: true,
    shadow: 'rgba(239,68,68,0.4)',
    label: '#f87171',
  },
  link: {
    bg: 'rgba(139,92,246,0.2)',
    border: '#8b5cf6',
    icon: '🔗',
    pulse: false,
    shadow: 'rgba(139,92,246,0.3)',
    label: '#a78bfa',
  },
};

// ============================================================================
// Single Hotspot Component with proximity fade
// ============================================================================

interface HotspotPinProps {
  hotspot: DigitalTwinHotspot;
  isActive: boolean;
  onClick: (id: string) => void;
  index: number;
}

function HotspotPin({ hotspot, isActive, onClick, index }: HotspotPinProps) {
  const style = HOTSPOT_STYLES[hotspot.type] ?? HOTSPOT_STYLES.info;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const opacityRef = useRef(1);
  const { camera } = useThree();
  const frameCounterRef = useRef(0);

  // Proximity-based visibility
  useFrame(() => {
    const hotspotPos = new THREE.Vector3(...hotspot.position);
    const distance = camera.position.distanceTo(hotspotPos);

    const minDistance = 3;
    const maxDistance = 30;

    let target: number;
    if (distance > maxDistance) {
      target = 0;
    } else if (distance < minDistance) {
      target = 0.5;
    } else {
      const t = (distance - minDistance) / (maxDistance - minDistance);
      target = 0.5 + t * 0.5;
    }

    opacityRef.current += (target - opacityRef.current) * 0.06;

    // Toggle visibility when opacity is effectively zero
    if (opacityRef.current < 0.02 && isVisible) {
      setIsVisible(false);
    } else if (opacityRef.current >= 0.02 && !isVisible) {
      setIsVisible(true);
    }

    // Update React state every 6 frames
    frameCounterRef.current++;
    if (frameCounterRef.current % 6 === 0) {
      setOpacity(opacityRef.current);
    }
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(hotspot.id);
      setIsExpanded((prev) => !prev);
    },
    [hotspot.id, onClick],
  );

  if (!isVisible) return null;

  // CSS-driven pulse animation for critical/warning
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
        className="flex flex-col items-center cursor-pointer group"
        style={{ opacity }}
        onClick={handleClick}
      >
        {/* Ping animation for critical types */}
        {style.pulse && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: `${style.shadow}`,
              animationDuration: '2s',
              transform: 'scale(1.8)',
            }}
          />
        )}

        {/* Pin dot — billboard behavior via centering */}
        <div
          className={`relative h-7 w-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-125 group-hover:shadow-xl ${pulseClass}`}
          style={{
            background: style.bg,
            border: `2px solid ${style.border}`,
            backdropFilter: 'blur(12px)',
            boxShadow: isActive
              ? `0 0 20px ${style.shadow}, inset 0 0 8px ${style.shadow}`
              : `0 0 12px ${style.shadow}`,
          }}
        >
          <span className="text-sm">{style.icon}</span>

          {/* Inner glow ring when active */}
          {isActive && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1px solid ${style.border}`,
                animation: 'pulse 2s infinite',
              }}
            />
          )}
        </div>

        {/* Connecting line */}
        <div
          className="w-px mt-1"
          style={{
            height: '16px',
            background: `linear-gradient(to bottom, ${style.border}88, transparent)`,
          }}
        />

        {/* Label — always visible, enhanced when active or expanded */}
        <div
          className="mt-1 px-2 py-1 rounded-md text-[10px] font-medium max-w-[140px] text-center shadow-xl transition-all duration-300"
          style={{
            background: isActive || isExpanded
              ? 'rgba(10,10,20,0.95)'
              : 'rgba(10,10,20,0.85)',
            color: style.label,
            border: `1px solid ${
              isActive || isExpanded
                ? `${style.border}66`
                : `${style.border}33`
            }`,
            backdropFilter: 'blur(12px)',
          }}
        >
          {hotspot.title}
        </div>

        {/* Expanded details panel */}
        {isExpanded && hotspot.description && (
          <div
            className="mt-1.5 px-3 py-2 rounded-lg shadow-2xl max-w-[180px] border"
            style={{
              background: 'rgba(10,10,20,0.95)',
              border: `1px solid ${style.border}44`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {hotspot.description}
            </p>
            {hotspot.linkUrl && (
              <div
                className="mt-1.5 text-[9px] underline"
                style={{ color: style.label }}
              >
                {hotspot.linkUrl}
              </div>
            )}
          </div>
        )}
      </div>
    </Html>
  );
}

// ============================================================================
// Main HotspotLayer Component
// ============================================================================

export function HotspotLayer({
  hotspots: externalHotspots,
}: HotspotLayerProps) {
  const hotspotsVisible = useDigitalTwinStore((s) => s.hotspotsVisible);
  const storeHotspots = useDigitalTwinStore(
    (s) => s.currentScene?.hotspots ?? [],
  );
  const activeHotspotId = useDigitalTwinStore((s) => s.activeHotspotId);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);

  const hotspots = externalHotspots ?? storeHotspots;

  const handleHotspotClick = useCallback(
    (id: string) => {
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
      {hotspots.map((hotspot, index) => (
        <HotspotPin
          key={hotspot.id}
          hotspot={hotspot}
          isActive={activeHotspotId === hotspot.id}
          onClick={handleHotspotClick}
          index={index}
        />
      ))}
    </group>
  );
}

export default HotspotLayer;
