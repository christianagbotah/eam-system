'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, CheckCircle, XCircle, Users, AlertTriangle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MaintenanceAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({});
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const [summary, byStatus, byDepartment, aging] = await Promise.all([
        api.get('/maintenance-requests/reports/summary'),
        api.get('/maintenance-requests/reports/by-status'),
        api.get('/maintenance-requests/reports/by-department'),
        api.get('/maintenance-requests/reports/aging')
      ]);

      setAnalytics({
        summary: summary.data?.data || {},
        byStatus: byStatus.data?.data || [],
        byDepartment: byDepartment.data?.data || [],
        aging: aging.data?.data || []
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const kpiCards = [
    {
      title: 'Total Requests',
      value: analytics.summary?.total || 0,
      change: '+12%',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Avg Response Time',
      value: analytics.summary?.avg_response_time || '0h',
      change: '-8%',
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Approval Rate',
      value: `${analytics.summary?.approval_rate || 0}%`,
      change: '+5%',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Conversion Rate',
      value: `${analytics.summary?.conversion_rate || 0}%`,
      change: '+3%',
      icon: Users,
      color: 'indigo'
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Maintenance Analytics</h1>
            <p className="text-blue-100">Real-time insights and performance metrics</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg px-4 py-2"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-lg font-semibold text-gray-900 mt-2">{kpi.value}</p>
                  <p className={`text-sm mt-1 ${kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.change} from last period
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${kpi.color}-100`}>
                  <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Request Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.byStatus?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Requests by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Analysis */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Request Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.aging}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age_range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Workflow Efficiency */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Workflow Efficiency Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-semibold text-blue-900">Average Approval Time</p>
                <p className="text-sm text-blue-700">Time from submission to approval</p>
              </div>
              <div className="text-base font-semibold text-blue-600">
                {analytics.summary?.avg_approval_time || '0h'}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-semibold text-green-900">Work Order Conversion</p>
                <p className="text-sm text-green-700">Approved requests converted to WO</p>
              </div>
              <div className="text-base font-semibold text-green-600">
                {analytics.summary?.conversion_rate || 0}%
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="font-semibold text-purple-900">Planner Efficiency</p>
                <p className="text-sm text-purple-700">Avg time to create work order</p>
              </div>
              <div className="text-base font-semibold text-purple-600">
                {analytics.summary?.avg_conversion_time || '0h'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Workflow Activity</h3>
        <div className="space-y-3">
          {analytics.recent_activity?.map((activity: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activity.action_type === 'approved' ? 'bg-green-100' :
                activity.action_type === 'rejected' ? 'bg-red-100' :
                activity.action_type === 'converted' ? 'bg-purple-100' :
                'bg-blue-100'
              }`}>
                {activity.action_type === 'approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {activity.action_type === 'rejected' && <XCircle className="w-4 h-4 text-red-600" />}
                {activity.action_type === 'converted' && <Users className="w-4 h-4 text-purple-600" />}
                {!['approved', 'rejected', 'converted'].includes(activity.action_type) && <AlertTriangle className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Request #{activity.request_number} {activity.action_type}
                </p>
                <p className="text-sm text-gray-600">
                  by {activity.action_by_name} • {formatDateTime(activity.created_at)}
                </p>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              No recent activity to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}