'use client';

import { useCallback, useState, useRef } from 'react';
import {
  Box,
  Scissors,
  Activity,
  MapPin,
  MessageSquare,
  RotateCcw,
  Maximize2,
  Minimize2,
  Camera,
  Settings,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface TwinToolbarProps {
  /** Callback to reset camera via Three.js controls */
  onResetCamera?: () => void;
  /** Callback to take a screenshot */
  onScreenshot?: () => void;
  /** Whether the viewer is currently fullscreen */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen */
  onToggleFullscreen?: () => void;
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
}

function ToolbarButton({ icon, label, isActive, onClick, shortcut, danger }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={`
            h-8 w-8 rounded-md transition-all duration-150
            ${isActive
              ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
              : danger
                ? 'text-slate-300 hover:text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }
          `}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-slate-900 border-slate-700 text-slate-200 text-xs"
      >
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
              {shortcut}
            </kbd>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Divider
// ============================================================================

function ToolbarDivider() {
  return <div className="h-5 w-px bg-white/10 mx-1" />;
}

// ============================================================================
// Main Toolbar Component
// ============================================================================

export function TwinToolbar({
  onResetCamera,
  onScreenshot,
  isFullscreen = false,
  onToggleFullscreen,
}: TwinToolbarProps) {
  const explodeMode = useDigitalTwinStore((s) => s.explodeMode);
  const sectionMode = useDigitalTwinStore((s) => s.sectionMode);
  const iotOverlayEnabled = useDigitalTwinStore((s) => s.iotOverlayEnabled);
  const hotspotsVisible = useDigitalTwinStore((s) => s.hotspotsVisible);
  const annotationsVisible = useDigitalTwinStore((s) => s.annotationsVisible);

  const toggleExplodeMode = useDigitalTwinStore((s) => s.toggleExplodeMode);
  const toggleSectionMode = useDigitalTwinStore((s) => s.toggleSectionMode);
  const toggleIoTOverlay = useDigitalTwinStore((s) => s.toggleIoTOverlay);
  const toggleHotspots = useDigitalTwinStore((s) => s.toggleHotspots);
  const toggleAnnotations = useDigitalTwinStore((s) => s.toggleAnnotations);

  const [showSettings, setShowSettings] = useState(false);

  // ── Screenshot handler ──────────────────────────────────────────────────

  const handleScreenshot = useCallback(() => {
    if (onScreenshot) {
      onScreenshot();
    }
  }, [onScreenshot]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl shadow-2xl"
        style={{
          background: 'rgba(15,15,25,0.8)',
          border: '1px solid rgba(148,163,184,0.12)',
          backdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        {/* Exploded View */}
        <ToolbarButton
          icon={<Box className="h-4 w-4" />}
          label="Exploded View"
          shortcut="E"
          isActive={explodeMode}
          onClick={toggleExplodeMode}
        />

        {/* Section Mode */}
        <ToolbarButton
          icon={<Scissors className="h-4 w-4" />}
          label="Section Plane"
          shortcut="S"
          isActive={sectionMode}
          onClick={toggleSectionMode}
        />

        <ToolbarDivider />

        {/* IoT Overlay */}
        <ToolbarButton
          icon={<Activity className="h-4 w-4" />}
          label="IoT Overlay"
          shortcut="I"
          isActive={iotOverlayEnabled}
          onClick={toggleIoTOverlay}
        />

        {/* Hotspots */}
        <ToolbarButton
          icon={<MapPin className="h-4 w-4" />}
          label="Hotspots"
          shortcut="H"
          isActive={hotspotsVisible}
          onClick={toggleHotspots}
        />

        {/* Annotations */}
        <ToolbarButton
          icon={<MessageSquare className="h-4 w-4" />}
          label="Annotations"
          shortcut="A"
          isActive={annotationsVisible}
          onClick={toggleAnnotations}
        />

        <ToolbarDivider />

        {/* Reset Camera */}
        <ToolbarButton
          icon={<RotateCcw className="h-4 w-4" />}
          label="Reset Camera"
          shortcut="R"
          onClick={onResetCamera ?? (() => {})}
        />

        {/* Screenshot */}
        <ToolbarButton
          icon={<Camera className="h-4 w-4" />}
          label="Screenshot"
          onClick={handleScreenshot}
        />

        {/* Fullscreen */}
        <ToolbarButton
          icon={isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          shortcut="F"
          onClick={onToggleFullscreen ?? (() => {})}
        />
      </div>
    </div>
  );
}

export default TwinToolbar;
