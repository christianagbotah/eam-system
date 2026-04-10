'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface SyncSchedule {
  id: number;
  entity_type: 'assets' | 'work_orders' | 'inventory';
  sync_direction: 'push' | 'pull' | 'bidirectional';
  frequency: 'hourly' | 'daily' | 'weekly';
  time_of_day?: string;
  day_of_week?: number;
  is_active: boolean;
  last_run?: string;
  next_run?: string;
}

export default function ERPSchedulePage() {
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SyncSchedule | null>(null);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(schedules);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? schedules.filter(s => selectedIds.includes(s.id)) : schedules;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(s => Object.values(s).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-schedules-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Schedules exported');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} schedules?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} schedules...`);
    try {
      const token = localStorage.getItem('access_token');
      await Promise.all(selectedIds.map(id => api.delete(`/erp/schedules/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} schedules deleted`);
      clearSelection();
      fetchSchedules();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete schedules');
    }
  };

  useKeyboardShortcuts({
    onNew: () => openModal(),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  const [formData, setFormData] = useState({
    entity_type: 'assets' as const,
    sync_direction: 'bidirectional' as const,
    frequency: 'daily' as const,
    time_of_day: '02:00',
    day_of_week: 1,
    is_active: true
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/erp/schedules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setSchedules(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editingSchedule 
        ? `/api/v1/eam/erp/schedules/${editingSchedule.id}`
        : '/api/v1/eam/erp/schedules';
      
      const res = await fetch(url, {
        method: editingSchedule ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast.success(editingSchedule ? 'Schedule updated' : 'Schedule created');
        setShowModal(false);
        setEditingSchedule(null);
        fetchSchedules();
      }
    } catch (error) {
      showToast.error('Failed to save schedule');
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      await api.put(`/erp/schedules/${id}`, { is_active: !isActive });
      showToast.success(isActive ? 'Schedule disabled' : 'Schedule enabled');
      fetchSchedules();
    } catch (error) {
      showToast.error('Failed to update schedule');
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await api.delete(`/erp/schedules/${id}`);
      showToast.success('Schedule deleted');
      fetchSchedules();
    } catch (error) {
      showToast.error('Failed to delete schedule');
    }
  };

  const openModal = (schedule?: SyncSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        entity_type: schedule.entity_type,
        sync_direction: schedule.sync_direction,
        frequency: schedule.frequency,
        time_of_day: schedule.time_of_day || '02:00',
        day_of_week: schedule.day_of_week || 1,
        is_active: schedule.is_active
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        entity_type: 'assets',
        sync_direction: 'bidirectional',
        frequency: 'daily',
        time_of_day: '02:00',
        day_of_week: 1,
        is_active: true
      });
    }
    setShowModal(true);
  };

  if (loading) return <div className="p-6"><TableSkeleton rows={8} /></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold">ERP Sync Schedules</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + New Schedule
        </button>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={schedules.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input type="checkbox" checked={selectedIds.length === schedules.length && schedules.length > 0} onChange={selectAll} className="rounded" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedules.map(schedule => (
              <tr key={schedule.id}>
                <td className="px-6 py-4">
                  <input type="checkbox" checked={isSelected(schedule.id)} onChange={() => toggleSelect(schedule.id)} className="rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{schedule.entity_type.replace('_', ' ')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 capitalize">
                    {schedule.sync_direction}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{schedule.frequency}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                  {schedule.frequency === 'hourly' && 'Every hour'}
                  {schedule.frequency === 'daily' && `Daily at ${schedule.time_of_day}`}
                  {schedule.frequency === 'weekly' && `Weekly on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][schedule.day_of_week || 0]} at ${schedule.time_of_day}`}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {schedule.last_run ? formatDateTime(schedule.last_run) : 'Never'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {schedule.next_run ? formatDateTime(schedule.next_run) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(schedule.id, schedule.is_active)}
                    className={`px-2 py-1 text-xs rounded ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm space-x-2">
                  <button onClick={() => openModal(schedule)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => deleteSchedule(schedule.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingSchedule ? 'Edit' : 'New'} Sync Schedule</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Entity Type</label>
                <select value={formData.entity_type} onChange={e => setFormData({...formData, entity_type: e.target.value as any})} className="w-full border rounded px-3 py-2">
                  <option value="assets">Assets</option>
                  <option value="work_orders">Work Orders</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Sync Direction</label>
                <select value={formData.sync_direction} onChange={e => setFormData({...formData, sync_direction: e.target.value as any})} className="w-full border rounded px-3 py-2">
                  <option value="push">Push to ERP</option>
                  <option value="pull">Pull from ERP</option>
                  <option value="bidirectional">Bidirectional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Frequency</label>
                <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})} className="w-full border rounded px-3 py-2">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              {formData.frequency !== 'hourly' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Time of Day</label>
                  <input type="time" value={formData.time_of_day} onChange={e => setFormData({...formData, time_of_day: e.target.value})} className="w-full border rounded px-3 py-2" />
                </div>
              )}
              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Day of Week</label>
                  <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2">
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}
              <div className="flex items-center">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
