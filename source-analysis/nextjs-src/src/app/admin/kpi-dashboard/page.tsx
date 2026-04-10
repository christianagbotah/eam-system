'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign, CheckCircle, AlertTriangle, Wrench, Calendar, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';

function KPIDashboardContent() {
  const [period, setPeriod] = useState('30');
  const [kpis, setKpis] = useState<any>({});
  const [trends, setTrends] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes, costRes] = await Promise.all([
        api.get(`/kpi/summary?days=${period}`),
        api.get(`/kpi/trends?days=180`),
        api.get(`/kpi/cost-breakdown?days=${period}`)
      ]);
      
      if (summaryRes.data?.status === 'success') setKpis(summaryRes.data.data);
      if (trendsRes.data?.status === 'success') setTrends(trendsRes.data.data || []);
      if (costRes.data?.status === 'success') setCostBreakdown(costRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-7xl mx-auto"><CardSkeleton count={8} /></div></div>;

  const kpiCards = [
    { name: 'MTBF', value: `${kpis.mtbf || 0} hrs`, icon: Clock, color: 'blue' },
    { name: 'MTTR', value: `${kpis.mttr || 0} hrs`, icon: Wrench, color: 'green' },
    { name: 'PM Compliance', value: `${kpis.pm_compliance || 0}%`, icon: CheckCircle, color: 'green' },
    { name: 'Reactive Ratio', value: `${kpis.reactive_ratio || 0}%`, icon: AlertTriangle, color: 'orange' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Maintenance KPI Dashboard</h1>
            <p className="text-gray-600">Real-time performance metrics</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-2 py-1 text-xs border rounded-md">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">{kpi.name}</span>
                  <Icon className={`w-5 h-5 text-${kpi.color}-600`} />
                </div>
                <div className="text-base font-semibold mb-1">{kpi.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">MTBF & MTTR Trends</h2>
            {trends.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No trend data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="mtbf" stroke="#3b82f6" name="MTBF (hrs)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="mttr" stroke="#10b981" name="MTTR (hrs)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Cost Breakdown</h2>
            {costBreakdown.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No cost data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Performance Targets</h2>
          <div className="space-y-4">
            {[
              { metric: 'MTBF', current: kpis.mtbf || 0, target: 800, unit: 'hrs' },
              { metric: 'MTTR', current: kpis.mttr || 0, target: 2.5, unit: 'hrs' },
              { metric: 'PM Compliance', current: kpis.pm_compliance || 0, target: 95, unit: '%' }
            ].map((item, i) => {
              const progress = (item.current / item.target) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{item.metric}</span>
                    <span className="text-sm text-gray-600">{item.current}{item.unit} / {item.target}{item.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${progress >= 95 ? 'bg-green-600' : progress >= 85 ? 'bg-yellow-600' : 'bg-red-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KPIDashboard() {
  return (
    <RBACGuard module="kpi_dashboard" action="view">
      <KPIDashboardContent />
    </RBACGuard>
  );
}
