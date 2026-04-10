'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingDown, DollarSign, AlertTriangle, BarChart3, RefreshCw, Play } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function PartsOptimizationContent() {
  const [parts, setParts] = useState([]);
  const [abcData, setAbcData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partsRes, abcRes] = await Promise.all([
        api.get('/parts-optimization'),
        api.get('/parts-optimization/abc-analysis')
      ]);
      if (partsRes.data?.status === 'success') setParts(partsRes.data.data || []);
      if (abcRes.data?.status === 'success') setAbcData(abcRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const res = await api.post('/parts-optimization/run-analysis');
      if (res.data?.status === 'success') {
        showToast.success(`Analysis complete: ${res.data.processed || 0} parts processed`);
        fetchData();
      }
    } catch (error) {
      showToast.error('Analysis failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-7xl mx-auto"><TableSkeleton rows={10} /></div></div>;

  const stats = {
    total: parts.length,
    aClass: parts.filter((p: any) => p.abc_class === 'A').length,
    reorder: parts.filter((p: any) => p.current_stock < p.rop).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Parts Optimization</h1>
            <p className="text-gray-600">ABC/XYZ analysis & EOQ</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={runAnalysis} disabled={running} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" />{running ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Parts</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-sm text-gray-600">Optimized</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">A Class Parts</span>
              <BarChart3 className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-lg font-semibold text-red-600">{stats.aClass}</div>
            <div className="text-sm text-red-600">80% of value</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Reorder Needed</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-lg font-semibold text-orange-600">{stats.reorder}</div>
            <div className="text-sm text-orange-600">Below ROP</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Value</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold">${(parts.reduce((a: number, b: any) => a + parseFloat(b.annual_cost || 0), 0) / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-600">Annual cost</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">ABC Classification</h2>
            {abcData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">No data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={abcData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(entry) => `${entry.name}: ${entry.percentage}%`}>
                  {abcData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#10b981'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            )}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded"></div><span>A: High value (80% of cost, 20% of items)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded"></div><span>B: Medium value (15% of cost, 30% of items)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded"></div><span>C: Low value (5% of cost, 50% of items)</span></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Reorder Status</h2>
            <div className="space-y-4">
              {['A', 'B', 'C'].map(cls => {
                const classParts = parts.filter((p: any) => p.abc_class === cls);
                const reorderParts = classParts.filter((p: any) => p.current_stock < p.rop);
                return (
                  <div key={cls}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Class {cls}</span>
                      <span className="text-sm text-gray-600">{reorderParts.length} / {classParts.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${cls === 'A' ? 'bg-red-600' : cls === 'B' ? 'bg-yellow-600' : 'bg-green-600'}`} style={{ width: `${classParts.length ? (reorderParts.length / classParts.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Parts Optimization Details</h2>
          </div>
          <div className="overflow-x-auto">
            {parts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No parts data available. Run analysis to generate.</div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Part Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ABC</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">XYZ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Annual Usage</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">EOQ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ROP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parts.map((part: any) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{part.part_number}</td>
                    <td className="px-4 py-3">{part.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${part.abc_class === 'A' ? 'bg-red-100 text-red-800' : part.abc_class === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{part.abc_class}</span>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{part.xyz_class}</span></td>
                    <td className="px-4 py-3">{part.annual_usage}</td>
                    <td className="px-4 py-3 font-medium">{part.eoq}</td>
                    <td className="px-4 py-3 font-medium">{part.rop}</td>
                    <td className="px-4 py-3"><span className={part.current_stock < part.rop ? 'text-red-600 font-medium' : ''}>{part.current_stock}</span></td>
                    <td className="px-4 py-3">
                      {part.current_stock < part.rop ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm"><AlertTriangle className="w-4 h-4" />Reorder</span>
                      ) : (
                        <span className="text-green-600 text-sm">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartsOptimizationPage() {
  return (
    <RBACGuard module="parts_optimization" action="view">
      <PartsOptimizationContent />
    </RBACGuard>
  );
}
