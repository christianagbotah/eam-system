'use client';

import { useState, useEffect } from 'react';
import { shiftService } from '@/services/shiftService';
import { toast } from '@/lib/toast';

export default function SupervisorRosterPage() {
  const [departmentId, setDepartmentId] = useState('2');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRoster(); }, []);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const result = await shiftService.getDepartmentRoster(parseInt(departmentId), date);
      setRoster(result.data.roster || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">My Department Roster</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Department ID</label>
            <input type="number" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <button onClick={loadRoster} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Load Roster'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roster.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No roster data</td></tr>
            ) : (
              roster.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">{item.username} ({item.full_name})</td>
                  <td className="px-6 py-4">{item.email}</td>
                  <td className="px-6 py-4">{item.shift_name}</td>
                  <td className="px-6 py-4">{item.start_time} - {item.end_time}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{item.start_date} {item.end_date ? `to ${item.end_date}` : '(ongoing)'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
