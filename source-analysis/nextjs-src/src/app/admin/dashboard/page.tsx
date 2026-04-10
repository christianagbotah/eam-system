'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { setCurrencySymbol, formatCurrency } from '@/lib/currency';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalAssets: 0,
    activeWorkOrders: 0,
    overdueWorkOrders: 0,
    completedToday: 0,
    avgMTBF: 0,
    avgMTTR: 0,
    oee: 0,
    uptime: 0
  });
  const [digitalTwin, setDigitalTwin] = useState({
    healthScore: 0,
    criticalAssets: 0,
    predictedFailures: 0,
    utilizationRate: 0
  });
  const [assetStatus, setAssetStatus] = useState({ active: 0, maintenance: 0, inactive: 0, down: 0, total: 0 });
  const [departments, setDepartments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
    fetchKPIs();
  }, []);

  const handleExport = () => {
    showToast.success('Dashboard data exported successfully');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  const fetchSettings = async () => {
    // Settings removed - using defaults
  };

  const fetchKPIs = async () => {
    try {
      const [kpisRes, criticalRes, statusRes, deptRes, activityRes, requestsRes] = await Promise.allSettled([
        api.get('/analytics/kpis'),
        api.get('/assets-unified?criticality=critical'),
        api.get('/assets-unified?per_page=1000'),
        api.get('/analytics/department-metrics'),
        api.get('/dashboard/admin'),
        api.get('/maintenance-requests')
      ]);
      
      if (kpisRes.status === 'fulfilled' && kpisRes.value.data) {
        const kpiData = kpisRes.value.data.data || kpisRes.value.data;
        setKpis(kpiData);
      }
      
      const criticalAssets = criticalRes.status === 'fulfilled' 
        ? (criticalRes.value.data.pagination?.total || criticalRes.value.data.total || criticalRes.value.data.data?.length || 0)
        : 0;
      
      const allAssets = statusRes.status === 'fulfilled' ? (statusRes.value.data.data || []) : [];
      console.log('Asset statuses:', allAssets.map((a: any) => ({ id: a.id, name: a.asset_name, status: a.status })));
      
      const active = allAssets.filter((a: any) => a.status === 'active' || a.status === 'operational').length;
      const maintenance = allAssets.filter((a: any) => a.status === 'maintenance' || a.status === 'under_maintenance').length;
      const inactive = allAssets.filter((a: any) => a.status === 'inactive' || a.status === 'idle' || a.status === 'standby').length;
      const down = allAssets.filter((a: any) => a.status === 'out_of_service' || a.status === 'down' || a.status === 'failed').length;
      
      setAssetStatus({ active, maintenance, inactive, down, total: allAssets.length });
      
      const digitalTwinRes = await api.get('/digital-twin/metrics').catch(() => ({ data: { data: null } }));
      if (digitalTwinRes.data?.data) {
        setDigitalTwin(digitalTwinRes.data.data);
      }
      
      if (deptRes.status === 'fulfilled' && deptRes.value.data.data) {
        setDepartments(deptRes.value.data.data);
      }
      
      if (activityRes.status === 'fulfilled' && activityRes.value.data.data?.recentActivity) {
        setRecentActivity(activityRes.value.data.data.recentActivity);
      }
      
      // Get pending maintenance requests
      if (requestsRes.status === 'fulfilled' && requestsRes.value.data?.data) {
        const pending = requestsRes.value.data.data.filter((r: any) => r.status === 'pending').slice(0, 5);
        setPendingApprovals(pending);
      }
    } catch (error) {
      console.error('Dashboard API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">Last updated: {mounted ? new Date().toLocaleString() : ''}</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/assets" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-sm text-gray-600">Total Assets</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.totalAssets}</p>
          <p className="text-sm text-green-600 mt-2">↑ {kpis.assetGrowth || 0}%</p>
        </Link>

        <Link href="/admin/maintenance-orders" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-sm text-gray-600">Maintenance Orders</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.activeWorkOrders}</p>
          <p className="text-sm text-green-600 mt-2">↓ {kpis.workOrderReduction || 0}%</p>
        </Link>

        <Link href="/admin/work-orders?status=overdue" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm text-gray-600">Overdue Work Orders</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.overdueWorkOrders}</p>
        </Link>

        <Link href="/admin/work-orders?status=completed&date=today" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm text-gray-600">Completed Today</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.completedToday}</p>
          <p className="text-sm text-green-600 mt-2">↑ {kpis.completionImprovement || 0}%</p>
        </Link>
      </div>

      {/* Digital Twin Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg shadow-lg border border-purple-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Digital Twin Analytics</h3>
            <p className="text-sm text-xs text-gray-600 mt-0.5">AI-powered real-time asset monitoring</p>
          </div>
          <Link href="/admin/digital-twin" className="px-2 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            View Full Dashboard →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Link href="/admin/digital-twin" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Health Score</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">AI</span>
            </div>
            <p className="text-lg font-semibold text-green-600">{digitalTwin.healthScore || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">Overall system health</p>
          </Link>

          <Link href="/admin/assets?criticality=critical" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Critical Assets</span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Live</span>
            </div>
            <p className="text-lg font-semibold text-red-600">{digitalTwin.criticalAssets || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
          </Link>

          <Link href="/admin/digital-twin" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Predicted Failures</span>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">30d</span>
            </div>
            <p className="text-lg font-semibold text-orange-600">{digitalTwin.predictedFailures || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
          </Link>

          <Link href="/admin/digital-twin" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Utilization</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Avg</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">{digitalTwin.utilizationRate || 0}%</p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
              <div className="bg-blue-600 h-1 rounded-full" style={{width: `${digitalTwin.utilizationRate || 0}%`}}></div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/analytics?metric=mtbf" className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">MTBF (Hours)</h3>
            <span className="text-blue-500 text-xs bg-blue-50 px-2 py-1 rounded">Avg</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.avgMTBF}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">↑ {kpis.mtbfImprovement || 0}%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </Link>

        <Link href="/admin/analytics?metric=mttr" className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">MTTR (Hours)</h3>
            <span className="text-orange-500 text-xs bg-orange-50 px-2 py-1 rounded">Avg</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.avgMTTR}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">↓ {kpis.mttrImprovement || 0}%</span>
            <span className="text-gray-500 ml-2">improvement</span>
          </div>
        </Link>

        <Link href="/admin/analytics?metric=oee" className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">OEE Score</h3>
            <span className="text-green-500 text-xs bg-green-50 px-2 py-1 rounded">Target: 85%</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.oee}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width: `${kpis.oee}%`}}></div>
          </div>
        </Link>

        <Link href="/admin/system-health" className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">System Uptime</h3>
            <span className="text-teal-500 text-xs bg-teal-50 px-2 py-1 rounded">Live</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.uptime}%</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">● Online</span>
            <span className="text-gray-500 ml-2">All systems operational</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Pending Approvals</h3>
            <Link href="/admin/maintenance-requests" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending approvals</p>
            ) : (
              pendingApprovals.map((request) => (
                <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{request.request_number}</div>
                        {request.machine_down_status === 'Yes' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">🔴 CRITICAL</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{request.title}</div>
                      <div className="text-xs text-gray-500 mt-1">By: {request.requested_by_name || 'Unknown'}</div>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      PENDING
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Status Distribution</h3>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" 
                        strokeDasharray="188.4" strokeDashoffset="37.68"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" 
                        strokeDasharray="188.4" strokeDashoffset="-37.68"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" 
                        strokeDasharray="188.4" strokeDashoffset="-113.04"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-base font-semibold">{assetStatus.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Active</span>
              </div>
              <p className="text-xl font-bold mt-1">{assetStatus.active}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Maintenance</span>
              </div>
              <p className="text-xl font-bold mt-1">{assetStatus.maintenance}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Inactive</span>
              </div>
              <p className="text-xl font-bold mt-1">{assetStatus.inactive}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Down</span>
              </div>
              <p className="text-xl font-bold mt-1">{assetStatus.down}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((activity: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' :
                  activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      </>
      )}
    </div>
  );
}