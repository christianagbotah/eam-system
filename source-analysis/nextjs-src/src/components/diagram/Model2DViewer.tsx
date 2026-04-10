'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface Model2DViewerProps {
  modelPath: string;
  hotspots: any[];
  selectedNode: any;
  onNodeSelect: (node: any) => void;
  layers?: any[];
  onLayerToggle?: (layerId: number, visible: boolean) => void;
}

export default function Model2DViewer({
  modelPath,
  hotspots,
  selectedNode,
  onNodeSelect,
  layers = [],
  onLayerToggle
}: Model2DViewerProps) {
  const [svgContent, setSvgContent] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [layerVisibility, setLayerVisibility] = useState<Record<number, boolean>>({});
  const [hoveredHotspot, setHoveredHotspot] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const initialVisibility: Record<number, boolean> = {};
    layers.forEach(layer => {
      initialVisibility[layer.id] = layer.visible_default;
    });
    setLayerVisibility(initialVisibility);
  }, [layers]);

  useEffect(() => {
    loadSVG();
  }, [modelPath]);

  const loadSVG = async () => {
    try {
      const response = await fetch(modelPath);
      const content = await response.text();
      setSvgContent(content);
    } catch (error) {
      console.error('Failed to load SVG:', error);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleHotspotClick = (hotspot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeSelect(hotspot);
  };

  const handleLayerToggle = (layerId: number, visible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layerId]: visible }));
    onLayerToggle?.(layerId, visible);
  };

  // Focus on selected node
  useEffect(() => {
    if (selectedNode && containerRef.current) {
      const hotspot = hotspots.find(h => h.id === selectedNode.id);
      if (hotspot) {
        // Center view on selected hotspot
        const containerRect = containerRef.current.getBoundingClientRect();
        const targetX = (hotspot.x / 100) * containerRect.width;
        const targetY = (hotspot.y / 100) * containerRect.height;
        
        setPan({
          x: containerRect.width / 2 - targetX * zoom,
          y: containerRect.height / 2 - targetY * zoom
        });
        
        // Zoom in if not already zoomed
        if (zoom < 1.5) {
          setZoom(1.5);
        }
      }
    }
  }, [selectedNode, hotspots, zoom]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Layer Controls */}
      {layers.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 max-w-xs z-10">
          <h4 className="font-medium mb-2 text-sm">Layers</h4>
          {layers.map((layer) => (
            <div key={layer.id} className="flex items-center justify-between mb-1">
              <span className="text-xs">{layer.layer_name}</span>
              <button
                onClick={() => handleLayerToggle(layer.id, !layerVisibility[layer.id])}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {layerVisibility[layer.id] ? (
                  <Eye size={14} className="text-blue-500" />
                ) : (
                  <EyeOff size={14} className="text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SVG Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
          className="w-full h-full flex items-center justify-center"
        >
          {svgContent && (
            <div className="relative">
              <div
                dangerouslySetInnerHTML={{ __html: svgContent }}
                className="max-w-full max-h-full"
              />
              
              {/* Hotspot Overlays */}
              {hotspots.map((hotspot) => (
                <div
                  key={hotspot.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                    selectedNode?.id === hotspot.id ? 'z-20' : 'z-10'
                  }`}
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                  }}
                  onClick={(e) => handleHotspotClick(hotspot, e)}
                  onMouseEnter={() => setHoveredHotspot(hotspot)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all ${
                      selectedNode?.id === hotspot.id
                        ? 'bg-blue-500 animate-pulse scale-125'
                        : hoveredHotspot?.id === hotspot.id
                        ? 'bg-yellow-500 scale-110'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  />
                  {/* Tooltip */}
                  {hoveredHotspot?.id === hotspot.id && (
                    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-30 pointer-events-none">
                      {hotspot.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-lg shadow-md text-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
