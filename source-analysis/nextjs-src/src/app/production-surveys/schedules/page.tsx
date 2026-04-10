'use client';
import { useState, useEffect } from 'react';
import { productionSurveyAdvancedService, SurveySchedule } from '@/services/productionSurveyAdvanced';
import { Calendar, Plus } from 'lucide-react';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<SurveySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await productionSurveyAdvancedService.getSchedules();
      setSchedules(response.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold">Survey Schedules</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={20} /> Create Schedule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Schedule Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Auto Create</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <tr key={schedule.schedule_id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 text-sm font-medium">{schedule.schedule_name}</td>
                <td className="px-3 py-2.5 text-sm capitalize">{schedule.frequency}</td>
                <td className="px-3 py-2.5 text-sm">{schedule.start_date}</td>
                <td className="px-3 py-2.5 text-sm">
                  {schedule.auto_create ? '✓ Yes' : '✗ No'}
                </td>
                <td className="px-3 py-2.5 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
