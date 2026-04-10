'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface ScheduledTask {
  id: number;
  work_order_id: number;
  title: string;
  asset_name: string;
  technician_id: number;
  technician_name: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_hours: number;
  status: string;
  priority: string;
}

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    const csv = [Object.keys(tasks[0] || {}).join(','), ...tasks.map(t => Object.values(t).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scheduler-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Schedule exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    fetchTasks();
    fetchResources();
  }, [selectedDate, view]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/eam/scheduler/tasks?date=${selectedDate}&view=${view}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setTasks(data.data || []);
    } catch (error) {
      showToast.error('Failed to fetch tasks');
    }
  };

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/scheduler/resources', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setResources(data.data || []);
    } catch (error) {
      showToast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const scheduleTask = async (workOrderId: number, technicianId: number, start: string, hours: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await api.post('/scheduler/schedule')`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          work_order_id: workOrderId,
          technician_id: technicianId,
          scheduled_start: start,
          estimated_hours: hours
        })
      });
      showToast.success('Task scheduled');
      fetchTasks();
    } catch (error) {
      showToast.error('Failed to schedule task');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getTasksForTechnicianAndDay = (techId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => 
      t.technician_id === techId && 
      t.scheduled_start.startsWith(dateStr)
    );
  };

  if (loading) return <div className="p-6"><TableSkeleton rows={10} /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Maintenance Scheduler</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <div className="flex gap-1">
            {['day', 'week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-4 py-2 rounded ${view === v ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-bold mb-4">Resource Capacity</h2>
        <div className="grid grid-cols-4 gap-2">
          {resources.map(r => (
            <div key={r.id} className="border rounded p-3">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-gray-600">{r.role}</div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Capacity</span>
                  <span>{r.hours_scheduled}/{r.hours_available}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${r.hours_scheduled > r.hours_available ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((r.hours_scheduled / r.hours_available) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {view === 'week' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                {getWeekDays().map(day => (
                  <th key={day.toISOString()} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div>{day.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {resources.map(tech => (
                <tr key={tech.id}>
                  <td className="px-4 py-4 font-medium">{tech.name}</td>
                  {getWeekDays().map(day => (
                    <td key={day.toISOString()} className="px-2 py-2 align-top">
                      <div className="space-y-1">
                        {getTasksForTechnicianAndDay(tech.id, day).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-2 rounded text-white cursor-pointer ${getPriorityColor(task.priority)}`}
                            title={task.title}
                          >
                            <div className="font-semibold truncate">{task.title}</div>
                            <div className="text-xs opacity-90">{task.estimated_hours}h</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-bold mb-4">Unscheduled Work Orders</h2>
        <div className="space-y-2">
          {tasks.filter(t => t.status === 'unscheduled').map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-semibold">{task.title}</div>
                <div className="text-sm text-gray-600">{task.asset_name} • {task.estimated_hours}h</div>
              </div>
              <button
                onClick={() => scheduleTask(task.work_order_id, resources[0]?.id, selectedDate, task.estimated_hours)}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Schedule
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
