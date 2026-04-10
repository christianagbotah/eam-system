'use client';

import React from 'react';
import { ViewerState, ViewerControls } from '@/types/viewer3d';

interface ViewerControlsProps {
  viewerState: ViewerState;
  controls: ViewerControls;
}

export default function ViewerControlsPanel({ viewerState, controls }: ViewerControlsProps) {
  const layers = ['machine', 'assembly', 'part'];

  return (
    <div className="bg-white border-l border-gray-200 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">View Controls</h3>
        <div className="space-y-2">
          <button
            onClick={() => controls.setExplodedView(!viewerState.explodedView)}
            className={`w-full px-3 py-2 text-sm rounded ${
              viewerState.explodedView
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {viewerState.explodedView ? 'Normal View' : 'Exploded View'}
          </button>
          
          {viewerState.explodedView && (
            <div className="px-2">
              <label className="block text-xs text-gray-600 mb-1">Explode Distance</label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={viewerState.explodeDistance}
                onChange={(e) => controls.setExplodedView(true, parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">{viewerState.explodeDistance}x</div>
            </div>
          )}
          
          <button
            onClick={controls.resetView}
            className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Reset View
          </button>
          
          <button
            onClick={controls.fitToView}
            className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Fit to View
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Layer Visibility</h3>
        <div className="space-y-2">
          {layers.map(layer => (
            <label key={layer} className="flex items-center">
              <input
                type="checkbox"
                checked={viewerState.visibleLayers.includes(layer)}
                onChange={(e) => controls.toggleLayer(layer, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm capitalize">{layer}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Camera Info</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Position: {viewerState.camera.position.map(v => v.toFixed(1)).join(', ')}</div>
          <div>Target: {viewerState.camera.target.map(v => v.toFixed(1)).join(', ')}</div>
          <div>Zoom: {viewerState.camera.zoom.toFixed(2)}</div>
        </div>
      </div>

      {viewerState.selectedMeshId && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Selected</h3>
          <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
            {viewerState.selectedMeshId}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Hotspots</h3>
        <div className="text-xs text-gray-600">
          {viewerState.hotspots.length} hotspots loaded
        </div>
      </div>
    </div>
  );
}
