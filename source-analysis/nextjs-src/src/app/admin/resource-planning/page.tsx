'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Resource {
  id: number;
  resource_type: string;
  resource_id: number;
  resource_name: string;
  work_center_id?: number;
  available_from: string;
  available_to: string;
  capacity: number;
  allocated: number;
  status: string;
}

import RBACGuard from '@/components/RBACGuard';

function ResourcePlanningContent() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(resources);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? resources.filter(r => selectedIds.includes(r.id)) : resources;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-planning-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    resource_type: 'technician',
    resource_id: '',
    resource_name: '',
    work_center_id: '',
    available_from: '',
    available_to: '',
    capacity: 100,
    allocated: 0
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await api.get('/resource-availability');
      const data = res.data;
      if (data.status === 'success') {
        setResources(data.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving resource...');
    try {
      const res = await api.post('/resource-availability'),
        body: JSON.stringify({...formData, status: 'available'})
      });
      const data = res.data;
      if (data.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Resource created successfully!');
        setShowModal(false);
        fetchResources();
        setFormData({ resource_type: 'technician', resource_id: '', resource_name: '', work_center_id: '', available_from: '', available_to: '', capacity: 100, allocated: 0 });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create resource');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} resources?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} resources...`);
    try {
      await Promise.all(selectedIds.map(id => 
        api.delete(`/resource-availability/${id}`)
      ));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} resources deleted`);
      clearSelection();
      fetchResources();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete resources');
    }
  };

  const getUtilization = (resource: Resource) => {
    return ((resource.allocated / resource.capacity) * 100).toFixed(1);
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 90) return 'text-red-600';
    if (util >= 70) return 'text-orange-600';
    if (util >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const availableCount = resources.filter(r => r.status === 'available').length;
  const allocatedCount = resources.filter(r => r.status === 'allocated').length;
  const avgUtilization = resources.length > 0 ? resources.reduce((sum, r) => sum + (r.allocated / r.capacity * 100), 0) / resources.length : 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Resource Planning</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage resource availability and allocation</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add Resource
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-green-600">{availableCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">Available</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-orange-600">{allocatedCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">Allocated</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-blue-600">{avgUtilization.toFixed(1)}%</div>
            <div className="text-xs text-gray-600 mt-0.5">Avg Utilization</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-purple-600">{resources.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Resources</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Resource Utilization</h2>
          <BulkActions
            selectedIds={selectedIds}
            totalCount={resources.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleExport}
          />
          {loading ? (
            <TableSkeleton rows={8} />
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No resources found</div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => {
                const util = parseFloat(getUtilization(resource));
                return (
                  <div key={resource.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {resource.resource_type === 'technician' ? '👷' : 
                           resource.resource_type === 'equipment' ? '🔧' :
                           resource.resource_type === 'tool' ? '🛠️' : '📦'}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{resource.resource_name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{resource.resource_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getUtilizationColor(util)}`}>{util}%</div>
                        <div className="text-sm text-gray-600">{resource.allocated}/{resource.capacity}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          util >= 90 ? 'bg-red-500' : 
                          util >= 70 ? 'bg-orange-500' : 
                          util >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${util}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                      <span>From: {formatDateTime(resource.available_from)}</span>
                      <span>To: {formatDateTime(resource.available_to)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Add Resource</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Resource Type</label>
                  <select required value={formData.resource_type} onChange={(e) => setFormData({...formData, resource_type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="technician">Technician</option>
                    <option value="equipment">Equipment</option>
                    <option value="tool">Tool</option>
                    <option value="material">Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Resource ID</label>
                  <input type="number" required value={formData.resource_id} onChange={(e) => setFormData({...formData, resource_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Resource Name</label>
                <input type="text" required value={formData.resource_name} onChange={(e) => setFormData({...formData, resource_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Work Center ID (Optional)</label>
                <input type="number" value={formData.work_center_id} onChange={(e) => setFormData({...formData, work_center_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Available From</label>
                  <input type="datetime-local" required value={formData.available_from} onChange={(e) => setFormData({...formData, available_from: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Available To</label>
                  <input type="datetime-local" required value={formData.available_to} onChange={(e) => setFormData({...formData, available_to: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                  <input type="number" required min="0" step="0.01" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Allocated</label>
                  <input type="number" required min="0" step="0.01" value={formData.allocated} onChange={(e) => setFormData({...formData, allocated: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
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

export default function ResourcePlanningPage() {
  return (
    <RBACGuard module="resource_planning" action="view">
      <ResourcePlanningContent />
    </RBACGuard>
  );
}
