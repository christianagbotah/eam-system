'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PMMonitoring() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchPMTasks();
  }, [filter]);

  const fetchPMTasks = async () => {
    try {
      const response = await api.get('/part-pm-tasks/all');
      const result = response.data;
      const allTasks = result.data || [];
      
      const tasksWithStatus = allTasks.map((task: any) => {
        let status = 'ok';
        let progress = 0;
        

        
        if ((task.trigger_id === 2 || task.pm_trigger_id === 2) && task.next_due_meter_reading && task.last_meter_reading) {
          progress = (task.last_meter_reading / task.next_due_meter_reading) * 100;
          if (progress >= 100) status = 'overdue';
          else if (progress >= 95) status = 'due';
          else if (progress >= 80) status = 'approaching';
        } else if (task.next_due_date) {
          const today = new Date();
          const dueDate = new Date(task.next_due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue < 0) status = 'overdue';
          else if (daysUntilDue <= 2) status = 'due';
          else if (daysUntilDue <= 7) status = 'approaching';
          
          progress = Math.max(0, 100 - (daysUntilDue * 5));
        }
        
        return {
          ...task,
          status,
          progress_percent: Math.round(progress),
          current_meter_reading: task.last_meter_reading || 0,
          machine_name: task.part_name || 'N/A'
        };
      });
      
      setTasks(tasksWithStatus);
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
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 50) return 'bg-yellow-500';
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
          <div className="flex justify-between items-center mb-4">
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
            <div className="flex gap-2">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* PM Tasks Grid/Table */}
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredTasks.map((task: any) => (
              <div key={task.id} className="group backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-white/20 p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-h-[3rem]">
                    <Tooltip text={task.task_name}>
                      <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">{task.task_name}</h3>
                    </Tooltip>
                    <Tooltip text={task.part_name}>
                      <p className="text-sm text-slate-600 line-clamp-1">{task.part_name}</p>
                    </Tooltip>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 whitespace-nowrap ${getStatusColor(task.status)}`}>
                    {task.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4 flex-grow">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="line-clamp-1">{task.machine_name}</span>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
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
                      <p className="font-bold text-slate-900">
                        {(task.trigger_id == 1 || task.pm_trigger_id == 1)
                          ? new Date().toLocaleDateString('en-GB')
                          : Number(task.last_meter_reading || 0).toLocaleString()
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Next Due</p>
                      <p className="font-bold text-slate-900">
                        {(task.trigger_id == 1 || task.pm_trigger_id == 1)
                          ? task.next_due_date
                            ? new Date(task.next_due_date).toLocaleDateString('en-GB')
                            : 'N/A'
                          : Number(task.frequency_value || 0).toLocaleString()
                        }
                      </p>
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
        ) : (
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Task Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Part/Machine</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Progress</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Current</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900">{task.task_name}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{task.part_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(task.status)}`}>
                        {task.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full ${getProgressColor(task.progress_percent)} transition-all`} style={{width: `${Math.min(task.progress_percent, 100)}%`}}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600">{task.progress_percent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-900">
                      {(task.trigger_id == 1 || task.pm_trigger_id == 1)
                        ? new Date().toLocaleDateString('en-GB')
                        : Number(task.last_meter_reading || 0).toLocaleString()
                      }
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-900">
                      {(task.trigger_id == 1 || task.pm_trigger_id == 1)
                        ? task.next_due_date
                          ? new Date(task.next_due_date).toLocaleDateString('en-GB')
                          : 'N/A'
                        : Number(task.frequency_value || 0).toLocaleString()
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
