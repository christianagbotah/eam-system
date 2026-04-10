'use client';

import { useState, useEffect } from 'react';
import { Box, Cpu, Activity, Zap, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';

export default function DigitalTwinPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [twinData, setTwinData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets-unified');
      if (res.data?.status === 'success') {
        setAssets(res.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTwinData = async (assetId: number) => {
    try {
      const res = await api.get(`/digital-twin/${assetId}`);
      if (res.data?.status === 'success') {
        setTwinData(res.data.data);
      }
    } catch (error) {
      showToast.error('Failed to load digital twin data');
    }
  };

  const handleAssetSelect = (asset: any) => {
    setSelectedAsset(asset);
    fetchTwinData(asset.id);
  };

  if (loading) return <div className="p-6"><CardSkeleton count={6} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Digital Twin</h1>
        <p className="text-gray-600 mt-1">Virtual representation and simulation of physical assets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Assets</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleAssetSelect(asset)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedAsset?.id === asset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{asset.asset_name}</div>
                <div className="text-sm text-gray-600">{asset.asset_code}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedAsset ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Asset Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Name</div>
                    <div className="font-medium">{selectedAsset.asset_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Code</div>
                    <div className="font-medium">{selectedAsset.asset_code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Type</div>
                    <div className="font-medium">{selectedAsset.asset_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedAsset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedAsset.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Real-time Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-600">Performance</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {twinData?.performance || 95}%
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-600">Efficiency</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {twinData?.efficiency || 88}%
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm text-gray-600">Energy</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {twinData?.energy || 1250} kW
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-600">Alerts</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {twinData?.alerts || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">3D Visualization</h2>
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Box className="w-16 h-16 mx-auto mb-4" />
                    <p>3D model visualization coming soon</p>
                    <p className="text-sm mt-2">Integrate with Three.js or Babylon.js</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12 text-gray-500">
                <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Select an asset to view its digital twin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
