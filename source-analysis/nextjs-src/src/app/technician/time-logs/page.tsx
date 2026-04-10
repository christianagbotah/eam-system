'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Clock, Plus } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function TimeLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ work_order_id: '', hours: '', date: '', notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsRes, woRes] = await Promise.all([
        api.get('/maintenance/work-orders/time-logs'),
        api.get('/work-orders?assigned_to=me')
      ]);
      setLogs(logsRes.data?.data || []);
      setWorkOrders(woRes.data?.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/maintenance/labor-logs', formData);
      alert.success('Success', 'Time log added');
      setShowModal(false);
      setFormData({ work_order_id: '', hours: '', date: '', notes: '' });
      loadData();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to add time log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold mb-2">Time Logs</h1>
              <p className="text-green-100">Track your work hours</p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />Add Time Log
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Work Order</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No time logs found</td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-sm text-gray-900">{formatDateTime(log.clock_in)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">WO #{log.work_order_number || log.work_order_id}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{log.actual_hours || 0}h</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{log.activity_description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-xl">
                <h2 className="text-xl font-bold text-white">Add Time Log</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Work Order *</label>
                  <select value={formData.work_order_id} onChange={(e) => setFormData({...formData, work_order_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                    <option value="">Select work order...</option>
                    {workOrders.map(wo => (
                      <option key={wo.id} value={wo.id}>WO #{wo.work_order_number} - {wo.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hours *</label>
                  <input type="number" step="0.5" value={formData.hours} onChange={(e) => setFormData({...formData, hours: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2" rows={3} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
