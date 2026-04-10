'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MaintenanceReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/maintenance-orders/dashboard/stats');
      const data = res.data;
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Maintenance Analytics</h1>
          <p className="text-gray-600 mt-2">Performance metrics and insights</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Orders</div>
            <div className="text-4xl font-bold mt-2">{stats?.total || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">In Progress</div>
            <div className="text-4xl font-bold mt-2">{stats?.in_progress || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Avg Completion (hrs)</div>
            <div className="text-4xl font-bold mt-2">{parseFloat(stats?.avg_completion_time || 0).toFixed(1)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Cost (Month)</div>
            <div className="text-4xl font-bold mt-2">${(stats?.total_cost_month || 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Orders by Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-bold mb-4">Orders by Type</h3>
            {stats?.by_type && stats.by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.by_type}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="order_type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-20">No data available</p>
            )}
          </div>

          {/* Orders by Priority */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-bold mb-4">Active Orders by Priority</h3>
            {stats?.by_priority && stats.by_priority.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.by_priority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={100} label>
                    {stats.by_priority.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-20">No data available</p>
            )}
          </div>
        </div>

        {/* Summary Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-base font-semibold text-yellow-600">{stats?.pending || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-base font-semibold text-red-600">{stats?.overdue || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Completed Today</div>
              <div className="text-base font-semibold text-green-600">{stats?.completed_today || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Completion Rate</div>
              <div className="text-base font-semibold text-blue-600">
                {stats?.total > 0 ? ((stats.completed_today / stats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
