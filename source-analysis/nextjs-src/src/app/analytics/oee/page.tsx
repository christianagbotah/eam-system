'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';

export default function OEEDashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    const csv = [Object.keys(metrics[0] || {}).join(','), ...metrics.map(m => Object.values(m).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oee-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('OEE metrics exported successfully');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, currentRes, downtimeRes] = await Promise.all([
        api.get('/oee/dashboard'),
        api.get('/oee/realtime/1'),
        api.get('/oee/downtime')
      ]);
      
      if (metricsRes.data?.status === 'success') setMetrics(metricsRes.data.data || []);
      if (currentRes.data?.status === 'success') setCurrent(currentRes.data.data);
      if (downtimeRes.data?.status === 'success') setDowntime(downtimeRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to fetch OEE data');
    } finally {
      setLoading(false);
    }
  };

  const getColor = (value: number) => {
    if (value >= 85) return 'text-green-600 bg-green-50';
    if (value >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) return <div className="p-6"><CardSkeleton count={8} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OEE Dashboard</h1>
          <p className="text-gray-600 mt-1">Overall Equipment Effectiveness - Real-time Monitoring</p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {current && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">OEE</span>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className={`text-3xl font-bold ${getColor(current.oee * 100)}`}>
              {(current.oee * 100).toFixed(1)}%
            </div>
            <div className="flex items-center mt-2 text-sm">
              {current.oee >= 0.85 ? (
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className="text-gray-600">Target: 85%</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Availability</span>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div className={`text-3xl font-bold ${getColor(current.availability * 100)}`}>
              {(current.availability * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">Uptime vs Planned</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Performance</span>
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div className={`text-3xl font-bold ${getColor(current.performance * 100)}`}>
              {(current.performance * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">Speed vs Ideal</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Quality</span>
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
            <div className={`text-3xl font-bold ${getColor(current.quality * 100)}`}>
              {(current.quality * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">Good vs Total</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">7-Day OEE Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {metrics.map((metric, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '200px' }}>
                <div 
                  className="absolute bottom-0 w-full bg-blue-600 rounded-t transition-all"
                  style={{ height: `${metric.avg_oee * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-sm font-semibold">{(metric.avg_oee * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Top Downtime Reasons
        </h2>
        <div className="space-y-3">
          {downtime.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-32 text-sm font-medium text-gray-700">{item.reason_name}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="bg-red-600 h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-semibold"
                    style={{ width: `${(item.total_minutes / downtime[0].total_minutes) * 100}%` }}
                  >
                    {item.total_minutes} min
                  </div>
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-right">{item.count}x</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
