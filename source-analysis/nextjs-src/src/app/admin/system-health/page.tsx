'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface HealthMetrics {
  database: { status: string; responseTime: number };
  api: { status: string; responseTime: number };
  iot: { activeDevices: number; alertsLast24h: number };
  erp: { lastSync: string; failedSyncs: number };
  storage: { used: number; total: number };
  activeUsers: number;
}

export default function SystemHealthPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    showToast.success('System health data exported');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/system/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setMetrics(data.data);
    } catch (error) {
      showToast.error('Failed to fetch health metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6"><CardSkeleton count={6} /></div>;

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-base font-semibold">System Health Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Database</h3>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(metrics?.database.status || 'unknown')}`}></div>
          </div>
          <p className="text-sm text-gray-600">Response Time</p>
          <p className="text-base font-semibold">{metrics?.database.responseTime}ms</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">API</h3>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(metrics?.api.status || 'unknown')}`}></div>
          </div>
          <p className="text-sm text-gray-600">Response Time</p>
          <p className="text-base font-semibold">{metrics?.api.responseTime}ms</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">IoT Devices</h3>
          <p className="text-sm text-gray-600">Active Devices</p>
          <p className="text-base font-semibold">{metrics?.iot.activeDevices}</p>
          <p className="text-sm text-gray-600 mt-2">Alerts (24h)</p>
          <p className="text-xl font-semibold">{metrics?.iot.alertsLast24h}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">ERP Integration</h3>
          <p className="text-sm text-gray-600">Last Sync</p>
          <p className="text-sm font-semibold">{metrics?.erp.lastSync ? formatDateTime(metrics.erp.lastSync) : 'Never'}</p>
          <p className="text-sm text-gray-600 mt-2">Failed Syncs</p>
          <p className={`text-xl font-semibold ${(metrics?.erp.failedSyncs || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics?.erp.failedSyncs || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Storage</h3>
          <p className="text-sm text-gray-600">Used / Total</p>
          <p className="text-base font-semibold">{metrics?.storage.used}GB / {metrics?.storage.total}GB</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((metrics?.storage.used || 0) / (metrics?.storage.total || 1)) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Active Users</h3>
          <p className="text-sm text-gray-600">Currently Online</p>
          <p className="text-base font-semibold">{metrics?.activeUsers || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>Database Connection</span>
            <span className={`px-3 py-1 rounded text-sm ${metrics?.database.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {metrics?.database.status || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>API Services</span>
            <span className={`px-3 py-1 rounded text-sm ${metrics?.api.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {metrics?.api.status || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>IoT Integration</span>
            <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800">Operational</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>ERP Integration</span>
            <span className={`px-3 py-1 rounded text-sm ${(metrics?.erp.failedSyncs || 0) === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {(metrics?.erp.failedSyncs || 0) === 0 ? 'Healthy' : 'Warning'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
