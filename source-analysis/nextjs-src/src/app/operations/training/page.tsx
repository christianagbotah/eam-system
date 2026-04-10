'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { GraduationCap, Plus, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface TrainingRecord {
  id: number;
  employee_id: number;
  training_type: string;
  training_date: string;
  expiry_date?: string;
  trainer?: string;
  score?: number;
  certificate_number?: string;
  status: string;
}

export default function TrainingPage() {
  const { hasPermission } = usePermissions();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [expiring, setExpiring] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(records);

  const canCreate = hasPermission('training.create');
  const canDelete = hasPermission('training.delete');
  const canExport = hasPermission('training.export');

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? records.filter(r => selectedIds.includes(r.id)) : records;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  const [formData, setFormData] = useState({
    employee_id: '',
    training_type: '',
    training_date: '',
    expiry_date: '',
    trainer: '',
    score: '',
    certificate_number: ''
  });

  useEffect(() => {
    fetchRecords();
    fetchExpiring();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/training');
      if ((res.data as any)?.status === 'success') {
        setRecords((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiring = async () => {
    try {
      const res = await api.get('/training/expiring');
      if ((res.data as any)?.status === 'success') {
        setExpiring((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving training record...');
    try {
      const res = await api.post('/training', {...formData, status: 'completed'});
      if ((res.data as any)?.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Training record created successfully!');
        setShowModal(false);
        fetchRecords();
        fetchExpiring();
        setFormData({ employee_id: '', training_type: '', training_date: '', expiry_date: '', trainer: '', score: '', certificate_number: '' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create training record');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} training records?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} records...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/training/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} records deleted`);
      clearSelection();
      fetchRecords();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete records');
    }
  };

  const displayData = activeTab === 'all' ? records : expiring;
  const paginatedData = displayData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(displayData.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Training Records</h1>
                <p className="text-blue-100 mt-1">Manage employee training and certifications</p>
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
                  className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Training
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
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{records.filter(r => r.status === 'completed').length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{expiring.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{records.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600" />
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
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Training ({records.length})
              </button>
              <button
                onClick={() => { setActiveTab('expiring'); setCurrentPage(1); }}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'expiring'
                    ? 'border-b-2 border-yellow-600 text-yellow-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expiring Soon ({expiring.length})
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {canDelete && (
              <BulkActions
                selectedIds={selectedIds}
                totalCount={records.length}
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
                <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No training records found</p>
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
                              checked={selectedIds.length === records.length && records.length > 0}
                              onChange={selectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          {canDelete && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected(record.id)}
                                onChange={() => toggleSelect(record.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono font-medium text-gray-900">EMP-{record.employee_id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{record.training_type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{formatDate(record.training_date)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{record.expiry_date ? formatDate(record.expiry_date) : '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{record.score ? `${record.score}%` : '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{record.certificate_number || '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add Training Record</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee ID</label>
                <input type="number" required value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Training Type</label>
                <input type="text" required value={formData.training_type} onChange={(e) => setFormData({...formData, training_type: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Training Date</label>
                <input type="date" required value={formData.training_date} onChange={(e) => setFormData({...formData, training_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Score (%)</label>
                <input type="number" min="0" max="100" value={formData.score} onChange={(e) => setFormData({...formData, score: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Number</label>
                <input type="text" value={formData.certificate_number} onChange={(e) => setFormData({...formData, certificate_number: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
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
