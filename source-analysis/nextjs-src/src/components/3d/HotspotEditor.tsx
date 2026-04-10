'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Target, Settings } from 'lucide-react';

interface Hotspot {
  id?: number;
  label: string;
  x: number;
  y: number;
  z: number;
  node_type: 'machine' | 'assembly' | 'part' | 'subpart';
  node_id: number;
  metadata_json?: any;
}

interface HotspotEditorProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: number;
  hotspots: Hotspot[];
  onHotspotCreate: (hotspot: Omit<Hotspot, 'id'>) => Promise<void>;
  onHotspotUpdate: (id: number, hotspot: Partial<Hotspot>) => Promise<void>;
  onHotspotDelete: (id: number) => Promise<void>;
  onAutoGenerate: () => Promise<void>;
}

export default function HotspotEditor({
  isOpen,
  onClose,
  modelId,
  hotspots,
  onHotspotCreate,
  onHotspotUpdate,
  onHotspotDelete,
  onAutoGenerate
}: HotspotEditorProps) {
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Omit<Hotspot, 'id'>>({
    label: '',
    x: 0,
    y: 0,
    z: 0,
    node_type: 'part',
    node_id: 0,
    metadata_json: {}
  });

  useEffect(() => {
    if (editingHotspot) {
      setFormData({
        label: editingHotspot.label,
        x: editingHotspot.x,
        y: editingHotspot.y,
        z: editingHotspot.z,
        node_type: editingHotspot.node_type,
        node_id: editingHotspot.node_id,
        metadata_json: editingHotspot.metadata_json || {}
      });
    } else {
      setFormData({
        label: '',
        x: 0,
        y: 0,
        z: 0,
        node_type: 'part',
        node_id: 0,
        metadata_json: {}
      });
    }
  }, [editingHotspot]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingHotspot) {
        await onHotspotUpdate(editingHotspot.id!, formData);
        setEditingHotspot(null);
      } else {
        await onHotspotCreate(formData);
        setIsCreating(false);
      }
      
      // Reset form
      setFormData({
        label: '',
        x: 0,
        y: 0,
        z: 0,
        node_type: 'part',
        node_id: 0,
        metadata_json: {}
      });
    } catch (error) {
      console.error('Failed to save hotspot:', error);
      alert('Failed to save hotspot. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this hotspot?')) {
      try {
        await onHotspotDelete(id);
      } catch (error) {
        console.error('Failed to delete hotspot:', error);
        alert('Failed to delete hotspot. Please try again.');
      }
    }
  };

  const handleAutoGenerate = async () => {
    if (confirm('This will automatically generate hotspots based on the machine hierarchy. Continue?')) {
      try {
        await onAutoGenerate();
      } catch (error) {
        console.error('Failed to auto-generate hotspots:', error);
        alert('Failed to auto-generate hotspots. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Hotspot Editor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Hotspot List */}
          <div className="w-1/2 border-r overflow-y-auto">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add Hotspot
                </button>
                <button
                  onClick={handleAutoGenerate}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Target size={16} />
                  Auto Generate
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {hotspots.map((hotspot) => (
                  <div
                    key={hotspot.id}
                    className="border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{hotspot.label}</div>
                        <div className="text-sm text-gray-600">
                          {hotspot.node_type} | Position: ({hotspot.x.toFixed(2)}, {hotspot.y.toFixed(2)}, {hotspot.z.toFixed(2)})
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingHotspot(hotspot)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(hotspot.id!)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {hotspots.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hotspots created yet. Click "Add Hotspot" or "Auto Generate" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hotspot Form */}
          <div className="w-1/2 overflow-y-auto">
            {(isCreating || editingHotspot) && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingHotspot ? 'Edit Hotspot' : 'Create Hotspot'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Node Type
                    </label>
                    <select
                      value={formData.node_type}
                      onChange={(e) => setFormData({ ...formData, node_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="machine">Machine</option>
                      <option value="assembly">Assembly</option>
                      <option value="part">Part</option>
                      <option value="subpart">Subpart</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Node ID
                    </label>
                    <input
                      type="number"
                      value={formData.node_id}
                      onChange={(e) => setFormData({ ...formData, node_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        X Position
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.x}
                        onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Y Position
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.y}
                        onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Z Position
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.z}
                        onChange={(e) => setFormData({ ...formData, z: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingHotspot(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingHotspot ? 'Update' : 'Create'} Hotspot
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!isCreating && !editingHotspot && (
              <div className="p-6 text-center text-gray-500">
                <Settings size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a hotspot to edit or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
