'use client';

import { useState, useEffect } from 'react';
import { pmService, PMSchedule } from '@/services/pmService';
import { toast } from 'react-hot-toast';
import PMScheduleList from '@/components/pm/PMScheduleList';
import PMSchedulingCalendar from '@/components/pm/PMSchedulingCalendar';
import PMStatusWidget from '@/components/pm/PMStatusWidget';

export default function PMSchedulesPage() {
  const [schedules, setSchedules] = useState<PMSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    loadSchedules();
  }, [filters]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await pmService.listSchedules(filters);
      if (response.success) {
        setSchedules(response.data);
      }
    } catch (error) {
      toast.error('Failed to load PM schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleRunScheduler = async () => {
    try {
      const response = await pmService.runScheduler({
        from: new Date().toISOString().split('T')[0],
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      if (response.success) {
        toast.success(`Generated ${(response.data as any)?.work_orders_generated} work orders`);
        loadSchedules();
      }
    } catch (error) {
      toast.error('Failed to run PM scheduler');
    }
  };

  const handleGenerateWorkOrder = async (scheduleId: number) => {
    try {
      const response = await pmService.generateWorkOrder(scheduleId);
      if (response.success) {
        toast.success(`Work order ${(response.data as any)?.work_order_number} generated`);
        loadSchedules();
      }
    } catch (error) {
      toast.error('Failed to generate work order');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold">PM Schedules</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRunScheduler}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Run Scheduler
          </button>
          <div className="flex rounded-lg border">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 text-sm ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
        <PMStatusWidget
          title="Due Today"
          count={schedules.filter(s => s.next_due_date === new Date().toISOString().split('T')[0]).length}
          color="red"
        />
        <PMStatusWidget
          title="Due This Week"
          count={schedules.filter(s => {
            const dueDate = new Date(s.next_due_date || '');
            const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return dueDate <= weekFromNow && dueDate >= new Date();
          }).length}
          color="orange"
        />
        <PMStatusWidget
          title="Waiting"
          count={schedules.filter(s => s.status === 'waiting').length}
          color="blue"
        />
        <PMStatusWidget
          title="Generated"
          count={schedules.filter(s => s.status === 'generated').length}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="generated">Generated</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({...filters, from: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({...filters, to: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <PMScheduleList
          schedules={schedules}
          loading={loading}
          onGenerateWorkOrder={handleGenerateWorkOrder}
        />
      ) : (
        <PMSchedulingCalendar
          filters={filters}
        />
      )}
    </div>
  );
}
