'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import InteractiveModelViewer from '@/components/3d/InteractiveModelViewer';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { modelService } from '@/services/modelService';
import { useAlert } from '@/hooks/useAlert';

interface ModelData {
  id: string;
  machine_id: number;
  model_type: 'glb' | 'gltf' | 'svg';
  file_path: string;
  optimized_file_path?: string;
  thumbnail_path?: string;
  status: string;
}

interface Hotspot {
  id: number;
  label: string;
  x: number;
  y: number;
  z: number;
  node_type: 'machine' | 'assembly' | 'part' | 'subpart';
  node_id: number;
  node_data?: any;
  metadata_json?: any;
}

interface ModelLayer {
  id: number;
  layer_name: string;
  layer_order: number;
  visible_default: boolean;
  color?: string;
  opacity?: number;
}

export default function ModelViewerPage() {
  const params = useParams();
  const { showAlert } = useAlert();
  const modelId = params.modelId as string;

  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [layers, setLayers] = useState<ModelLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [showPMModal, setShowPMModal] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');

  useEffect(() => {
    loadModelData();
  }, [modelId]);

  const loadModelData = async () => {
    try {
      setLoading(true);
      const data = await modelService.getViewerData(modelId);
      
      setModelData(data.model);
      setHotspots(data.hotspots || []);
      setLayers(data.layers || []);
      
      // Set initial view mode based on model type
      if (data.model.model_type === 'svg') {
        setViewMode('2D');
      } else {
        setViewMode('3D');
      }
    } catch (error) {
      showAlert('Failed to load model data', 'error');
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHotspotClick = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
  };

  const handleAssignPMTask = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    setShowPMModal(true);
  };

  const handlePMTaskAssign = async (taskData: any) => {
    try {
      await modelService.assignPMTask({
        asset_node_type: selectedHotspot?.node_type,
        asset_node_id: selectedHotspot?.node_id,
        ...taskData
      });
      
      showAlert('PM task assigned successfully', 'success');
      setShowPMModal(false);
      setSelectedHotspot(null);
    } catch (error) {
      showAlert('Failed to assign PM task', 'error');
      console.error('Error assigning PM task:', error);
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

  const modelPath = modelData.optimized_file_path || modelData.file_path;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Model Viewer</h1>
            <p className="text-sm text-gray-600">Machine ID: {modelData.machine_id}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            {modelData.model_type !== 'svg' && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('3D')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === '3D'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3D View
                </button>
                <button
                  onClick={() => setViewMode('2D')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === '2D'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2D View
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={() => window.open(`/models/${modelId}/map`, '_blank')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit Mapping
            </button>
            <button
              onClick={() => window.open(`/models/${modelId}/hotspots`, '_blank')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit Hotspots
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Model Viewer */}
        <div className="flex-1">
          <InteractiveModelViewer
            modelId={parseInt(modelId)}
            modelPath={modelPath}
            modelType={viewMode}
            hotspots={hotspots}
            layers={layers}
            onHotspotClick={handleHotspotClick}
            onAssignPMTask={handleAssignPMTask}
            className="w-full h-full"
          />
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          {selectedHotspot ? (
            <HotspotDetailPanel
              hotspot={selectedHotspot}
              onClose={() => setSelectedHotspot(null)}
              onAssignPM={() => handleAssignPMTask(selectedHotspot)}
            />
          ) : (
            <ModelInfoPanel
              modelData={modelData}
              hotspots={hotspots}
              layers={layers}
            />
          )}
        </div>
      </div>

      {/* PM Task Assignment Modal */}
      {showPMModal && selectedHotspot && (
        <PMTaskAssignModal
          isOpen={showPMModal}
          onClose={() => setShowPMModal(false)}
          hotspot={selectedHotspot}
          onAssign={handlePMTaskAssign}
        />
      )}
    </div>
  );
}

// Hotspot Detail Panel Component
function HotspotDetailPanel({ 
  hotspot, 
  onClose, 
  onAssignPM 
}: { 
  hotspot: Hotspot; 
  onClose: () => void;
  onAssignPM: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Hotspot Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <p className="text-sm text-gray-900">{hotspot.label}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <p className="text-sm text-gray-900 capitalize">{hotspot.node_type}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <p className="text-sm text-gray-900">
            X: {hotspot.x.toFixed(2)}, Y: {hotspot.y.toFixed(2)}, Z: {hotspot.z.toFixed(2)}
          </p>
        </div>

        {hotspot.node_data && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
            <div className="text-sm text-gray-900">
              <p><strong>Name:</strong> {hotspot.node_data.name}</p>
              {hotspot.node_data.code && (
                <p><strong>Code:</strong> {hotspot.node_data.code}</p>
              )}
              {hotspot.node_data.description && (
                <p><strong>Description:</strong> {hotspot.node_data.description}</p>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onAssignPM}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Assign PM Task
          </button>
        </div>
      </div>
    </div>
  );
}

// Model Info Panel Component
function ModelInfoPanel({ 
  modelData, 
  hotspots, 
  layers 
}: { 
  modelData: ModelData;
  hotspots: Hotspot[];
  layers: ModelLayer[];
}) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Model Information</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <p className="text-sm text-gray-900 uppercase">{modelData.model_type}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            modelData.status === 'processed' 
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {modelData.status}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hotspots</label>
          <p className="text-sm text-gray-900">{hotspots.length} interactive points</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Layers</label>
          <p className="text-sm text-gray-900">{layers.length} visualization layers</p>
        </div>

        {modelData.thumbnail_path && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
            <img
              src={modelData.thumbnail_path}
              alt="Model thumbnail"
              className="w-full h-32 object-cover rounded-md border border-gray-200"
            />
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            View Machine Details
          </button>
          <button className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            Export Model Data
          </button>
          <button className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}

// PM Task Assignment Modal Component
function PMTaskAssignModal({ 
  isOpen, 
  onClose, 
  hotspot, 
  onAssign 
}: {
  isOpen: boolean;
  onClose: () => void;
  hotspot: Hotspot;
  onAssign: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    pm_template_id: '',
    frequency_type: 'days',
    frequency_value: 30,
    priority: 'medium',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign PM Task">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target: {hotspot.label}
          </label>
          <p className="text-sm text-gray-600">Type: {hotspot.node_type}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PM Template</label>
          <select
            value={formData.pm_template_id}
            onChange={(e) => setFormData(prev => ({ ...prev, pm_template_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select template...</option>
            <option value="1">Daily Inspection</option>
            <option value="2">Weekly Maintenance</option>
            <option value="3">Monthly Service</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={formData.frequency_type}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
            <input
              type="number"
              value={formData.frequency_value}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency_value: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Additional notes..."
          />
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
            Assign Task
          </button>
        </div>
      </form>
    </Modal>
  );
}