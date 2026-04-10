'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';

function StatisticsContent() {
  const [timeRange, setTimeRange] = useState('30');
  const [mtbfData, setMtbfData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ avgMtbf: 0, avgMttr: 0, totalCost: 0, totalFailures: 0 });

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rca/statistics?days=${timeRange}`);
      if (res.data?.status === 'success') {
        const data = res.data.data;
        setMtbfData(data.mtbf || []);
        setTrendData(data.trends || []);
        setCategoryData(data.categories?.map((c: any, i: number) => ({
          name: c.category,
          value: c.value,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'][i % 4]
        })) || []);
        
        const avgMtbf = data.mtbf?.reduce((a: number, b: any) => a + parseFloat(b.mtbf || 0), 0) / (data.mtbf?.length || 1);
        const avgMttr = data.mtbf?.reduce((a: number, b: any) => a + parseFloat(b.mttr || 0), 0) / (data.mtbf?.length || 1);
        const totalCost = data.trends?.reduce((a: number, b: any) => a + parseFloat(b.cost || 0), 0) || 0;
        const totalFailures = data.trends?.reduce((a: number, b: any) => a + parseInt(b.failures || 0), 0) || 0;
        
        setSummary({ avgMtbf: Math.round(avgMtbf), avgMttr: parseFloat(avgMttr.toFixed(1)), totalCost, totalFailures });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <CardSkeleton count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/admin/failure-analysis" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold">Failure Statistics</h1>
              <p className="text-gray-600">MTBF, trends & cost analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchStatistics} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-2 py-1 text-xs border rounded-md">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Avg MTBF</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-base font-semibold">{summary.avgMtbf} hrs</div>
            <div className="text-sm text-gray-500">Average across assets</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Avg MTTR</span>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-base font-semibold">{summary.avgMttr} hrs</div>
            <div className="text-sm text-gray-500">Average repair time</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Cost</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-base font-semibold">${(summary.totalCost / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-500">Total failure cost</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Failures</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-base font-semibold">{summary.totalFailures}</div>
            <div className="text-sm text-gray-500">Total incidents</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Failure Trends</h2>
            {trendData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No trend data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="failures" stroke="#3b82f6" name="Failures" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" name="Cost ($)" />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Failure Categories</h2>
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No category data available</div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">MTBF by Asset</h2>
          <div className="overflow-x-auto">
            {mtbfData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No MTBF data available for selected period</div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">MTBF (hrs)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">MTTR (hrs)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Failures</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mtbfData.map((item: any, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.asset}</td>
                    <td className="px-4 py-3">{parseFloat(item.mtbf).toFixed(0)}</td>
                    <td className="px-4 py-3">{parseFloat(item.mttr).toFixed(1)}</td>
                    <td className="px-4 py-3">{item.failures}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${item.mtbf > 700 ? 'bg-green-100 text-green-800' : item.mtbf > 500 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {item.mtbf > 700 ? 'High' : item.mtbf > 500 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <RBACGuard module="rca_analysis" action="view">
      <StatisticsContent />
    </RBACGuard>
  );
}
