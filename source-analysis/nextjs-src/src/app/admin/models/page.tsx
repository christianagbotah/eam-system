'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Box, Eye } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Model {
  id: string;
  name: string;
  file_path: string;
  thumbnail: string | null;
  created_at: string;
}

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    const csv = [Object.keys(models[0] || {}).join(','), ...models.map(m => Object.values(m).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `models-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Models exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await api.get('/models');
      const data = response.data;
      setModels(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CardSkeleton count={8} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3D Models</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Manage model layers and organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Box className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold">{models.length} Models</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {models.map((model) => (
          <div key={model.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {model.thumbnail ? (
                <img src={model.thumbnail} alt={model.name} className="w-full h-full object-cover" />
              ) : (
                <Box className="h-16 w-16 text-white opacity-50" />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate">{model.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {formatDate(model.created_at)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/models/${model.id}/layers`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Layers className="h-4 w-4" />
                  Layers
                </button>
                <button
                  onClick={() => router.push(`/admin/model-viewer?model=${model.id}`)}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Box className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No 3D models found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Upload your first 3D model to get started</p>
          <button
            onClick={() => router.push('/models/upload')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Model
          </button>
        </div>
      )}
    </div>
  );
}
