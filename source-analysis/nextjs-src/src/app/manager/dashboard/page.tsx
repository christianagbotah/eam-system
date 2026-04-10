'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import Link from 'next/link';

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data?.data || {});
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, link }: any) => (
    <Link href={link}>
      <div className={`bg-gradient-to-br ${color} p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-white text-lg font-semibold mt-2">{value}</p>
          </div>
          <div className="text-white text-4xl opacity-80">{icon}</div>
        </div>
      </div>
    </Link>
  );

  return (
    <ProtectedRoute allowedRoles={['manager', 'admin']}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
          <h1 className="text-lg font-semibold">Manager Dashboard</h1>
          <p className="text-blue-100 mt-2">Overview of operations and team performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Employees" value={stats.total_users || 0} icon="👥" color="from-blue-500 to-blue-600" link="/manager/users" />
          <StatCard title="Departments" value={stats.total_departments || 0} icon="🏢" color="from-green-500 to-green-600" link="/manager/departments" />
          <StatCard title="Active Assets" value={stats.total_assets || 0} icon="⚙️" color="from-purple-500 to-purple-600" link="/manager/assets" />
          <StatCard title="Work Orders" value={stats.total_work_orders || 0} icon="📋" color="from-orange-500 to-orange-600" link="/manager/work-orders" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link href="/manager/users" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">👤</div>
              <div className="font-medium">Manage Users</div>
            </Link>
            <Link href="/manager/departments" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-center">
              <div className="text-3xl mb-2">🏢</div>
              <div className="font-medium">Departments</div>
            </Link>
            <Link href="/manager/reports" className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-medium">Reports</div>
            </Link>
            <Link href="/manager/settings" className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="font-medium">Settings</div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-xl font-bold mb-4">Team Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Technicians</span>
                <span className="text-base font-semibold text-blue-600">{stats.technicians || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Supervisors</span>
                <span className="text-base font-semibold text-green-600">{stats.supervisors || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium">Operators</span>
                <span className="text-base font-semibold text-purple-600">{stats.operators || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-xl font-bold mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">System Health</span>
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">Operational</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Active Users</span>
                <span className="text-base font-semibold text-blue-600">{stats.active_users || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="font-medium">Pending Tasks</span>
                <span className="text-base font-semibold text-orange-600">{stats.pending_tasks || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}