'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Calibration {
  id: number;
  asset_id: number;
  asset_name?: string;
  last_calibration_date: string;
  next_due_date: string;
  frequency_days: number;
  status: string;
  certificate_number?: string;
  performed_by?: string;
}

import RBACGuard from '@/components/RBACGuard';

function CalibrationContent() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [overdue, setOverdue] = useState<Calibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all');
  
  const displayData = activeTab === 'all' ? calibrations : overdue;
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(displayData);

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: () => handleExport(),
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    asset_id: '',
    last_calibration_date: '',
    frequency_days: 365,
    certificate_number: '',
    performed_by: ''
  });

  useEffect(() => {
    fetchCalibrations();
    fetchOverdue();
  }, []);

  const fetchCalibrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calibration');
      if ((res.data as any)?.status === 'success') {
        setCalibrations((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdue = async () => {
    try {
      const res = await api.get('/calibration/overdue');
      if ((res.data as any)?.status === 'success') {
        setOverdue((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating calibration record...');
    try {
      const res = await api.post('/calibration', formData);
      if ((res.data as any)?.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Calibration record created successfully!');
        setShowModal(false);
        fetchCalibrations();
        fetchOverdue();
        setFormData({ asset_id: '', last_calibration_date: '', frequency_days: 365, certificate_number: '', performed_by: '' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create calibration record');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this calibration record?')) return;
    const loadingToast = showToast.loading('Deleting...');
    try {
      await api.delete(`/calibration/${id}`);
      showToast.dismiss(loadingToast);
      showToast.success('Calibration record deleted');
      fetchCalibrations();
      fetchOverdue();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete record');
      console.error('Error:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} calibration records?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} records...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/calibration/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} records deleted`);
      clearSelection();
      fetchCalibrations();
      fetchOverdue();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete records');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? displayData.filter(c => selectedIds.includes(c.id))
      : displayData;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(c => Object.values(c).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibration-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Calibration data exported');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      current: 'bg-green-100 text-green-800',
      due_soon: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Calibration Management</h1>
            <p className="text-xs text-gray-600 mt-0.5">Track and manage equipment calibration schedules</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add Calibration
            </button>
          </div>
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={displayData.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleExport}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-green-600">{calibrations.filter(c => c.status === 'current').length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Current</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-yellow-600">{calibrations.filter(c => c.status === 'due_soon').length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Due Soon</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-red-600">{overdue.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Overdue</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button onClick={() => setActiveTab('all')} className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>
                All Calibrations
              </button>
              <button onClick={() => setActiveTab('overdue')} className={`px-6 py-3 font-medium ${activeTab === 'overdue' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-600'}`}>
                Overdue ({overdue.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton rows={10} />
            ) : displayData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No calibration records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        <input type="checkbox" checked={selectedIds.length === displayData.length && displayData.length > 0} onChange={selectAll} />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Asset</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Calibration</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Next Due</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Frequency</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Certificate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayData.map((cal) => (
                      <tr key={cal.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected(cal.id)} onChange={() => toggleSelect(cal.id)} />
                        </td>
                        <td className="px-4 py-3 text-sm">{cal.asset_name || `Asset #${cal.asset_id}`}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(cal.last_calibration_date)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(cal.next_due_date)}</td>
                        <td className="px-4 py-3 text-sm">{cal.frequency_days} days</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(cal.status)}`}>
                            {cal.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{cal.certificate_number || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => handleDelete(cal.id)} className="text-red-600 hover:text-red-800">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Calibration Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset ID</label>
                <input type="number" required value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Calibration Date</label>
                <input type="date" required value={formData.last_calibration_date} onChange={(e) => setFormData({...formData, last_calibration_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Frequency (days)</label>
                <input type="number" required min="1" value={formData.frequency_days} onChange={(e) => setFormData({...formData, frequency_days: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Number</label>
                <input type="text" value={formData.certificate_number} onChange={(e) => setFormData({...formData, certificate_number: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Performed By</label>
                <input type="text" value={formData.performed_by} onChange={(e) => setFormData({...formData, performed_by: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
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

export default function CalibrationPage() {
  return (
    <RBACGuard module="calibration" action="view">
      <CalibrationContent />
    </RBACGuard>
  );
}
