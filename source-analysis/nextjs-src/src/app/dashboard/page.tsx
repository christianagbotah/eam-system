'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionSection from '@/components/guards/PermissionSection';

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/dashboard/unified', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          Role: <span className="font-medium capitalize">{user?.role}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Work Orders Widget */}
        <PermissionSection permissions={['work_orders.view', 'work_orders.view_own', 'work_orders.view_all']}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Work Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.workOrders?.total || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-yellow-600">Pending: {stats?.workOrders?.pending || 0}</span>
              <span className="text-blue-600">In Progress: {stats?.workOrders?.inProgress || 0}</span>
            </div>
          </div>
        </PermissionSection>

        {/* Assets Widget */}
        <PermissionSection permissions={['assets.view']}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assets</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.assets?.total || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">Active: {stats?.assets?.active || 0}</span>
              <span className="text-orange-600">Maintenance: {stats?.assets?.maintenance || 0}</span>
            </div>
          </div>
        </PermissionSection>

        {/* Inventory Widget */}
        <PermissionSection permissions={['inventory.view', 'inventory.view_all']}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.inventory?.total || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-red-600">Low Stock: {stats?.inventory?.lowStock || 0}</span>
              <span className="text-gray-600">Out: {stats?.inventory?.outOfStock || 0}</span>
            </div>
          </div>
        </PermissionSection>

        {/* Production Widget */}
        <PermissionSection permissions={['production.view', 'oee.view']}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">OEE</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.production?.oee || 0}%</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">Efficiency: {stats?.production?.efficiency || 0}%</span>
            </div>
          </div>
        </PermissionSection>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <PermissionSection permissions={['work_orders.create']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-700">New Work Order</span>
            </button>
          </PermissionSection>

          <PermissionSection permissions={['assets.create']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-700">Add Asset</span>
            </button>
          </PermissionSection>

          <PermissionSection permissions={['maintenance_requests.create']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-700">Request Maintenance</span>
            </button>
          </PermissionSection>

          <PermissionSection permissions={['pm_schedules.create']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-700">Schedule PM</span>
            </button>
          </PermissionSection>

          <PermissionSection permissions={['reports.view']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-700">View Reports</span>
            </button>
          </PermissionSection>

          <PermissionSection permissions={['surveys.create', 'surveys.submit']}>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <svg className="w-8 h-8 text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-sm text-gray-700">Production Survey</span>
            </button>
          </PermissionSection>
        </div>
      </div>

      {/* Recent Activity */}
      <PermissionSection permissions={['work_orders.view', 'work_orders.view_own', 'work_orders.view_all']}>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Work Orders</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">WO-2024-001</p>
                <p className="text-sm text-gray-600">Pump Maintenance</p>
              </div>
              <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Pending
              </span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">WO-2024-002</p>
                <p className="text-sm text-gray-600">Motor Repair</p>
              </div>
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                In Progress
              </span>
            </div>
          </div>
        </div>
      </PermissionSection>
    </div>
  );
}
