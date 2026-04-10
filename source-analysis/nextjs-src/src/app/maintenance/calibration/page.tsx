'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Gauge, Plus, Download, CheckCircle, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

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

export default function CalibrationPage() {
  const { hasPermission } = usePermissions();
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [overdue, setOverdue] = useState<Calibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const displayData = activeTab === 'all' ? calibrations : overdue;
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(displayData);

  const canCreate = hasPermission('calibration.create');
  const canDelete = hasPermission('calibration.delete');
  const canExport = hasPermission('calibration.export');

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? displayData.filter(c => selectedIds.includes(c.id)) : displayData;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(c => Object.values(c).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibration-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Calibration data exported');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
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

  const getStatusBadge = (status: string) => {
    const colors = {
      current: 'bg-green-100 text-green-800',
      due_soon: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const paginatedData = displayData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(displayData.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Gauge className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Calibration Management</h1>
                <p className="text-purple-100 mt-1">Track and manage equipment calibration schedules</p>
              </div>
            </div>
            <div className="flex gap-3">
              {canExport && (
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
              {canCreate && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Calibration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{calibrations.filter(c => c.status === 'current').length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Due Soon</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{calibrations.filter(c => c.status === 'due_soon').length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{overdue.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Calibrations ({calibrations.length})
              </button>
              <button
                onClick={() => { setActiveTab('overdue'); setCurrentPage(1); }}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'overdue'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Overdue ({overdue.length})
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {canDelete && (
              <BulkActions
                selectedIds={selectedIds}
                totalCount={displayData.length}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onBulkDelete={handleBulkDelete}
                onBulkExport={handleExport}
              />
            )}
            {loading ? (
              <TableSkeleton rows={10} />
            ) : displayData.length === 0 ? (
              <div className="text-center py-12">
                <Gauge className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No calibration records found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {canDelete && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedIds.length === displayData.length && displayData.length > 0}
                              onChange={selectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Calibration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                        {canDelete && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData.map((cal) => (
                        <tr key={cal.id} className="hover:bg-gray-50 transition-colors">
                          {canDelete && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected(cal.id)}
                                onChange={() => toggleSelect(cal.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{cal.asset_name || `Asset #${cal.asset_id}`}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{formatDate(cal.last_calibration_date)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{formatDate(cal.next_due_date)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{cal.frequency_days} days</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(cal.status)}`}>
                              {cal.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{cal.certificate_number || '-'}</span>
                          </td>
                          {canDelete && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleDelete(cal.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-700">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, displayData.length)} of {displayData.length} records
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gauge className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add Calibration Record</h2>
            </div>
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
