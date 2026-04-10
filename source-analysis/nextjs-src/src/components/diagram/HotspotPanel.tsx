'use client';

import React from 'react';
import { Wrench, Info, Calendar } from 'lucide-react';

interface HotspotPanelProps {
  selectedNode: any;
  onAssignPM: (node: any) => void;
}

export default function HotspotPanel({ selectedNode, onAssignPM }: HotspotPanelProps) {
  if (!selectedNode) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Info size={48} className="mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Selection</h3>
        <p>Click on a part in the diagram to view details</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">{selectedNode.label}</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>Type:</strong> {selectedNode.node_type}</div>
          <div><strong>ID:</strong> {selectedNode.node_id}</div>
          {selectedNode.node_data?.code && (
            <div><strong>Code:</strong> {selectedNode.node_data.code}</div>
          )}
        </div>
      </div>

      {selectedNode.node_data && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Details</h4>
          <div className="text-sm space-y-1">
            {selectedNode.node_data.description && (
              <div>{selectedNode.node_data.description}</div>
            )}
            {selectedNode.node_data.manufacturer && (
              <div><strong>Manufacturer:</strong> {selectedNode.node_data.manufacturer}</div>
            )}
            {selectedNode.node_data.model && (
              <div><strong>Model:</strong> {selectedNode.node_data.model}</div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => onAssignPM(selectedNode)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Wrench size={16} />
          Assign PM Task
        </button>
        
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <Calendar size={16} />
          View Schedule
        </button>
      </div>
    </div>
  );
}
