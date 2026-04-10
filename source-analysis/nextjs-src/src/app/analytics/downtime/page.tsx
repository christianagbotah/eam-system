'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/dateUtils';

interface DowntimeEvent {
  id: number;
  asset_id: number;
  asset_name?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  reason: string;
  category: string;
  description?: string;
  status: string;
}

export default function DowntimePage() {
  const [events, setEvents] = useState<DowntimeEvent[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(events);

  const [formData, setFormData] = useState({
    asset_id: '',
    start_time: '',
    end_time: '',
    reason: '',
    category: 'mechanical',
    description: ''
  });

  useEffect(() => {
    fetchDowntime();
    fetchAnalysis();
  }, []);

  const fetchDowntime = async () => {
    setLoading(true);
    try {
      const res = await api.get('/downtime');
      if (res.data?.status === 'success') setEvents(res.data.data || []);
    } catch (error) {
      showToast.error('Failed to load downtime data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const res = await api.get('/downtime/analysis');
      if (res.data?.status === 'success') setAnalysis(res.data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Logging downtime event...');
    try {
      const res = await api.post('/downtime', formData);
      if (res.data?.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Downtime event logged successfully!');
        setShowModal(false);
        fetchDowntime();
        fetchAnalysis();
        setFormData({ asset_id: '', start_time: '', end_time: '', reason: '', category: 'mechanical', description: '' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to log downtime event');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? events.filter(e => selectedIds.includes(e.id)) : events;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(e => Object.values(e).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downtime-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Downtime data exported');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  const totalDowntime = events.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const activeEvents = events.filter(e => e.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Downtime Tracker</h1>
          <p className="text-gray-600 mt-1">Monitor and analyze equipment downtime</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Export
          </button>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Log Downtime
          </button>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={events.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkExport={handleExport}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-red-600">{activeEvents}</div>
          <div className="text-sm text-gray-600 mt-1">Active Events</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-orange-600">{events.length}</div>
          <div className="text-sm text-gray-600 mt-1">Total Events</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{totalDowntime.toLocaleString()}</div>
          <div className="text-sm text-gray-600 mt-1">Total Minutes</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Pareto Analysis - Top Downtime Reasons</h2>
        {analysis.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_minutes" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">No analysis data available</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Downtime Events</h2>
        {loading ? (
          <TableSkeleton rows={10} />
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No downtime events recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={selectedIds.length === events.length && events.length > 0} onChange={selectAll} />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Start Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSelected(event.id)} onChange={() => toggleSelect(event.id)} />
                    </td>
                    <td className="px-4 py-3 text-sm">{event.asset_name || `Asset #${event.asset_id}`}</td>
                    <td className="px-4 py-3 text-sm">{formatDateTime(event.start_time)}</td>
                    <td className="px-4 py-3 text-sm">{event.duration_minutes ? `${event.duration_minutes} min` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{event.reason}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">{event.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Log Downtime Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset ID</label>
                <input type="number" required value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input type="datetime-local" required value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="hydraulic">Hydraulic</option>
                  <option value="pneumatic">Pneumatic</option>
                  <option value="software">Software</option>
                  <option value="operator_error">Operator Error</option>
                  <option value="material">Material</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input type="text" required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
