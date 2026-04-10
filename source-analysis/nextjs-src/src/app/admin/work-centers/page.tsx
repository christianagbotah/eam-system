'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';

interface WorkCenter {
  id: number;
  work_center_code: string;
  work_center_name: string;
  department: string;
  location: string;
  capacity_per_hour: number;
  efficiency_rate: number;
  shift_pattern: string;
  status: string;
}

import RBACGuard from '@/components/RBACGuard';

function WorkCentersContent() {
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(centers);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? centers.filter(c => selectedIds.includes(c.id)) : centers;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(c => Object.values(c).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-centers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    work_center_code: '',
    work_center_name: '',
    department: '',
    location: '',
    capacity_per_hour: '',
    efficiency_rate: 100,
    shift_pattern: '3-shift',
    status: 'active'
  });

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      const res = await api.get('/work-centers');
      if ((res.data as any)?.status === 'success') {
        setCenters((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving work center...');
    try {
      const res = await api.post('/work-centers', formData);
      if ((res.data as any)?.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Work center created successfully!');
        setShowModal(false);
        fetchCenters();
        setFormData({ work_center_code: '', work_center_name: '', department: '', location: '', capacity_per_hour: '', efficiency_rate: 100, shift_pattern: '3-shift', status: 'active' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create work center');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} work centers?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} centers...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/work-centers/${id}`);
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} centers deleted`);
      clearSelection();
      fetchCenters();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete centers');
    }
  };

  const activeCount = centers.filter(c => c.status === 'active').length;
  const avgEfficiency = centers.length > 0 ? centers.reduce((sum, c) => sum + c.efficiency_rate, 0) / centers.length : 0;
  const totalCapacity = centers.reduce((sum, c) => sum + c.capacity_per_hour, 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Work Centers</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage production work centers</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add Work Center
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-green-600">{activeCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">Active Centers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-blue-600">{avgEfficiency.toFixed(1)}%</div>
            <div className="text-xs text-gray-600 mt-0.5">Avg Efficiency</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-purple-600">{totalCapacity}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Capacity/hr</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-orange-600">{centers.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Centers</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BulkActions
            selectedIds={selectedIds}
            totalCount={centers.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleExport}
          />
          {loading ? (
            <CardSkeleton count={6} />
          ) : centers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No work centers found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {centers.map((center) => (
                <div key={center.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow relative">
                  <input type="checkbox" checked={isSelected(center.id)} onChange={() => toggleSelect(center.id)} className="absolute top-2 right-2" />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{center.work_center_name}</h3>
                      <p className="text-sm text-gray-600">{center.work_center_code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      center.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {center.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{center.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{center.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{center.capacity_per_hour}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-medium text-blue-600">{center.efficiency_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shift:</span>
                      <span className="font-medium">{center.shift_pattern}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Add Work Center</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Center Code</label>
                  <input type="text" required value={formData.work_center_code} onChange={(e) => setFormData({...formData, work_center_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Center Name</label>
                  <input type="text" required value={formData.work_center_name} onChange={(e) => setFormData({...formData, work_center_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Capacity per Hour</label>
                  <input type="number" required min="0" step="0.01" value={formData.capacity_per_hour} onChange={(e) => setFormData({...formData, capacity_per_hour: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Efficiency Rate (%)</label>
                  <input type="number" required min="0" max="100" value={formData.efficiency_rate} onChange={(e) => setFormData({...formData, efficiency_rate: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Shift Pattern</label>
                  <select required value={formData.shift_pattern} onChange={(e) => setFormData({...formData, shift_pattern: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="1-shift">1 Shift</option>
                    <option value="2-shift">2 Shifts</option>
                    <option value="3-shift">3 Shifts</option>
                    <option value="continuous">Continuous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
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

export default function WorkCentersPage() {
  return (
    <RBACGuard module="work_centers" action="view">
      <WorkCentersContent />
    </RBACGuard>
  );
}
