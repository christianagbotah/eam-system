'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { modelService } from '@/services/modelService';
import { useAlert } from '@/hooks/useAlert';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface ModelData {
  id: string;
  machine_id: number;
  model_type: 'glb' | 'gltf' | 'svg';
  file_path: string;
  thumbnail_path?: string;
  status: string;
  created_at: string;
  machine_name?: string;
}

export default function ModelViewerManagementPage() {
  const { showAlert } = useAlert();
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleExport = () => {
    const csv = [Object.keys(models[0] || {}).join(','), ...models.map(m => Object.values(m).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-viewer-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Models exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await modelService.getAllModels();
      setModels(data);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    
    try {
      await modelService.deleteModel(modelId);
      showToast.success('Model deleted successfully');
      loadModels();
    } catch (error) {
      showToast.error('Failed to delete model');
    }
  };

  const filteredModels = models.filter(model =>
    model.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.model_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <CardSkeleton count={8} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Model Viewer Management</h1>
          <p className="text-gray-600">Manage 3D/2D models for interactive visualization</p>
        </div>
        <Link
          href="/models/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Upload New Model
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadModels}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </Card>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModels.map((model) => (
          <Card key={model.id}>
            <div className="p-6">
              {/* Thumbnail */}
              <div className="mb-4 h-48 bg-gray-100 rounded-lg overflow-hidden">
                {model.thumbnail_path ? (
                  <img
                    src={model.thumbnail_path}
                    alt={`${model.machine_name} model`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Model Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{model.machine_name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                    model.model_type === 'glb' || model.model_type === 'gltf' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {model.model_type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    model.status === 'processed' 
                      ? 'bg-green-100 text-green-800'
                      : model.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {model.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Created: {formatDate(model.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/models/${model.id}`}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                >
                  View Model
                </Link>
                <Link
                  href={`/models/${model.id}/map`}
                  className="px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                >
                  Map
                </Link>
                <Link
                  href={`/models/${model.id}/hotspots`}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteModel(model.id)}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No models found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by uploading your first 3D/2D model.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/models/upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Upload Model
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Card>
          <div className="p-4 text-center">
            <div className="text-base font-semibold text-blue-600">{models.length}</div>
            <div className="text-sm text-gray-600">Total Models</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-base font-semibold text-green-600">
              {models.filter(m => m.model_type === 'glb' || m.model_type === 'gltf').length}
            </div>
            <div className="text-sm text-gray-600">3D Models</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-base font-semibold text-blue-600">
              {models.filter(m => m.model_type === 'svg').length}
            </div>
            <div className="text-sm text-gray-600">2D Diagrams</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-base font-semibold text-green-600">
              {models.filter(m => m.status === 'processed').length}
            </div>
            <div className="text-sm text-gray-600">Ready to View</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
