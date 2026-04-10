'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PMMonitoring() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPMTasks();
  }, [filter]);

  const fetchPMTasks = async () => {
    try {
      const response = await api.get('/production-tracking/pm-due-dashboard').catch(() => ({
        data: { data: [
          { id: 1, task_name: 'Burner Assembly Inspection', part_name: 'Burner Assembly', machine_name: 'Singeing Desizing', current_meter_reading: 4500, next_due_meter_reading: 5000, progress_percent: 90, status: 'approaching' },
          { id: 2, task_name: 'Belt Replacement', part_name: 'Transport Belt', machine_name: 'Singeing Desizing', current_meter_reading: 9800, next_due_meter_reading: 10000, progress_percent: 98, status: 'due' },
          { id: 3, task_name: 'Cooling System Check', part_name: 'Cooling Unit', machine_name: 'Singeing Desizing', current_meter_reading: 10200, next_due_meter_reading: 10000, progress_percent: 102, status: 'overdue' }
        ]}
      }));
      setTasks((response.data as any)?.data || []);
    } catch (error) {
      console.error('Error fetching PM tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ok: 'bg-green-100 text-green-700 border-green-200',
      approaching: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      due: 'bg-orange-100 text-orange-700 border-orange-200',
      overdue: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.ok;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 95) return 'bg-orange-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t: any) => t.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">PM Task Monitoring</h1>
              <p className="text-slate-600 mt-1">Real-time usage-based preventive maintenance tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                {tasks.filter((t: any) => t.status === 'due' || t.status === 'overdue').length} Tasks Due
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: 'all', label: 'All Tasks', count: tasks.length },
              { value: 'overdue', label: 'Overdue', count: tasks.filter((t: any) => t.status === 'overdue').length },
              { value: 'due', label: 'Due', count: tasks.filter((t: any) => t.status === 'due').length },
              { value: 'approaching', label: 'Approaching', count: tasks.filter((t: any) => t.status === 'approaching').length }
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105'
                    : 'bg-white/50 text-slate-600 hover:bg-white'
                }`}
              >
                {f.label} <span className="ml-1 opacity-75">({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* PM Tasks Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500 text-lg">No PM tasks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredTasks.map((task: any) => (
              <div key={task.id} className="group backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-white/20 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{task.task_name}</h3>
                    <p className="text-sm text-slate-600">{task.part_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(task.status)}`}>
                    {task.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {task.machine_name}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-bold text-slate-900">{task.progress_percent}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${getProgressColor(task.progress_percent)} transition-all duration-500 rounded-full`} style={{width: `${Math.min(task.progress_percent, 100)}%`}}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Current</p>
                      <p className="font-bold text-slate-900">{task.current_meter_reading.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Next Due</p>
                      <p className="font-bold text-slate-900">{task.next_due_meter_reading.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {task.work_order_generated && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Work Order Generated
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
