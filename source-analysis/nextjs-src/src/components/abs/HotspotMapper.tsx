'use client';

import { useState, useRef } from 'react';

interface Hotspot {
  id?: number;
  asset_node_id: number;
  x_position: number;
  y_position: number;
  hotspot_label?: string;
  node_name?: string;
}

interface HotspotMapperProps {
  machineId: number;
  imageUrl: string;
  hotspots: Hotspot[];
  nodes: any[];
  onAddHotspot: (hotspot: Omit<Hotspot, 'id'>) => void;
  onHotspotClick: (hotspot: Hotspot) => void;
  editMode?: boolean;
}

export default function HotspotMapper({
  machineId,
  imageUrl,
  hotspots,
  nodes,
  onAddHotspot,
  onHotspotClick,
  editMode = false,
}: HotspotMapperProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || !selectedNodeId) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const node = nodes.find((n) => n.id === selectedNodeId);
    
    onAddHotspot({
      asset_node_id: selectedNodeId,
      x_position: x,
      y_position: y,
      hotspot_label: node?.node_name || '',
    });

    setSelectedNodeId(null);
  };

  return (
    <div className="space-y-4">
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Hotspot Editor Mode</h3>
          <p className="text-sm text-blue-700 mb-3">Select a node, then click on the image to place a hotspot</p>
          <select
            value={selectedNodeId || ''}
            onChange={(e) => setSelectedNodeId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a node...</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.node_name} ({node.node_code})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div
          ref={imageRef}
          className="relative cursor-crosshair"
          onClick={handleImageClick}
          style={{ paddingBottom: '75%' }}
        >
          <img
            src={imageUrl}
            alt="Machine"
            className="absolute inset-0 w-full h-full object-contain"
          />
          
          {hotspots.map((hotspot, index) => (
            <div
              key={hotspot.id || index}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{
                left: `${hotspot.x_position}%`,
                top: `${hotspot.y_position}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onHotspotClick(hotspot);
              }}
            >
              <div className="relative">
                <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg animate-pulse group-hover:scale-125 transition-transform"></div>
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {hotspot.hotspot_label || hotspot.node_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!editMode && hotspots.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hotspots defined</p>
          <p className="text-sm mt-1">Enable edit mode to add hotspots</p>
        </div>
      )}
    </div>
  );
}
