'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';

export default function PmAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [partPerf, setPartPerf] = useState<any[]>([]);
  const [techPerf, setTechPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [dashRes, partRes, techRes] = await Promise.all([
        api.get('/pm-analytics/dashboard'),
        api.get('/pm-analytics/part-performance'),
        api.get('/pm-analytics/technician-performance')
      ]);
      
      const [dash, part, tech] = await Promise.all([
        dashRes.json(),
        partRes.json(),
        techRes.json()
      ]);
      
      setAnalytics(dash.data);
      setPartPerf(part.data || []);
      setTechPerf(tech.data || []);
    } catch (error) {
      showToast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading analytics...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">PM Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Compliance Rate</h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Target: 95%</span>
          </div>
          <p className="text-lg font-semibold text-green-600">{analytics?.compliance_rate}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width: `${analytics?.compliance_rate}%`}}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Active PM Tasks</h3>
          <p className="text-lg font-semibold text-blue-600">{analytics?.total_active_tasks}</p>
          <p className="text-xs text-gray-500 mt-2">Across all parts</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Upcoming (30 Days)</h3>
          <p className="text-lg font-semibold text-orange-600">{analytics?.upcoming_count}</p>
          <p className="text-xs text-gray-500 mt-2">Due in next month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Avg Completion Time</h3>
          <p className="text-lg font-semibold text-purple-600">{analytics?.avg_completion_hours}h</p>
          <p className="text-xs text-gray-500 mt-2">Per work order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Work Order Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Pending', count: analytics?.work_order_stats?.pending, color: 'bg-yellow-500' },
              { label: 'Assigned', count: analytics?.work_order_stats?.assigned, color: 'bg-purple-500' },
              { label: 'In Progress', count: analytics?.work_order_stats?.in_progress, color: 'bg-blue-500' },
              { label: 'Completed', count: analytics?.work_order_stats?.completed, color: 'bg-green-500' },
              { label: 'Overdue', count: analytics?.work_order_stats?.overdue, color: 'bg-red-500' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="text-lg font-bold">{item.count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">PM by Trigger Type</h2>
          <div className="space-y-3">
            {analytics?.by_trigger?.map((item: any) => (
              <div key={item.trigger_name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.trigger_name}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{width: `${(item.count / analytics.total_active_tasks) * 100}%`}}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Monthly Completion Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {analytics?.monthly_trend?.map((month: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t hover:from-blue-600 hover:to-blue-400 transition-colors cursor-pointer" 
                style={{height: `${(month.completed / Math.max(...analytics.monthly_trend.map((m: any) => m.completed))) * 100}%`}}
                title={`${month.completed} completed`}
              ></div>
              <span className="text-xs text-gray-500 mt-2">{month.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Part Performance (Top 20)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-center">PM Tasks</th>
                  <th className="px-3 py-2 text-center">WOs</th>
                  <th className="px-3 py-2 text-center">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {partPerf.slice(0, 10).map((part: any) => (
                  <tr key={part.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{part.part_name}</div>
                      <div className="text-xs text-gray-500">{part.part_number}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{part.pm_tasks_count}</td>
                    <td className="px-3 py-2 text-center">{part.work_orders_count}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        part.overdue_count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {part.overdue_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Technician Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Tech ID</th>
                  <th className="px-3 py-2 text-center">Assigned</th>
                  <th className="px-3 py-2 text-center">Completed</th>
                  <th className="px-3 py-2 text-center">On Time %</th>
                </tr>
              </thead>
              <tbody>
                {techPerf.map((tech: any) => {
                  const onTimeRate = tech.completed > 0 ? Math.round((tech.on_time / tech.completed) * 100) : 0;
                  return (
                    <tr key={tech.technician_id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">Tech #{tech.technician_id}</td>
                      <td className="px-3 py-2 text-center">{tech.total_assigned}</td>
                      <td className="px-3 py-2 text-center">{tech.completed}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          onTimeRate >= 90 ? 'bg-green-100 text-green-800' :
                          onTimeRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {onTimeRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
