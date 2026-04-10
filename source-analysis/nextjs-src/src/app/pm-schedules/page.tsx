'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiCalendar, FiClock, FiSearch } from 'react-icons/fi';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface PMSchedule {
  id: number;
  schedule_name: string;
  asset_id: number;
  asset_name: string;
  frequency: string;
  frequency_value: number;
  last_performed: string;
  next_due: string;
  assigned_to: number;
  assigned_to_name: string;
  status: string;
  priority: string;
  estimated_duration: number;
}

export default function PMSchedulesPage() {
  const { hasPermission } = usePermissions();
  const [schedules, setSchedules] = useState<PMSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<PMSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PMSchedule | null>(null);
  const [filters, setFilters] = useState({ status: '', frequency: '', search: '' });
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const canCreate = hasPermission('pm_schedules.create');
  const canEdit = hasPermission('pm_schedules.edit');
  const canDelete = hasPermission('pm_schedules.delete');

  useEffect(() => {
    fetchSchedules();
    fetchAssets();
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = schedules;
    if (filters.search) {
      filtered = filtered.filter(s =>
        s.schedule_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.asset_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.frequency) {
      filtered = filtered.filter(s => s.frequency === filters.frequency);
    }
    setFilteredSchedules(filtered);
  }, [schedules, filters]);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/pm-schedules');
      if (response.data?.status === 'success') {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets-unified');
      if (response.data?.status === 'success') {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data?.status === 'success') {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete || !confirm('Delete this PM schedule?')) return;
    try {
      await api.delete(`/pm-schedules/${id}`);
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Schedule Name', 'Asset', 'Frequency', 'Last Performed', 'Next Due', 'Assigned To', 'Status', 'Priority'],
      ...filteredSchedules.map(s => [s.schedule_name, s.asset_name, `${s.frequency_value} ${s.frequency}`, s.last_performed, s.next_due, s.assigned_to_name, s.status, s.priority])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pm-schedules-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeSchedules = schedules.filter(s => s.status === 'Active').length;
  const overdueSchedules = schedules.filter(s => s.status === 'Overdue').length;
  const dueSoon = schedules.filter(s => {
    const dueDate = new Date(s.next_due);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }).length;

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const currentSchedules = filteredSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">PM Schedules</h1>
            <p className="text-purple-100">Preventive maintenance scheduling and tracking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 font-semibold border border-white/30">
              <FiDownload /> Export
            </button>
            {canCreate && (
              <button onClick={() => { setShowModal(true); setSelectedSchedule(null); }} className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2 font-semibold">
                <FiPlus /> Create Schedule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Schedules</div>
              <div className="text-2xl font-bold text-gray-800">{schedules.length}</div>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-green-600">{activeSchedules}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl font-bold text-red-600">{overdueSchedules}</div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Due This Week</div>
              <div className="text-2xl font-bold text-orange-600">{dueSoon}</div>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 px-3 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            value={filters.frequency}
            onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Frequencies</option>
            <option value="days">Daily</option>
            <option value="weeks">Weekly</option>
            <option value="months">Monthly</option>
            <option value="years">Yearly</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'calendar' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Schedules Table/Calendar */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Performed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{schedule.schedule_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{schedule.asset_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.frequency_value} {schedule.frequency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.last_performed || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.next_due}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{schedule.assigned_to_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(schedule.priority)}`}>
                        {schedule.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {canEdit && (
                          <button onClick={() => { setSelectedSchedule(schedule); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-900">
                            <FiEdit2 />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-900">
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSchedules.length)} of {filteredSchedules.length} schedules
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Calendar View</h3>
            <p className="text-gray-500">Calendar view coming soon</p>
          </div>
        </div>
      )}

      {filteredSchedules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No PM schedules found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <PMScheduleModal
          schedule={selectedSchedule}
          assets={assets}
          users={users}
          onClose={() => { setShowModal(false); setSelectedSchedule(null); }}
          onSuccess={() => { fetchSchedules(); setShowModal(false); setSelectedSchedule(null); }}
        />
      )}
    </div>
  );
}

function PMScheduleModal({ schedule, assets, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    schedule_name: schedule?.schedule_name || '',
    asset_id: schedule?.asset_id || '',
    frequency: schedule?.frequency || 'months',
    frequency_value: schedule?.frequency_value || 1,
    next_due: schedule?.next_due || '',
    assigned_to: schedule?.assigned_to || '',
    status: schedule?.status || 'Active',
    priority: schedule?.priority || 'Medium',
    estimated_duration: schedule?.estimated_duration || 60
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (schedule) {
        await api.put(`/pm-schedules/${schedule.id}`, formData);
      } else {
        await api.post('/pm-schedules', formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{schedule ? 'Edit' : 'Create'} PM Schedule</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
              <input
                type="text"
                value={formData.schedule_name}
                onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>{asset.asset_name || asset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select User</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency Value</label>
              <input
                type="number"
                value={formData.frequency_value}
                onChange={(e) => setFormData({ ...formData, frequency_value: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency Unit</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
              <input
                type="date"
                value={formData.next_due}
                onChange={(e) => setFormData({ ...formData, next_due: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (min)</label>
              <input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {schedule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
