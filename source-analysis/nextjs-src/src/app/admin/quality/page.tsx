'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface NonConformance {
  id: number;
  nc_number: string;
  title: string;
  severity: string;
  status: string;
  asset_name: string;
  reported_by: string;
  created_at: string;
}

export default function QualityPage() {
  const [nonConformances, setNonConformances] = useState<NonConformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(nonConformances);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? nonConformances.filter(nc => selectedIds.includes(nc.id)) : nonConformances;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(nc => Object.values(nc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'minor',
    asset_id: '',
    root_cause: '',
    corrective_action: ''
  });

  useEffect(() => {
    fetchNonConformances();
  }, []);

  const fetchNonConformances = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/quality/non-conformances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setNonConformances(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Reporting non-conformance...');
    try {
      const token = localStorage.getItem('access_token');
      await api.post('/quality/non-conformances')`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      showToast.dismiss(loadingToast);
      showToast.success('Non-conformance reported successfully!');
      setShowModal(false);
      fetchNonConformances();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to report non-conformance');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} non-conformances?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} items...`);
    try {
      const token = localStorage.getItem('access_token');
      await Promise.all(selectedIds.map(id => 
        api.delete(`/quality/non-conformances/${id}`)` }
        })
      ));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} items deleted`);
      clearSelection();
      fetchNonConformances();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete items');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      major: 'bg-orange-100 text-orange-800',
      minor: 'bg-yellow-100 text-yellow-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Quality Management</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded">📥 Export</button>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">+ Report Non-Conformance</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Open Issues</div>
          <div className="text-lg font-semibold">{nonConformances.filter(nc => nc.status === 'open').length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Investigating</div>
          <div className="text-lg font-semibold">{nonConformances.filter(nc => nc.status === 'investigating').length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-lg font-semibold">{nonConformances.filter(nc => nc.status === 'resolved').length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-lg font-semibold text-red-600">{nonConformances.filter(nc => nc.severity === 'critical').length}</div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={nonConformances.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <input type="checkbox" checked={selectedIds.length === nonConformances.length && nonConformances.length > 0} onChange={selectAll} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">NC Number</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-200">
              {nonConformances.map(nc => (
                <tr key={nc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(nc.id)} onChange={() => toggleSelect(nc.id)} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm">{nc.nc_number}</td>
                <td className="px-6 py-4">{nc.title}</td>
                <td className="px-6 py-4">{nc.asset_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(nc.severity)}`}>
                    {nc.severity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(nc.status)}`}>
                    {nc.status}
                  </span>
                </td>
                <td className="px-6 py-4">{nc.reported_by}</td>
                <td className="px-3 py-2.5 text-sm">{formatDate(nc.created_at)}</td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Report Non-Conformance</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={e => setFormData({...formData, severity: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Asset ID</label>
                  <input
                    type="text"
                    value={formData.asset_id}
                    onChange={e => setFormData({...formData, asset_id: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Root Cause (Optional)</label>
                <textarea
                  value={formData.root_cause}
                  onChange={e => setFormData({...formData, root_cause: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Corrective Action (Optional)</label>
                <textarea
                  value={formData.corrective_action}
                  onChange={e => setFormData({...formData, corrective_action: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
