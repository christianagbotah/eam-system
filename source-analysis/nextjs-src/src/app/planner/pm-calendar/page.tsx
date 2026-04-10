'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { pmService } from '@/services/pmService';
import { toast } from '@/lib/toast';

export default function PlannerPMCalendar() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const result = await pmService.getPMSchedules();
      setSchedules(result.data || []);
    } catch (error: any) {
      toast.error('Failed to load schedules');
    }
  };

  return (
    <DashboardLayout role="planner">
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">PM Calendar</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Upcoming PM Schedules</h2>
          <div className="space-y-3">
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No schedules</p>
            ) : (
              schedules.map((schedule: any) => (
                <div key={schedule.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Schedule #{schedule.id}</p>
                      <p className="text-sm text-gray-600">Due: {schedule.due_date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                      schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{schedule.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
