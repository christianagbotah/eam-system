'use client';

import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Target, CheckCircle, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function RCMContent() {
  const [assets, setAssets] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ asset_id: 1, safety_score: 5, production_score: 5, quality_score: 5, environmental_score: 5, cost_score: 5 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, strategiesRes] = await Promise.all([
        api.get('/rcm'),
        api.get('/rcm/strategies')
      ]);
      if (assetsRes.data?.status === 'success') setAssets(assetsRes.data.data || []);
      if (strategiesRes.data?.status === 'success') setStrategies(strategiesRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/rcm', formData);
      if (res.data?.status === 'success') {
        showToast.success('Assessment created successfully');
        setShowModal(false);
        setFormData({ asset_id: 1, safety_score: 5, production_score: 5, quality_score: 5, environmental_score: 5, cost_score: 5 });
        fetchData();
      }
    } catch (error) {
      showToast.error('Failed to create assessment');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-7xl mx-auto"><TableSkeleton rows={10} /></div></div>;

  const criticalityData = [
    { level: 'Critical', count: assets.filter((a: any) => a.criticality_level === 'critical').length, color: '#ef4444' },
    { level: 'High', count: assets.filter((a: any) => a.criticality_level === 'high').length, color: '#f59e0b' },
    { level: 'Medium', count: assets.filter((a: any) => a.criticality_level === 'medium').length, color: '#3b82f6' },
    { level: 'Low', count: assets.filter((a: any) => a.criticality_level === 'low').length, color: '#10b981' }
  ];

  const getCriticalityColor = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Reliability Centered Maintenance</h1>
            <p className="text-gray-600">Asset criticality & strategy optimization</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setShowModal(true)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" />New Analysis</button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Assets Assessed</span>
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold">{assets.length}</div>
            <div className="text-sm text-gray-600">Criticality rated</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Critical Assets</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-lg font-semibold text-red-600">{criticalityData[0].count}</div>
            <div className="text-sm text-red-600">Requires predictive</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Strategies</span>
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold">{strategies.length}</div>
            <div className="text-sm text-gray-600">Implemented</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Avg Score</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-semibold">{assets.length ? Math.round(assets.reduce((a: number, b: any) => a + b.total_score, 0) / assets.length) : 0}</div>
            <div className="text-sm text-gray-600">Out of 50</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Criticality Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={criticalityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {criticalityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Strategy Distribution</h2>
            <div className="space-y-4">
              {strategies.map((s: any, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{s.strategy}</span>
                    <span className="text-sm text-gray-600">{s.count} assets</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-600">Cost</div>
                      <div className="font-medium">${s.cost}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Benefit</div>
                      <div className="font-medium text-green-600">${s.benefit}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-purple-600">ROI: {s.cost > 0 ? (s.benefit / s.cost).toFixed(1) : 0}:1</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Asset Criticality Assessment</h2>
          </div>
          <div className="overflow-x-auto">
            {assets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No assessments found</div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Safety</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Production</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Quality</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Environment</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cost</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{asset.asset_name || `Asset #${asset.asset_id}`}</td>
                    <td className="px-4 py-3">{asset.safety_score}/10</td>
                    <td className="px-4 py-3">{asset.production_score}/10</td>
                    <td className="px-4 py-3">{asset.quality_score}/10</td>
                    <td className="px-4 py-3">{asset.environmental_score}/10</td>
                    <td className="px-4 py-3">{asset.cost_score}/10</td>
                    <td className="px-4 py-3 font-bold">{asset.total_score}/50</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${getCriticalityColor(asset.criticality_level)}`}>{asset.criticality_level.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">{asset.maintenance_strategy}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">RCM Decision Logic</div>
              <div className="text-sm text-blue-700 mt-1">Critical (35-50): Predictive • High (25-34): Preventive • Medium (15-24): Preventive • Low (0-14): Corrective</div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New RCM Assessment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Asset ID</label>
                <input type="number" required value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              {['safety_score', 'production_score', 'quality_score', 'environmental_score', 'cost_score'].map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1 capitalize">{field.replace('_', ' ')} (1-10)</label>
                  <input type="number" min="1" max="10" required value={formData[field as keyof typeof formData]} onChange={(e) => setFormData({...formData, [field]: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              ))}
              <div className="text-sm text-gray-600">Total Score: {Object.values(formData).slice(1).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0)}/50</div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RCMPage() {
  return (
    <RBACGuard module="rcm" action="view">
      <RCMContent />
    </RBACGuard>
  );
}
