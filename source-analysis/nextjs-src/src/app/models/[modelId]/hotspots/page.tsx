'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { modelService } from '@/services/modelService';
import { useAlert } from '@/hooks/useAlert';

interface Hotspot {
  id?: string;
  model_id: string;
  node_type: 'machine' | 'assembly' | 'part';
  node_id: number;
  label: string;
  shape: 'circle' | 'rect' | 'poly';
  coords?: { x: number; y: number; width?: number; height?: number; points?: number[] };
  mesh_name?: string;
  world_coords?: { x: number; y: number; z: number };
  metadata?: any;
}

interface ModelData {
  id: string;
  model_type: 'glb' | 'gltf' | 'svg';
  file_path: string;
  optimized_file_path?: string;
}

export default function HotspotEditorPage() {
  const params = useParams();
  const { showAlert } = useAlert();
  const modelId = params.modelId as string;
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'rect' | 'poly'>('circle');
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [modelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const viewerData = await modelService.getViewerData(modelId);
      setModelData(viewerData.model);
      setHotspots(viewerData.hotspots || []);
      
    } catch (error) {
      showAlert('Failed to load hotspot data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!editMode || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (selectedTool === 'circle') {
      createHotspot({
        model_id: modelId,
        node_type: 'part',
        node_id: 0,
        label: 'New Hotspot',
        shape: 'circle',
        coords: { x, y }
      });
    } else if (selectedTool === 'rect') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentDrawing({ x, y });
      } else {
        const width = Math.abs(x - currentDrawing.x);
        const height = Math.abs(y - currentDrawing.y);
        const startX = Math.min(x, currentDrawing.x);
        const startY = Math.min(y, currentDrawing.y);

        createHotspot({
          model_id: modelId,
          node_type: 'part',
          node_id: 0,
          label: 'New Hotspot',
          shape: 'rect',
          coords: { x: startX, y: startY, width, height }
        });

        setIsDrawing(false);
        setCurrentDrawing(null);
      }
    }
  };

  const createHotspot = async (hotspotData: Partial<Hotspot>) => {
    setSelectedHotspot(hotspotData as Hotspot);
    setShowHotspotModal(true);
  };

  const handleSaveHotspot = async (hotspotData: Hotspot) => {
    try {
      if (hotspotData.id) {
        await modelService.updateHotspot(hotspotData.id, hotspotData);
        showAlert('Hotspot updated successfully', 'success');
      } else {
        await modelService.createHotspot(hotspotData);
        showAlert('Hotspot created successfully', 'success');
      }
      
      setShowHotspotModal(false);
      setSelectedHotspot(null);
      loadData();
    } catch (error) {
      showAlert('Failed to save hotspot', 'error');
      console.error('Save error:', error);
    }
  };

  const handleDeleteHotspot = async (hotspotId: string) => {
    try {
      await modelService.deleteHotspot(hotspotId);
      showAlert('Hotspot deleted successfully', 'success');
      loadData();
    } catch (error) {
      showAlert('Failed to delete hotspot', 'error');
      console.error('Delete error:', error);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const meshNames = await modelService.getMeshNames(modelId);
      await modelService.autoGenerateHotspots(modelId, meshNames);
      showAlert('Hotspots auto-generated successfully', 'success');
      loadData();
    } catch (error) {
      showAlert('Failed to auto-generate hotspots', 'error');
      console.error('Auto-generate error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Not Found</h2>
          <p className="text-gray-600">The requested model could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hotspot Editor</h1>
            <p className="text-sm text-gray-600">Model: {modelData.model_type.toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Tools */}
            {editMode && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedTool('circle')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedTool === 'circle'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Circle
                </button>
                <button
                  onClick={() => setSelectedTool('rect')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedTool === 'rect'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Rectangle
                </button>
                <button
                  onClick={() => setSelectedTool('poly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedTool === 'poly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Polygon
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={handleAutoGenerate}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Auto-Generate
            </button>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                editMode
                  ? 'text-white bg-red-600 hover:bg-red-700'
                  : 'text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Model Viewer */}
        <div className="flex-1 relative">
          {modelData.model_type === 'svg' ? (
            <SVGHotspotEditor
              modelData={modelData}
              hotspots={hotspots}
              editMode={editMode}
              selectedTool={selectedTool}
              onHotspotClick={(hotspot) => {
                setSelectedHotspot(hotspot);
                setShowHotspotModal(true);
              }}
              onSVGClick={handleSVGClick}
              svgRef={svgRef}
              isDrawing={isDrawing}
              currentDrawing={currentDrawing}
            />
          ) : (
            <ThreeDHotspotEditor
              modelData={modelData}
              hotspots={hotspots}
              editMode={editMode}
              onHotspotClick={(hotspot) => {
                setSelectedHotspot(hotspot);
                setShowHotspotModal(true);
              }}
            />
          )}
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <HotspotListPanel
            hotspots={hotspots}
            onHotspotSelect={(hotspot) => {
              setSelectedHotspot(hotspot);
              setShowHotspotModal(true);
            }}
            onHotspotDelete={handleDeleteHotspot}
          />
        </div>
      </div>

      {/* Hotspot Modal */}
      {showHotspotModal && selectedHotspot && (
        <HotspotModal
          isOpen={showHotspotModal}
          onClose={() => {
            setShowHotspotModal(false);
            setSelectedHotspot(null);
          }}
          hotspot={selectedHotspot}
          onSave={handleSaveHotspot}
        />
      )}
    </div>
  );
}

// SVG Hotspot Editor Component
function SVGHotspotEditor({ 
  modelData, 
  hotspots, 
  editMode, 
  selectedTool, 
  onHotspotClick, 
  onSVGClick,
  svgRef,
  isDrawing,
  currentDrawing
}: any) {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    const filePath = modelData.optimized_file_path || modelData.file_path;
    fetch(filePath)
      .then(response => response.text())
      .then(content => setSvgContent(content))
      .catch(console.error);
  }, [modelData]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className={`w-full h-full ${editMode ? 'cursor-crosshair' : 'cursor-default'}`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onClick={onSVGClick}
      />
      
      {/* Render hotspots as overlays */}
      {hotspots.map((hotspot: any) => (
        <div
          key={hotspot.id}
          className="absolute cursor-pointer"
          style={{
            left: `${hotspot.coords?.x || 0}%`,
            top: `${hotspot.coords?.y || 0}%`,
            width: hotspot.shape === 'rect' ? `${hotspot.coords?.width || 2}%` : 'auto',
            height: hotspot.shape === 'rect' ? `${hotspot.coords?.height || 2}%` : 'auto',
            transform: hotspot.shape === 'circle' ? 'translate(-50%, -50%)' : 'none'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onHotspotClick(hotspot);
          }}
        >
          {hotspot.shape === 'circle' && (
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          )}
          {hotspot.shape === 'rect' && (
            <div className="w-full h-full bg-red-500 bg-opacity-30 border-2 border-red-500" />
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
            {hotspot.label}
          </div>
        </div>
      ))}

      {/* Current drawing preview */}
      {isDrawing && currentDrawing && selectedTool === 'rect' && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
          style={{
            left: `${currentDrawing.x}%`,
            top: `${currentDrawing.y}%`,
            width: '2%',
            height: '2%'
          }}
        />
      )}
    </div>
  );
}

// 3D Hotspot Editor Component
function ThreeDHotspotEditor({ modelData, hotspots, editMode, onHotspotClick }: any) {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">3D Hotspot Editor</h3>
        <p className="text-gray-600 mb-4">3D hotspot editing coming soon</p>
        <div className="text-sm text-gray-500">
          Current hotspots: {hotspots.length}
        </div>
      </div>
    </div>
  );
}

// Hotspot List Panel Component
function HotspotListPanel({ hotspots, onHotspotSelect, onHotspotDelete }: any) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Hotspots ({hotspots.length})</h3>
      
      <div className="space-y-2">
        {hotspots.map((hotspot: any) => (
          <div
            key={hotspot.id}
            className="p-3 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{hotspot.label}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {hotspot.node_type} • {hotspot.shape}
                </div>
                {hotspot.coords && (
                  <div className="text-xs text-gray-500 mt-1">
                    Position: {hotspot.coords.x?.toFixed(1)}, {hotspot.coords.y?.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onHotspotSelect(hotspot)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onHotspotDelete(hotspot.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {hotspots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hotspots created yet
          </div>
        )}
      </div>
    </div>
  );
}

// Hotspot Modal Component
function HotspotModal({ isOpen, onClose, hotspot, onSave }: any) {
  const [formData, setFormData] = useState(hotspot);

  useEffect(() => {
    setFormData(hotspot);
  }, [hotspot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Hotspot">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={formData.label || ''}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
          <select
            value={formData.node_type || 'part'}
            onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="machine">Machine</option>
            <option value="assembly">Assembly</option>
            <option value="part">Part</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Node ID</label>
          <input
            type="number"
            value={formData.node_id || 0}
            onChange={(e) => setFormData({ ...formData, node_id: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
          <select
            value={formData.shape || 'circle'}
            onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="circle">Circle</option>
            <option value="rect">Rectangle</option>
            <option value="poly">Polygon</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Hotspot
          </button>
        </div>
      </form>
    </Modal>
  );
}