'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Clock, Download, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function TimeLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    loadLogs();
    checkClockStatus();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await api.get('/time-logs');
      setLogs(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load time logs');
    } finally {
      setLoading(false);
    }
  };

  const checkClockStatus = async () => {
    try {
      const response = await api.get('/time-logs/status');
      setClockedIn(response.data?.clocked_in || false);
    } catch (error) {
      console.error('Failed to check clock status');
    }
  };

  const handleClockIn = async () => {
    try {
      await api.post('/time-logs/clock-in');
      toast.success('Clocked in successfully');
      setClockedIn(true);
      loadLogs();
    } catch (error) {
      toast.error('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      await api.post('/time-logs/clock-out');
      toast.success('Clocked out successfully');
      setClockedIn(false);
      loadLogs();
    } catch (error) {
      toast.error('Failed to clock out');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours', 'Status'],
      ...logs.map(log => [
        log.date,
        log.employee_name,
        log.clock_in,
        log.clock_out || '-',
        log.hours || '-',
        log.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredLogs = logs.filter(log =>
    log.employee_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Logs</h1>
            <p className="text-gray-600 mt-1">Track employee work hours</p>
          </div>
          <div className="flex gap-3">
            {clockedIn ? (
              <button
                onClick={handleClockOut}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold inline-flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Clock Out
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold inline-flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Clock In
              </button>
            )}
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No time logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{log.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.employee_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.clock_in}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.clock_out || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.hours || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'clocked_in' ? 'bg-green-100 text-green-800' :
                        log.status === 'clocked_out' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
