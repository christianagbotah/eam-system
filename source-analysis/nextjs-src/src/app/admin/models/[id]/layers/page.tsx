'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers, Plus, Eye, EyeOff, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import api from '@/lib/api';

interface Layer {
  id: string;
  model_id: string;
  layer_name: string;
  layer_order: number;
  visible_default: boolean;
  color: string | null;
  opacity: number;
  metadata_json: any;
}

export default function ModelLayersPage() {
  const params = useParams();
  const router = useRouter();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    layer_name: '',
    layer_order: 1,
    visible_default: true,
    color: '#3B82F6',
    opacity: 1.0
  });

  useEffect(() => {
    fetchLayers();
  }, [params.id]);

  const fetchLayers = async () => {
    try {
      const response = await api.get(`/model-layers?model_id=${params.id}`);
      const data = response.data;
      setLayers(data.data || []);
    } catch (error) {
      toast.error('Failed to load layers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `/api/v1/eam/model-layers/${editingId}`
        : '/api/v1/eam/model-layers';
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, model_id: params.id })
      });

      if (response.ok) {
        toast.success(editingId ? 'Layer updated' : 'Layer created');
        setFormData({ layer_name: '', layer_order: layers.length + 1, visible_default: true, color: '#3B82F6', opacity: 1.0 });
        setEditingId(null);
        fetchLayers();
      }
    } catch (error) {
      toast.error('Failed to save layer');
    }
  };

  const handleEdit = (layer: Layer) => {
    setEditingId(layer.id);
    setFormData({
      layer_name: layer.layer_name,
      layer_order: layer.layer_order,
      visible_default: layer.visible_default,
      color: layer.color || '#3B82F6',
      opacity: layer.opacity
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this layer?')) return;
    try {
      const response = await api.delete(`/model-layers/${id}`);
      if (response.ok) {
        toast.success('Layer deleted');
        fetchLayers();
      }
    } catch (error) {
      toast.error('Failed to delete layer');
    }
  };

  const toggleVisibility = async (layer: Layer) => {
    try {
      await api.put(`/model-layers/${layer.id}`),
        body: JSON.stringify({ ...layer, visible_default: !layer.visible_default })
      });
      fetchLayers();
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Model Layers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Organize 3D model into logical layers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold">{layers.length} Layers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Layer List</h2>
          <div className="space-y-2">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: layer.color || '#3B82F6' }}>
                    {layer.layer_order}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{layer.layer_name}</div>
                    <div className="text-sm text-gray-500">Opacity: {(layer.opacity * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(layer)}
                    className={`p-2 rounded ${layer.visible_default ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-100'}`}
                    title={layer.visible_default ? 'Visible' : 'Hidden'}
                  >
                    {layer.visible_default ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(layer)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(layer.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {layers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No layers yet. Create your first layer to organize the 3D model.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Layer' : 'Add Layer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Layer Name</label>
              <input
                type="text"
                value={formData.layer_name}
                onChange={(e) => setFormData({ ...formData, layer_name: e.target.value })}
                placeholder="e.g., Hydraulic System"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Layer Order</label>
              <input
                type="number"
                value={formData.layer_order}
                onChange={(e) => setFormData({ ...formData, layer_order: parseInt(e.target.value) })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Opacity: {(formData.opacity * 100).toFixed(0)}%</label>
              <input
                type="range"
                value={formData.opacity}
                onChange={(e) => setFormData({ ...formData, opacity: parseFloat(e.target.value) })}
                min="0"
                max="1"
                step="0.1"
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.visible_default}
                onChange={(e) => setFormData({ ...formData, visible_default: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm">Visible by default</label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ layer_name: '', layer_order: layers.length + 1, visible_default: true, color: '#3B82F6', opacity: 1.0 });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Common Layers</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>• Structure - Main frame/body</div>
              <div>• Mechanical - Moving parts</div>
              <div>• Electrical - Wiring/controls</div>
              <div>• Hydraulic - Fluid systems</div>
              <div>• Pneumatic - Air systems</div>
              <div>• Safety - Guards/sensors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
