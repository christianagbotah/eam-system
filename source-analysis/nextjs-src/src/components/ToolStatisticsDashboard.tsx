'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, Wrench, AlertTriangle, TrendingUp, Activity, ArrowRightLeft } from 'lucide-react';

interface ToolStats {
  total_tools: number;
  available_tools: number;
  tools_in_use: number;
  tools_under_maintenance: number;
  active_requests: number;
  pending_transfers: number;
  utilization_rate: number;
}

export default function ToolStatisticsDashboard() {
  const [stats, setStats] = useState<ToolStats | null>(null);
  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [mostRequested, setMostRequested] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, utilizationRes, requestedRes, trendsRes] = await Promise.all([
        api.get('/tool-statistics/overview'),
        api.get('/tool-statistics/utilization-by-category'),
        api.get('/tool-statistics/most-requested'),
        api.get('/tool-statistics/request-trends')
      ]);

      setStats(overviewRes.data.data);
      setUtilizationData(utilizationRes.data.data || []);
      setMostRequested(requestedRes.data.data || []);
      setTrends(trendsRes.data.data || []);
    } catch (error) {
      console.error('Error loading tool statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Tool Statistics Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of tool utilization and performance metrics</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_tools || 0}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Use</p>
              <p className="text-2xl font-bold text-green-600">{stats?.tools_in_use || 0}</p>
              <p className="text-xs text-gray-500">{stats?.utilization_rate || 0}% utilization</p>
            </div>
            <Wrench className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Under Maintenance</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.tools_under_maintenance || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Requests</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.active_requests || 0}</p>
              <p className="text-xs text-gray-500">{stats?.pending_transfers || 0} transfers pending</p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization_rate" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Requested Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Requested Tools (30 days)</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {mostRequested.map((tool, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{tool.tool_name}</div>
                  <div className="text-sm text-gray-500">{tool.tool_code} • {tool.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{tool.request_count}</div>
                  <div className="text-xs text-gray-500">requests</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Trends (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="request_count" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}