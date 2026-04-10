'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

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

import RBACGuard from '@/components/RBACGuard';

function TrainingContent() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [expiring, setExpiring] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(records);

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

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Training Records</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage employee training and certifications</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add Training
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-green-600">{records.filter(r => r.status === 'completed').length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-yellow-600">{expiring.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Expiring Soon</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-blue-600">{records.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Records</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button onClick={() => setActiveTab('all')} className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>
                All Training
              </button>
              <button onClick={() => setActiveTab('expiring')} className={`px-6 py-3 font-medium ${activeTab === 'expiring' ? 'border-b-2 border-yellow-600 text-yellow-600' : 'text-gray-600'}`}>
                Expiring Soon ({expiring.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            <BulkActions
              selectedIds={selectedIds}
              totalCount={records.length}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onBulkDelete={handleBulkDelete}
              onBulkExport={handleExport}
            />
            {loading ? (
              <TableSkeleton rows={10} />
            ) : displayData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No training records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        <input type="checkbox" checked={selectedIds.length === records.length && records.length > 0} onChange={selectAll} />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Employee ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Training Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expiry</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Certificate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayData.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <input type="checkbox" checked={isSelected(record.id)} onChange={() => toggleSelect(record.id)} />
                        </td>
                        <td className="px-4 py-3 text-sm">EMP-{record.employee_id}</td>
                        <td className="px-4 py-3 text-sm">{record.training_type}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(record.training_date)}</td>
                        <td className="px-4 py-3 text-sm">{record.expiry_date ? formatDate(record.expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">{record.score ? `${record.score}%` : '-'}</td>
                        <td className="px-4 py-3 text-sm">{record.certificate_number || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Training Record</h2>
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

export default function TrainingPage() {
  return (
    <RBACGuard module="training" action="view">
      <TrainingContent />
    </RBACGuard>
  );
}
