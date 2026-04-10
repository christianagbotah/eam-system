'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function EfficiencyPage() {
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api.get('/production-efficiency');
      setMetrics(response.data?.data || {});
    } catch (error) {
      toast.error('Failed to load efficiency metrics');
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { label: 'Overall Efficiency', value: metrics.overall_efficiency || 0, unit: '%', trend: 'up', color: 'blue' },
    { label: 'Throughput', value: metrics.throughput || 0, unit: 'units/hr', trend: 'up', color: 'green' },
    { label: 'Cycle Time', value: metrics.cycle_time || 0, unit: 'min', trend: 'down', color: 'purple' },
    { label: 'First Pass Yield', value: metrics.first_pass_yield || 0, unit: '%', trend: 'up', color: 'yellow' }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Production Efficiency</h1>
          <p className="text-gray-600 mt-1">Track production performance metrics</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{kpi.label}</span>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? '...' : `${kpi.value}${kpi.unit}`}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Efficiency Trends</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization coming soon
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
