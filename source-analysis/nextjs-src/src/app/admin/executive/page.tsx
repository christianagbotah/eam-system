'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { executiveService } from '@/services/executiveService';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    showToast.success('Executive dashboard exported');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await executiveService.getDashboard();
      setData(result);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6"><CardSkeleton count={8} /></div>;
  if (!data) return <div className="p-6">No data available</div>;

  return (
    <DashboardLayout role="admin">
      <div className="p-4 space-y-4">
        <h1 className="text-lg font-semibold">Executive Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Overall OEE"
            value={`${data.oee?.avg_oee?.toFixed(1) || 0}%`}
            subtitle="30-day average"
            color={data.oee?.avg_oee >= 85 ? 'green' : data.oee?.avg_oee >= 70 ? 'yellow' : 'red'}
          />
          <KpiCard
            title="Asset Uptime"
            value={`${((data.assets?.operational / data.assets?.total) * 100 || 0).toFixed(1)}%`}
            subtitle={`${data.assets?.operational}/${data.assets?.total} operational`}
            color="blue"
          />
          <KpiCard
            title="Work Orders"
            value={data.work_orders?.completed || 0}
            subtitle={`${data.work_orders?.overdue || 0} overdue`}
            color={data.work_orders?.overdue > 0 ? 'red' : 'green'}
          />
          <KpiCard
            title="Maintenance Cost"
            value={`$${(data.costs?.total_cost || 0).toLocaleString()}`}
            subtitle="This month"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard title="Availability" value={`${data.oee?.avg_avail?.toFixed(1) || 0}%`} target="90%" />
          <MetricCard title="Performance" value={`${data.oee?.avg_perf?.toFixed(1) || 0}%`} target="95%" />
          <MetricCard title="Quality" value={`${data.oee?.avg_qual?.toFixed(1) || 0}%`} target="99%" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Downtime (30 days)</h3>
            <div className="text-4xl font-bold text-red-600">
              {Math.round((data.downtime?.total_minutes || 0) / 60)} hrs
            </div>
            <div className="text-sm text-gray-600 mt-2">{data.downtime?.total_minutes || 0} minutes total</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Skills Coverage</h3>
            <div className="text-4xl font-bold text-blue-600">{data.skills?.qualified || 0}</div>
            <div className="text-sm text-gray-600 mt-2">
              Qualified employees across {data.skills?.total_skills || 0} skills
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ title, value, subtitle, color }: any) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`w-3 h-3 rounded-full ${colors[color as keyof typeof colors]}`} />
      </div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

function MetricCard({ title, value, target }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">Target: {target}</div>
    </div>
  );
}
