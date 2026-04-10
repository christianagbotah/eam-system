'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  inspected: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-100 text-red-800'
};

const PRIORITY_COLORS = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200'
};

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [filter, setFilter] = useState({ status: '', priority: '', type: '' });

  const [formData, setFormData] = useState({
    request_id: '',
    title: '',
    description: '',
    priority: 'medium',
    type: 'corrective',
    asset_id: '',
    department_id: '',
    planned_start: '',
    planned_end: '',
    estimated_hours: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [woRes, reqRes, usersRes, machinesRes, deptsRes, statsRes] = await Promise.all([
        maintenanceService.getWorkOrders(),
        maintenanceService.getMaintenanceRequests(),
        fetch('/api/v1/eam/users').then(r => r.json()),
        fetch('/api/v1/eam/machines').then(r => r.json()),
        fetch('/api/v1/eam/departments').then(r => r.json()),
        maintenanceService.getDashboardStats()
      ]);

      setWorkOrders(woRes.data || []);
      setRequests(reqRes.data?.filter((r: any) => r.status === 'approved') || []);
      setUsers(usersRes.data || []);
      setMachines(machinesRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
      setStats(statsRes.data);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const toast = showToast.loading('Creating work order...');
    try {
      await maintenanceService.createWorkOrder(formData);
      showToast.dismiss(toast);
      showToast.success('Work order created successfully');
      setShowCreateModal(false);
      setFormData({ request_id: '', title: '', description: '', priority: 'medium', type: 'corrective', asset_id: '', department_id: '', planned_start: '', planned_end: '', estimated_hours: '' });
      loadData();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Failed to create work order');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const toast = showToast.loading('Assigning work order...');
    try {
      await maintenanceService.assignWorkOrder(selectedWO.id, { assigned_to: (e.target as any).assigned_to.value });
      showToast.dismiss(toast);
      showToast.success('Work order assigned successfully');
      setShowAssignModal(false);
      setSelectedWO(null);
      loadData();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Failed to assign');
    }
  };

  const filteredWOs = workOrders.filter(wo => 
    (!filter.status || wo.status === filter.status) &&
    (!filter.priority || wo.priority === filter.priority) &&
    (!filter.type || wo.type === filter.type)
  );

  const statusCounts = workOrders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedRoute allowedRoles={['admin', 'supervisor', 'planner']}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Work Orders Management</h1>
              <p className="text-blue-100">Enterprise-grade maintenance work order system</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1.5 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Work Order
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.total_work_orders}</p>
                  <p className="text-xs text-gray-500 mt-1">All work orders</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-lg font-semibold text-yellow-600">{statusCounts.in_progress || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Active work</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-lg font-semibold text-green-600">{statusCounts.completed || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Finished work</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Time</p>
                  <p className="text-lg font-semibold text-purple-600">{stats.avg_completion_time?.toFixed(1) || 0}h</p>
                  <p className="text-xs text-gray-500 mt-1">Completion time</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <select value={filter.priority} onChange={(e) => setFilter({...filter, priority: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <select value={filter.type} onChange={(e) => setFilter({...filter, type: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">All Types</option>
                <option value="breakdown">Breakdown</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilter({ status: '', priority: '', type: '' })} className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-2 py-1 text-xs.5 rounded-md font-semibold transition-all shadow-sm hover:shadow">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Work Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-semibold text-gray-900">Work Orders List</h3>
            <p className="text-sm text-xs text-gray-600 mt-0.5">{filteredWOs.length} work orders found</p>
          </div>
          {loading ? (
            <TableSkeleton rows={10} />
          ) : filteredWOs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Work Orders Found</h3>
              <p className="text-gray-600 mb-6">Create your first work order or adjust your filters</p>
              <button onClick={() => setShowCreateModal(true)} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Work Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">WO Number</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Planned Start</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredWOs.map((wo, idx) => (
                    <tr key={wo.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-bold text-blue-600">{wo.work_order_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{wo.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs mt-1">{wo.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 ${PRIORITY_COLORS[wo.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {wo.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700 capitalize bg-gray-100 px-3 py-1 rounded-full">{wo.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS]}`}>
                          {wo.status === 'in_progress' ? 'IN PROGRESS' : wo.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {wo.assigned_to_name ? wo.assigned_to_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{wo.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-gray-700">
                        {wo.planned_start ? formatDate(wo.planned_start) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {wo.status === 'draft' && (
                            <button onClick={() => { setSelectedWO(wo); setShowAssignModal(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow">
                              Assign
                            </button>
                          )}
                          <a href={`/admin/work-orders/${wo.id}`} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all">
                            View
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-semibold text-white">Create Work Order</h2>
                  <p className="text-blue-100 text-sm mt-1">Fill in the details to create a new work order</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-blue-900 mb-3">📋 From Existing Request (Optional)</label>
                  <select value={formData.request_id} onChange={(e) => setFormData({...formData, request_id: e.target.value})} className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                    <option value="">Create New Work Order</option>
                    {requests.map(r => <option key={r.id} value={r.id}>{r.request_number} - {r.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Work Order Title *</label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Enter work order title" className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                    <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} placeholder="Describe the work to be performed..." className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Priority *</label>
                    <select required value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Type *</label>
                    <select required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                      <option value="breakdown">⚠️ Breakdown</option>
                      <option value="preventive">🔧 Preventive</option>
                      <option value="corrective">🛠️ Corrective</option>
                      <option value="inspection">🔍 Inspection</option>
                      <option value="project">📋 Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asset</label>
                    <select value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                      <option value="">Select Asset</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.machine_name || m.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Department *</label>
                    <select required value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 Planned Start</label>
                    <input type="datetime-local" value={formData.planned_start} onChange={(e) => setFormData({...formData, planned_start: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 Planned End</label>
                    <input type="datetime-local" value={formData.planned_end} onChange={(e) => setFormData({...formData, planned_end: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">⏱️ Estimated Hours</label>
                    <input type="number" step="0.5" value={formData.estimated_hours} onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})} placeholder="e.g., 2.5" className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                    Create Work Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && selectedWO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl">
                <h2 className="text-xl font-bold text-white">Assign Work Order</h2>
                <p className="text-blue-100 text-sm mt-1">{selectedWO.work_order_number}</p>
              </div>
              <form onSubmit={handleAssign} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To Technician *</label>
                  <select name="assigned_to" required className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Technician</option>
                    {users.filter(u => u.role === 'technician').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowAssignModal(false); setSelectedWO(null); }} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                    Assign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
