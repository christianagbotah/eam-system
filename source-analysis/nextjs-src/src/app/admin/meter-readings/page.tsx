'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface MeterReading {
  id: number;
  meter_id: number;
  meter_name?: string;
  asset_name?: string;
  reading_value: number;
  reading_date: string;
  recorded_by?: string;
  notes?: string;
}

import RBACGuard from '@/components/RBACGuard';

function MeterReadingsContent() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(readings);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? readings.filter(r => selectedIds.includes(r.id)) : readings;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meter-readings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    meter_id: '',
    reading_value: '',
    reading_date: '',
    recorded_by: '',
    notes: ''
  });

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const res = await api.get('/meter-readings');
      const data = res.data;
      if (data.status === 'success') {
        setReadings(data.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving meter reading...');
    try {
      const res = await api.post('/meter-readings', formData);
      const data = res.data;
      if (data.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Meter reading created successfully!');
        setShowModal(false);
        fetchReadings();
        setFormData({ meter_id: '', reading_value: '', reading_date: '', recorded_by: '', notes: '' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create meter reading');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} meter readings?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} readings...`);
    try {
      await Promise.all(selectedIds.map(id => 
        api.delete(`/meter-readings/${id}`)
      ));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} readings deleted`);
      clearSelection();
      fetchReadings();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete readings');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this reading?')) return;
    const loadingToast = showToast.loading('Deleting...');
    try {
      await api.delete(`/meter-readings/${id}`);
      showToast.dismiss(loadingToast);
      showToast.success('Reading deleted');
      fetchReadings();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete reading');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Meter Readings</h1>
            <p className="text-xs text-gray-600 mt-0.5">Track equipment meter data</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add Reading
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BulkActions
            selectedIds={selectedIds}
            totalCount={readings.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleExport}
          />
          {loading ? (
            <TableSkeleton rows={10} />
          ) : readings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No readings found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={selectedIds.length === readings.length && readings.length > 0} onChange={selectAll} />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Meter</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Asset</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reading</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Recorded By</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <input type="checkbox" checked={isSelected(reading.id)} onChange={() => toggleSelect(reading.id)} />
                      </td>
                      <td className="px-4 py-3 text-sm">{reading.meter_name || `Meter #${reading.meter_id}`}</td>
                      <td className="px-4 py-3 text-sm">{reading.asset_name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{reading.reading_value}</td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(reading.reading_date)}</td>
                      <td className="px-4 py-3 text-sm">{reading.recorded_by || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => handleDelete(reading.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Meter Reading</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meter ID</label>
                <input type="number" required value={formData.meter_id} onChange={(e) => setFormData({...formData, meter_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reading Value</label>
                <input type="number" required step="0.01" value={formData.reading_value} onChange={(e) => setFormData({...formData, reading_value: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reading Date</label>
                <input type="datetime-local" required value={formData.reading_date} onChange={(e) => setFormData({...formData, reading_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recorded By</label>
                <input type="text" value={formData.recorded_by} onChange={(e) => setFormData({...formData, recorded_by: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function MeterReadingsPage() {
  return (
    <RBACGuard module="meter_readings" action="view">
      <MeterReadingsContent />
    </RBACGuard>
  );
}
