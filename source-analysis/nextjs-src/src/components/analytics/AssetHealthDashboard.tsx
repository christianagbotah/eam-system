'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HealthSummary {
  asset_id: number;
  asset_name: string;
  asset_type: string;
  status: string;
  health_score: number;
  open_work_orders: number;
  overdue_work_orders: number;
  mtbf_hours: number;
  mttr_hours: number;
}

export default function AssetHealthDashboard() {
  const [data, setData] = useState<HealthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = () => {
    fetch('/api/v1/eam/asset-health-summary')
      .then(res => res.json())
      .then(result => {
        setData(result.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching health data:', err);
        setLoading(false);
      });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const criticalAssets = data.filter(a => a.health_score < 60);
  const avgHealth = data.reduce((sum, a) => sum + a.health_score, 0) / data.length || 0;

  if (loading) return <div className="animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Assets</div>
          <div className="text-3xl font-bold">{data.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Health Score</div>
          <div className="text-3xl font-bold">{avgHealth.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Critical Assets</div>
          <div className="text-3xl font-bold text-red-600">{criticalAssets.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Open Work Orders</div>
          <div className="text-3xl font-bold">{data.reduce((sum, a) => sum + a.open_work_orders, 0)}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Asset Health Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="asset_name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="health_score">
              {data.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getHealthColor(entry.health_score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Critical Assets Requiring Attention</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open WOs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MTBF</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {criticalAssets.map(asset => (
                <tr key={asset.asset_id}>
                  <td className="px-6 py-4 whitespace-nowrap">{asset.asset_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                      {asset.health_score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{asset.open_work_orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">{asset.overdue_work_orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{asset.mtbf_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
