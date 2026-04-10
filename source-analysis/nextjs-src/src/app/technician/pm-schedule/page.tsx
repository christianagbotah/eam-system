'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PMSchedulePage() {
  const [pmTasks, setPMTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    loadPMTasks();
  }, [filter]);

  const loadPMTasks = async () => {
    try {
      const res = await api.get(`/technician/pm-schedule?filter=${filter}`);
      setPMTasks(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load PM tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'bg-red-100 text-red-800 border-red-300';
    if (daysUntil <= 7) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
          <h1 className="text-lg font-semibold mb-2">PM Schedule</h1>
          <p className="text-orange-100">Preventive maintenance tasks assigned to you</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex gap-3 mb-6">
            <button onClick={() => setFilter('upcoming')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'upcoming' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Upcoming
            </button>
            <button onClick={() => setFilter('overdue')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'overdue' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Overdue
            </button>
            <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'completed' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Completed
            </button>
          </div>

          <div className="space-y-4">
            {pmTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500">Asset: {task.asset_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.due_date)}`}>
                    Due: {formatDate(task.due_date)}
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{task.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {task.estimated_hours}h
                  </span>
                  <span className="capitalize">Frequency: {task.frequency}</span>
                </div>
              </div>
            ))}
          </div>

          {pmTasks.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No PM Tasks</h3>
              <p className="text-gray-500">No {filter} preventive maintenance tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
