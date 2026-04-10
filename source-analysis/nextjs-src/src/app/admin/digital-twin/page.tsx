'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function DigitalTwinDashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    healthScore: 85,
    predictedFailure: null,
    maintenanceBacklog: 3,
    utilizationRate: 82
  });

  const handleExport = () => {
    const csv = [Object.keys(assets[0] || {}).join(','), ...assets.map((a: any) => Object.values(a).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-twin-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Digital twin data exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/assets-unified?status=active&limit=10');
      setAssets(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CardSkeleton count={8} />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Digital Twin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-semibold mb-2">Asset Health Score</h3>
          <p className="text-4xl font-bold text-green-600">{metrics.healthScore}%</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <h3 className="text-sm font-semibold mb-2">Predicted Failure</h3>
          <p className="text-base font-semibold">{metrics.predictedFailure || 'None'}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-sm font-semibold mb-2">Maintenance Backlog</h3>
          <p className="text-4xl font-bold">{metrics.maintenanceBacklog}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500">
          <h3 className="text-sm font-semibold mb-2">Utilization Rate</h3>
          <p className="text-4xl font-bold">{metrics.utilizationRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Active Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {assets.map((asset: any) => (
            <div key={asset.id} className="p-4 rounded-lg border-2 border-gray-200">
              <h3 className="font-semibold">{asset.asset_name}</h3>
              <p className="text-sm text-gray-600">{asset.asset_code}</p>
              <span className={`mt-2 inline-block px-2 py-1 rounded text-xs ${
                asset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {asset.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
