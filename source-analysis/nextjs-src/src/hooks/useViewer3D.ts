'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewerState, ViewerControls, MeshData, Hotspot } from '@/types/viewer3d';

export const useViewer3D = (assetId: number) => {
  const [viewerState, setViewerState] = useState<ViewerState>({
    camera: {
      position: [10, 10, 10],
      target: [0, 0, 0],
      zoom: 1
    },
    selectedMeshId: null,
    highlightedMeshId: null,
    explodedView: false,
    explodeDistance: 2,
    visibleLayers: ['default'],
    hotspots: []
  });

  const [meshData, setMeshData] = useState<MeshData[]>([]);
  const viewerRef = useRef<any>(null);

  // Load hotspots
  useEffect(() => {
    const loadHotspots = async () => {
      try {
        const response = await fetch(`/api/v1/eam/hotspots?asset_id=${assetId}`);
        if (response.ok) {
          const data = await response.json();
          setViewerState(prev => ({ ...prev, hotspots: data.data || [] }));
        }
      } catch (error) {
        console.error('Error loading hotspots:', error);
      }
    };

    if (assetId) {
      loadHotspots();
    }
  }, [assetId]);

  const selectMesh = useCallback((meshId: string) => {
    setViewerState(prev => ({ ...prev, selectedMeshId: meshId }));
    
    // Sync with tree
    const event = new CustomEvent('meshSelected', { detail: { meshId } });
    window.dispatchEvent(event);
  }, []);

  const highlightMesh = useCallback((meshId: string | null) => {
    setViewerState(prev => ({ ...prev, highlightedMeshId: meshId }));
  }, []);

  const setCameraPosition = useCallback((position: [number, number, number], target: [number, number, number]) => {
    setViewerState(prev => ({
      ...prev,
      camera: { ...prev.camera, position, target }
    }));
  }, []);

  const setExplodedView = useCallback((exploded: boolean, distance = 2) => {
    setViewerState(prev => ({
      ...prev,
      explodedView: exploded,
      explodeDistance: distance
    }));
  }, []);

  const toggleLayer = useCallback((layer: string, visible: boolean) => {
    setViewerState(prev => ({
      ...prev,
      visibleLayers: visible 
        ? [...prev.visibleLayers, layer]
        : prev.visibleLayers.filter(l => l !== layer)
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      camera: {
        position: [10, 10, 10],
        target: [0, 0, 0],
        zoom: 1
      },
      selectedMeshId: null,
      highlightedMeshId: null,
      explodedView: false
    }));
  }, []);

  const fitToView = useCallback(() => {
    if (viewerRef.current?.fitToView) {
      viewerRef.current.fitToView();
    }
  }, []);

  const controls: ViewerControls = {
    selectMesh,
    highlightMesh,
    setCameraPosition,
    setExplodedView,
    toggleLayer,
    resetView,
    fitToView
  };

  return {
    viewerState,
    controls,
    meshData,
    setMeshData,
    viewerRef
  };
};
