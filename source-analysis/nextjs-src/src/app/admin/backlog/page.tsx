'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function BacklogContent() {
  const [filter, setFilter] = useState('all');
  const [backlog, setBacklog] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [backlogRes, agingRes] = await Promise.all([
        api.get('/work-orders/backlog'),
        api.get('/work-orders/backlog/aging')
      ]);
      if (backlogRes.data?.status === 'success') setBacklog(backlogRes.data.data || []);
      if (agingRes.data?.status === 'success') setAgingData(agingRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load backlog data');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (id: number) => {
    try {
      const res = await api.post(`/work-orders/${id}/schedule`, {});
      if (res.data?.status === 'success') {
        showToast.success('Work order scheduled');
        fetchData();
      }
    } catch (error) {
      showToast.error('Failed to schedule');
    }
  };

  const handleExport = () => {
    const csv = [Object.keys(backlog[0] || {}).join(','), ...backlog.map((b: any) => Object.values(b).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlog-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Backlog exported');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-7xl mx-auto"><TableSkeleton rows={10} /></div></div>;

  const stats = {
    total: backlog.length,
    avgAge: backlog.length ? Math.round(backlog.reduce((a: number, b: any) => a + (b.age || 0), 0) / backlog.length) : 0,
    totalHours: backlog.reduce((a: number, b: any) => a + (b.estimated_hours || 0), 0),
    totalCost: backlog.reduce((a: number, b: any) => a + (b.cost || 0), 0)
  };

  const filtered = filter === 'all' ? backlog : backlog.filter((wo: any) => wo.priority === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Work Order Backlog</h1>
            <p className="text-gray-600">Manage pending work orders</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={handleExport} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4" />Export</button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Backlog</span>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-sm text-gray-600">Pending work orders</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Avg Age</span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-lg font-semibold">{stats.avgAge} days</div>
            <div className="text-sm text-orange-600">Target: &lt;7 days</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Hours</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold">{stats.totalHours}</div>
            <div className="text-sm text-gray-600">Estimated effort</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Value</span>
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold">${(stats.totalCost / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-600">Estimated cost</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Backlog Aging</h2>
            {agingData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">No aging data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Priority Distribution</h2>
            <div className="space-y-4">
              {['high', 'medium', 'low'].map(priority => {
                const count = backlog.filter((wo: any) => wo.priority === priority).length;
                const percentage = backlog.length ? (count / backlog.length) * 100 : 0;
                return (
                  <div key={priority}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{priority} Priority</span>
                      <span className="text-sm text-gray-600">{count} WOs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${priority === 'high' ? 'bg-red-600' : priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All</button>
            <button onClick={() => setFilter('high')} className={`px-4 py-2 rounded-lg ${filter === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>High</button>
            <button onClick={() => setFilter('medium')} className={`px-4 py-2 rounded-lg ${filter === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}>Medium</button>
            <button onClick={() => setFilter('low')} className={`px-4 py-2 rounded-lg ${filter === 'low' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Low</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No work orders in backlog</div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">WO #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Age (days)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Est. Hours</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Est. Cost</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{wo.wo_number || `WO-${wo.id}`}</td>
                    <td className="px-4 py-3 font-medium">{wo.asset_name || wo.asset}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${wo.priority === 'high' ? 'bg-red-100 text-red-800' : wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{wo.priority?.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3"><span className={wo.age > 14 ? 'text-red-600 font-medium' : ''}>{wo.age}</span></td>
                    <td className="px-4 py-3">{wo.estimated_hours}</td>
                    <td className="px-4 py-3">${wo.cost?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleSchedule(wo.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Schedule</button>
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

export default function BacklogPage() {
  return (
    <RBACGuard module="backlog_management" action="view">
      <BacklogContent />
    </RBACGuard>
  );
}
