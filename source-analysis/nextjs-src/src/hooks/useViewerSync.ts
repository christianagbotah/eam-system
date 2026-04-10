import { useState, useCallback, useRef } from 'react';

interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
  rotation?: { x: number; y: number; z: number };
  selectedNode?: any;
  hoveredNode?: any;
}

export function useViewerSync() {
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 }
  });
  
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [exploded, setExploded] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<number, boolean>>({});
  
  const syncCallbacks = useRef<Set<(state: ViewState) => void>>(new Set());

  const registerSyncCallback = useCallback((callback: (state: ViewState) => void) => {
    syncCallbacks.current.add(callback);
    return () => syncCallbacks.current.delete(callback);
  }, []);

  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => {
      const newState = { ...prev, ...updates };
      syncCallbacks.current.forEach(callback => callback(newState));
      return newState;
    });
  }, []);

  const selectNode = useCallback((node: any) => {
    setSelectedNode(node);
    updateViewState({ selectedNode: node });
  }, [updateViewState]);

  const hoverNode = useCallback((node: any, hovered: boolean) => {
    const hoveredNode = hovered ? node : null;
    setHoveredNode(hoveredNode);
    updateViewState({ hoveredNode });
  }, [updateViewState]);

  const toggleExploded = useCallback(() => {
    setExploded(prev => !prev);
  }, []);

  const toggleLayer = useCallback((layerId: number, visible: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: visible
    }));
  }, []);

  const focusOnNode = useCallback((node: any) => {
    if (node) {
      // Calculate optimal view for focusing on node
      const focusState = {
        zoom: 1.5,
        pan: { x: 0, y: 0 }, // Will be calculated based on node position
        selectedNode: node
      };
      updateViewState(focusState);
    }
  }, [updateViewState]);

  return {
    viewState,
    selectedNode,
    hoveredNode,
    exploded,
    layerVisibility,
    selectNode,
    hoverNode,
    toggleExploded,
    toggleLayer,
    focusOnNode,
    updateViewState,
    registerSyncCallback
  };
}
