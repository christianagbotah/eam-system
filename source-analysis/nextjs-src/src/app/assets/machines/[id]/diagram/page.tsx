'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import HierarchyTree from '@/components/diagram/HierarchyTree';
import Model2DViewer from '@/components/diagram/Model2DViewer';
import Model3DViewer from '@/components/diagram/Model3DViewer';
import HotspotPanel from '@/components/diagram/HotspotPanel';
import { modelService } from '@/services/modelService';

interface MachineData {
  id: number;
  name: string;
  model?: any;
  hierarchy: any;
  hotspots: any[];
}

export default function MachineDiagramPage() {
  const params = useParams();
  const machineId = parseInt(params.id as string);
  
  const [machineData, setMachineData] = useState<MachineData | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [exploded, setExploded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMachineData();
  }, [machineId]);

  const loadMachineData = async () => {
    try {
      const data = await modelService.getModelViewerData(machineId);
      setMachineData(data);
    } catch (error) {
      console.error('Failed to load machine data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeSelect = (node: any) => {
    setSelectedNode(node);
  };

  const handleNodeHover = (node: any, hovered: boolean) => {
    setHoveredNode(hovered ? node : null);
  };

  const handleLayerToggle = async (layerId: number, visible: boolean) => {
    try {
      // Update layer visibility via API
      await modelService.updateLayerVisibility(machineData!.model.id, { [layerId]: visible });
      // Update local state
      setMachineData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          model: {
            ...prev.model,
            layers: prev.model.layers?.map(layer => 
              layer.id === layerId ? { ...layer, visible_default: visible } : layer
            )
          }
        };
      });
    } catch (error) {
      console.error('Failed to update layer visibility:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!machineData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Machine Not Found</h2>
          <p className="text-gray-600">The requested machine could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Hierarchy Tree */}
      <div className="w-80 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">{machineData.name}</h1>
          <p className="text-sm text-gray-600">Machine Diagram</p>
        </div>
        <HierarchyTree
          hierarchy={machineData.hierarchy}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
          onNodeHover={handleNodeHover}
        />
      </div>

      {/* Center Panel - Model Viewer */}
      <div className="flex-1 relative">
        {machineData.model ? (
          machineData.model.model_type === '3D' ? (
            <Model3DViewer
              modelPath={modelService.getModelFileUrl(machineData.model.id)}
              hotspots={machineData.hotspots}
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
              layers={machineData.model.layers}
              onLayerToggle={handleLayerToggle}
              exploded={exploded}
              onExplodedChange={setExploded}
            />
          ) : (
            <Model2DViewer
              modelPath={modelService.getModelFileUrl(machineData.model.id)}
              hotspots={machineData.hotspots}
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
              layers={machineData.model.layers}
              onLayerToggle={handleLayerToggle}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No Model Available</h3>
              <p className="text-gray-600">Upload a model to view the machine diagram</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Hotspot Info */}
      <div className="w-80 bg-white shadow-lg">
        <HotspotPanel
          selectedNode={selectedNode}
          onAssignPM={(node) => console.log('Assign PM to:', node)}
        />
      </div>
    </div>
  );
}