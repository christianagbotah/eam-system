'use client';

import { useCallback, useRef } from 'react';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

/** Mesh metadata extracted from a 3D object */
export interface MeshMeta {
  /** The unique name of the mesh */
  name: string;
  /** The associated asset ID if any */
  assetId?: string;
  /** Whether the mesh is currently visible */
  visible?: boolean;
}

/** Return type for useMeshInteraction */
export interface UseMeshInteractionReturn {
  /** Currently selected mesh name */
  selectedMeshName: string | null;
  /** Currently selected asset ID */
  selectedAssetId: string | null;
  /** Currently hovered mesh name */
  hoveredMeshName: string | null;
  /** Whether the info panel is open */
  isInfoPanelOpen: boolean;
  /** Handle a mesh click event from the 3D viewer */
  handleMeshClick: (mesh: MeshMeta | null) => void;
  /** Handle a mesh hover event from the 3D viewer */
  handleMeshHover: (mesh: MeshMeta | null) => void;
  /** Handle pointer leaving all meshes */
  handleMeshLeave: () => void;
  /** Close the info panel */
  closeInfoPanel: () => void;
  /** Toggle the info panel */
  toggleInfoPanel: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useMeshInteraction
 *
 * Provides mesh click/hover handlers that integrate with the digital twin
 * Zustand store. Handles selection state, info panel toggling, and debounced
 * hover transitions to avoid excessive re-renders.
 */
export function useMeshInteraction(): UseMeshInteractionReturn {
  // Store actions & state
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);
  const selectedAssetId = useDigitalTwinStore((s) => s.selectedAssetId);
  const hoveredMeshName = useDigitalTwinStore((s) => s.hoveredMeshName);
  const isInfoPanelOpen = useDigitalTwinStore((s) => s.isInfoPanelOpen);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);
  const hoverMesh = useDigitalTwinStore((s) => s.hoverMesh);
  const setInfoPanelOpen = useDigitalTwinStore((s) => s.setInfoPanelOpen);

  // ──────────────────────────────────────────────────────────────────────
  // Mesh Click Handler
  // ──────────────────────────────────────────────────────────────────────

  const handleMeshClick = useCallback(
    (mesh: MeshMeta | null) => {
      if (!mesh) {
        // Clicked on empty space — deselect
        selectMesh(null, null);
        return;
      }

      // Skip invisible meshes
      if (mesh.visible === false) return;

      // If clicking the same mesh that's already selected, toggle the info panel
      if (mesh.name === selectedMeshName) {
        setInfoPanelOpen(!isInfoPanelOpen);
        return;
      }

      // Select the new mesh and open info panel
      selectMesh(mesh.name, mesh.assetId ?? null);
    },
    [selectMesh, setInfoPanelOpen, selectedMeshName, isInfoPanelOpen],
  );

  // ──────────────────────────────────────────────────────────────────────
  // Debounced hover update (30ms delay to avoid excessive re-renders)
  // ──────────────────────────────────────────────────────────────────────

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMeshHover = useCallback(
    (mesh: MeshMeta | null) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      // Read latest hoverMesh action from store to avoid stale closures
      const storeHoverMesh = useDigitalTwinStore.getState().hoverMesh;

      if (!mesh || mesh.visible === false) {
        storeHoverMesh(null);
        return;
      }

      // Only update if the hovered mesh changed
      const currentHovered = useDigitalTwinStore.getState().hoveredMeshName;
      if (mesh.name !== currentHovered) {
        hoverTimerRef.current = setTimeout(() => {
          useDigitalTwinStore.getState().hoverMesh(mesh.name);
        }, 30);
      }
    },
    [],
  );

  // ──────────────────────────────────────────────────────────────────────
  // Mesh Leave Handler
  // ──────────────────────────────────────────────────────────────────────

  const handleMeshLeave = useCallback(() => {
    hoverMesh(null);
  }, [hoverMesh]);

  // ──────────────────────────────────────────────────────────────────────
  // Info Panel Controls
  // ──────────────────────────────────────────────────────────────────────

  const closeInfoPanel = useCallback(() => {
    setInfoPanelOpen(false);
  }, [setInfoPanelOpen]);

  const toggleInfoPanel = useCallback(() => {
    setInfoPanelOpen(!isInfoPanelOpen);
  }, [setInfoPanelOpen, isInfoPanelOpen]);

  return {
    selectedMeshName,
    selectedAssetId,
    hoveredMeshName,
    isInfoPanelOpen,
    handleMeshClick,
    handleMeshHover,
    handleMeshLeave,
    closeInfoPanel,
    toggleInfoPanel,
  };
}
