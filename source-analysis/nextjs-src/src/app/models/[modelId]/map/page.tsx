'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { modelService } from '@/services/modelService';
import { useAlert } from '@/hooks/useAlert';

interface MeshMapping {
  id?: string;
  mesh_name: string;
  part_id?: number;
  part_name?: string;
  part_code?: string;
  mapping_confidence: number;
}

interface Part {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export default function MeshPartMappingPage() {
  const params = useParams();
  const { showAlert } = useAlert();
  const modelId = params.modelId as string;

  const [meshNames, setMeshNames] = useState<string[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [mappings, setMappings] = useState<MeshMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedMesh, setDraggedMesh] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [modelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load mesh names from model
      const modelData = await modelService.parseModel(modelId);
      setMeshNames(modelData.mesh_names || []);

      // Load available parts
      const partsData = await modelService.getAvailableParts();
      setParts(partsData);

      // Load existing mappings
      const mappingsData = await modelService.getMappings(modelId);
      setMappings(mappingsData);

    } catch (error) {
      showAlert('Failed to load mapping data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMap = async () => {
    try {
      const result = await modelService.autoMapMeshesToParts(modelId, meshNames);
      showAlert(`Auto-mapped ${result.length} meshes`, 'success');
      loadData(); // Reload to show new mappings
    } catch (error) {
      showAlert('Auto-mapping failed', 'error');
      console.error('Auto-mapping error:', error);
    }
  };

  const handleManualMap = async (meshName: string, partId: number) => {
    try {
      await modelService.mapMeshToPart(modelId, meshName, partId, 1.0);
      showAlert('Mapping created successfully', 'success');
      loadData(); // Reload to show new mapping
    } catch (error) {
      showAlert('Failed to create mapping', 'error');
      console.error('Mapping error:', error);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await modelService.deleteMapping(mappingId);
      showAlert('Mapping deleted successfully', 'success');
      loadData(); // Reload to remove deleted mapping
    } catch (error) {
      showAlert('Failed to delete mapping', 'error');
      console.error('Delete error:', error);
    }
  };

  const handleDragStart = (meshName: string) => {
    setDraggedMesh(meshName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, partId: number) => {
    e.preventDefault();
    if (draggedMesh) {
      handleManualMap(draggedMesh, partId);
      setDraggedMesh(null);
    }
  };

  const getMappingForMesh = (meshName: string) => {
    return mappings.find(m => m.mesh_name === meshName);
  };

  const getUnmappedMeshes = () => {
    return meshNames.filter(mesh => !getMappingForMesh(mesh));
  };

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mesh to Part Mapping</h1>
        <p className="text-gray-600">Map 3D model meshes to EAM system parts</p>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={handleAutoMap}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Auto-Map All
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
          >
            Refresh
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {mappings.length} of {meshNames.length} meshes mapped
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unmapped Meshes */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Unmapped Meshes ({getUnmappedMeshes().length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getUnmappedMeshes().map((meshName) => (
                <div
                  key={meshName}
                  draggable
                  onDragStart={() => handleDragStart(meshName)}
                  className="p-3 bg-gray-50 rounded-md border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-sm">{meshName}</div>
                  <div className="text-xs text-gray-500">Drag to part to map</div>
                </div>
              ))}
              {getUnmappedMeshes().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  All meshes are mapped!
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Available Parts */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Available Parts</h2>
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredParts.map((part) => (
                <div
                  key={part.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, part.id)}
                  className="p-3 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium text-sm">{part.name}</div>
                  <div className="text-xs text-gray-500">{part.code}</div>
                  {part.description && (
                    <div className="text-xs text-gray-400 mt-1">{part.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Current Mappings */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Current Mappings ({mappings.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id || mapping.mesh_name}
                  className="p-3 bg-green-50 border border-green-200 rounded-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{mapping.mesh_name}</div>
                      <div className="text-xs text-gray-600">
                        → {mapping.part_name} ({mapping.part_code})
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="text-xs text-gray-500">
                          Confidence: {(mapping.mapping_confidence * 100).toFixed(0)}%
                        </div>
                        <div
                          className="ml-2 h-2 w-16 bg-gray-200 rounded-full overflow-hidden"
                        >
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${mapping.mapping_confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {mapping.id && (
                      <button
                        onClick={() => handleDeleteMapping(mapping.id!)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {mappings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No mappings created yet
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Auto-Mapping</h4>
              <ul className="space-y-1">
                <li>• Click "Auto-Map All" to automatically match meshes to parts</li>
                <li>• Uses intelligent name matching algorithms</li>
                <li>• Provides confidence scores for each mapping</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Manual Mapping</h4>
              <ul className="space-y-1">
                <li>• Drag unmapped meshes to the desired parts</li>
                <li>• Use search to find specific parts quickly</li>
                <li>• Delete incorrect mappings using the × button</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}