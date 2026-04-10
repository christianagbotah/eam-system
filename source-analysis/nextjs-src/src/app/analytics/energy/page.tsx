'use client';

import { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';

export default function EnergyAnalytics() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState<any>({});
  const [consumption, setConsumption] = useState([]);
  const [costTrend, setCostTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, consumptionRes, costRes] = await Promise.all([
        api.get(`/energy/summary?days=${period}`),
        api.get(`/energy/consumption?days=${period}`),
        api.get(`/energy/cost-trend?days=${period}`)
      ]);
      
      if (metricsRes.data?.status === 'success') setMetrics(metricsRes.data.data || {});
      if (consumptionRes.data?.status === 'success') setConsumption(consumptionRes.data.data || []);
      if (costRes.data?.status === 'success') setCostTrend(costRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load energy data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6"><CardSkeleton count={8} /></div>;

  const energyCards = [
    { name: 'Total Consumption', value: `${metrics.total_kwh || 0} kWh`, icon: Zap, color: 'blue', trend: metrics.consumption_trend },
    { name: 'Total Cost', value: `$${(metrics.total_cost || 0).toLocaleString()}`, icon: DollarSign, color: 'green', trend: metrics.cost_trend },
    { name: 'Avg Daily', value: `${metrics.avg_daily_kwh || 0} kWh`, icon: TrendingUp, color: 'purple', trend: metrics.daily_trend },
    { name: 'Peak Demand', value: `${metrics.peak_kw || 0} kW`, icon: TrendingUp, color: 'orange', trend: metrics.peak_trend }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Energy Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor energy consumption and costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)} 
            className="px-3 py-2 border rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {energyCards.map((card, i) => {
          const Icon = card.icon;
          const TrendIcon = card.trend >= 0 ? TrendingUp : TrendingDown;
          return (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">{card.name}</span>
                <Icon className={`w-5 h-5 text-${card.color}-600`} />
              </div>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              {card.trend !== undefined && (
                <div className="flex items-center text-sm">
                  <TrendIcon className={`w-4 h-4 mr-1 ${card.trend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={card.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(card.trend)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Energy Consumption Trend</h2>
          {consumption.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No consumption data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={consumption}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="kwh" stroke="#3b82f6" name="kWh" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cost Trend</h2>
          {costTrend.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No cost data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Energy Efficiency Targets</h2>
        <div className="space-y-4">
          {[
            { metric: 'Daily Consumption', current: metrics.avg_daily_kwh || 0, target: 5000, unit: 'kWh' },
            { metric: 'Cost per kWh', current: metrics.cost_per_kwh || 0, target: 0.12, unit: '$' },
            { metric: 'Peak Demand', current: metrics.peak_kw || 0, target: 800, unit: 'kW' }
          ].map((item, i) => {
            const progress = (item.current / item.target) * 100;
            return (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{item.metric}</span>
                  <span className="text-sm text-gray-600">
                    {item.unit === '$' ? item.unit : ''}{item.current}{item.unit !== '$' ? item.unit : ''} / {item.unit === '$' ? item.unit : ''}{item.target}{item.unit !== '$' ? item.unit : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      progress <= 90 ? 'bg-green-600' : 
                      progress <= 100 ? 'bg-yellow-600' : 
                      'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
