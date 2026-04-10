'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';

export default function ConditionMonitoringPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [sensorData, setSensorData] = useState<any[]>([]);
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

  const fetchSensorData = async (assetId: number) => {
    try {
      const res = await api.get(`/condition-monitoring/${assetId}`);
      if (res.data?.status === 'success') {
        setSensorData(res.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load sensor data');
    }
  };

  const handleAssetSelect = (asset: any) => {
    setSelectedAsset(asset);
    fetchSensorData(asset.id);
  };

  if (loading) return <div className="p-6"><CardSkeleton count={6} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Condition Monitoring</h1>
        <p className="text-gray-600 mt-1">Real-time asset condition monitoring and predictive analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Healthy</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {assets.filter(a => a.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Warning</span>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Critical</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Monitored</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600">{assets.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Assets</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    asset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sensor Data</h2>
          {selectedAsset ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">{selectedAsset.asset_name}</h3>
                <p className="text-sm text-gray-600">{selectedAsset.asset_code}</p>
              </div>
              
              {sensorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sensorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No sensor data available for this asset</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Select an asset to view condition monitoring data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
